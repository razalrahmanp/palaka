# Customer Revisit Tracking & Sales Rep Assignment Implementation

## Current Schema Analysis

### 1. **Customers Table** (Current Structure)
```sql
CREATE TABLE public.customers (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  email text UNIQUE,
  phone text,
  status text DEFAULT 'Lead',
  source text DEFAULT 'Website',
  
  -- Sales Rep Assignment (Already exists!)
  assigned_sales_rep_id uuid REFERENCES users(id),
  
  -- Visit Tracking (Already exists!)
  customer_visit_date date,
  
  -- Audit Fields
  created_by uuid REFERENCES users(id),
  created_at timestamp DEFAULT now(),
  updated_by uuid,
  updated_at timestamp DEFAULT now(),
  
  -- Location Data
  address text,
  city varchar,
  state varchar,
  pincode varchar,
  floor text,
  latitude numeric,
  longitude numeric,
  formatted_address text,
  geocoded_at timestamp with time zone,
  
  -- Other
  tags text[] DEFAULT '{}',
  notes text,
  is_deleted boolean DEFAULT false
);
```

### 2. **Customer Interactions Table** (Already exists!)
```sql
CREATE TABLE public.customer_interactions (
  id uuid PRIMARY KEY,
  customer_id uuid REFERENCES customers(id),
  type text, -- 'visit', 'call', 'email', 'meeting', etc.
  notes text,
  interaction_date timestamp,
  created_by uuid REFERENCES users(id),
  created_at timestamp DEFAULT now(),
  
  -- Review System
  review_requested boolean DEFAULT false,
  review_given boolean DEFAULT false,
  review_rating integer CHECK (review_rating >= 1 AND review_rating <= 5),
  review_text text,
  review_requested_by uuid REFERENCES users(id),
  review_requested_at timestamp with time zone,
  review_given_at timestamp with time zone
);
```

### 3. **Sales Orders Table** (Linked to Sales Reps)
```sql
CREATE TABLE public.sales_orders (
  id uuid PRIMARY KEY,
  customer_id uuid REFERENCES customers(id),
  sales_representative_id uuid REFERENCES users(id), -- Already exists!
  created_by uuid REFERENCES users(id),
  created_at timestamp DEFAULT now(),
  status sales_order_status DEFAULT 'draft',
  grand_total numeric DEFAULT 0,
  -- ... other fields
);
```

---

## Implementation Plan

### **Option 1: Use Existing Schema** ✅ (RECOMMENDED - No schema changes needed!)

**Your schema ALREADY supports:**
1. ✅ **Sales Rep Assignment**: `customers.assigned_sales_rep_id`
2. ✅ **Visit Tracking**: `customers.customer_visit_date` (single latest visit)
3. ✅ **Interaction History**: `customer_interactions` table (all visits with timestamps)

**What you need to implement:**

#### A. **Track Customer Revisits** (Using existing customer_interactions table)

```sql
-- When customer visits (first time or revisit)
INSERT INTO customer_interactions (
  customer_id,
  type,
  notes,
  interaction_date,
  created_by
) VALUES (
  'customer-uuid',
  'visit', -- Use 'visit' as type
  'Customer visited showroom - interested in sofas',
  NOW(),
  'sales-rep-uuid'
);

-- Also update the customer's latest visit date
UPDATE customers 
SET 
  customer_visit_date = CURRENT_DATE,
  updated_at = NOW(),
  updated_by = 'sales-rep-uuid'
WHERE id = 'customer-uuid';
```

#### B. **Assign Sales Rep to Customer**

```sql
-- When assigning a sales rep to a customer
UPDATE customers 
SET 
  assigned_sales_rep_id = 'sales-rep-uuid',
  updated_at = NOW(),
  updated_by = 'admin-uuid'
WHERE id = 'customer-uuid';
```

#### C. **Query Customer Visit History**

```sql
-- Get all visits for a customer
SELECT 
  ci.id,
  ci.interaction_date,
  ci.type,
  ci.notes,
  u.name as handled_by
FROM customer_interactions ci
LEFT JOIN users u ON ci.created_by = u.id
WHERE ci.customer_id = 'customer-uuid'
  AND ci.type = 'visit'
ORDER BY ci.interaction_date DESC;

-- Count customer visits
SELECT 
  c.id,
  c.name,
  c.customer_visit_date as last_visit,
  COUNT(ci.id) FILTER (WHERE ci.type = 'visit') as total_visits,
  u.name as assigned_sales_rep
FROM customers c
LEFT JOIN customer_interactions ci ON c.id = ci.customer_id
LEFT JOIN users u ON c.assigned_sales_rep_id = u.id
WHERE c.id = 'customer-uuid'
GROUP BY c.id, c.name, c.customer_visit_date, u.name;
```

---

### **Option 2: Enhanced Schema** (If you need more advanced tracking)

If you want more sophisticated visit tracking, create a dedicated table:

```sql
-- NEW TABLE: customer_visits (More structured than interactions)
CREATE TABLE public.customer_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  visit_time time DEFAULT CURRENT_TIME,
  
  -- Sales Rep who handled the visit
  handled_by uuid REFERENCES users(id),
  
  -- Visit Details
  visit_type text DEFAULT 'walk-in' CHECK (
    visit_type IN ('walk-in', 'scheduled', 'follow-up', 'delivery')
  ),
  visit_purpose text, -- 'browsing', 'purchase_intent', 'complaint', 'service'
  interest_level text CHECK (
    interest_level IN ('high', 'medium', 'low', 'not_interested')
  ),
  
  -- Products shown/discussed
  products_discussed text[],
  categories_interested text[],
  
  -- Follow-up
  follow_up_required boolean DEFAULT false,
  follow_up_date date,
  follow_up_notes text,
  
  -- Outcome
  outcome text, -- 'purchase', 'quote_given', 'no_purchase', 'future_interest'
  estimated_deal_value numeric,
  
  -- Notes
  notes text,
  
  -- Tracking
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  
  -- Prevent duplicate same-day visits
  UNIQUE(customer_id, visit_date)
);

CREATE INDEX idx_customer_visits_customer_date ON customer_visits(customer_id, visit_date DESC);
CREATE INDEX idx_customer_visits_handled_by ON customer_visits(handled_by);
CREATE INDEX idx_customer_visits_follow_up ON customer_visits(follow_up_required, follow_up_date) 
  WHERE follow_up_required = true;
```

---

## UI Implementation

### 1. **Customer Form - Add Sales Rep Assignment**

Add to `components/crm/CustomerForm.tsx`:

```typescript
// Fetch sales reps
const { data: salesReps = [] } = useQuery({
  queryKey: ['sales-reps'],
  queryFn: async () => {
    const res = await fetch('/api/users?role=sales');
    return res.json();
  }
});

// In form
<div>
  <Label>Assigned Sales Rep</Label>
  <Select 
    value={formData.assigned_sales_rep_id} 
    onValueChange={(value) => setFormData({...formData, assigned_sales_rep_id: value})}
  >
    <SelectTrigger>
      <SelectValue placeholder="Select sales rep" />
    </SelectTrigger>
    <SelectContent>
      {salesReps.map(rep => (
        <SelectItem key={rep.id} value={rep.id}>
          {rep.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

### 2. **Record Customer Visit - New Dialog**

Create `components/crm/CustomerVisitDialog.tsx`:

```typescript
interface VisitFormData {
  customer_id: string;
  visit_type: 'walk-in' | 'scheduled' | 'follow-up';
  interest_level: 'high' | 'medium' | 'low';
  notes: string;
  follow_up_required: boolean;
  follow_up_date?: string;
}

export function CustomerVisitDialog({ customer, onSubmit }) {
  const [formData, setFormData] = useState<VisitFormData>({
    customer_id: customer.id,
    visit_type: 'walk-in',
    interest_level: 'medium',
    notes: '',
    follow_up_required: false
  });

  const handleSubmit = async () => {
    // Record in customer_interactions
    await fetch('/api/crm/interactions', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: formData.customer_id,
        type: 'visit',
        notes: formData.notes,
        interaction_date: new Date().toISOString()
      })
    });

    // Update customer's last visit date
    await fetch(`/api/crm/customers/${formData.customer_id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        customer_visit_date: new Date().toISOString().split('T')[0]
      })
    });

    onSubmit();
  };

  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Customer Visit - {customer.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Visit Type</Label>
            <Select value={formData.visit_type} onValueChange={(v) => setFormData({...formData, visit_type: v})}>
              <SelectItem value="walk-in">Walk-in</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="follow-up">Follow-up</SelectItem>
            </Select>
          </div>

          <div>
            <Label>Interest Level</Label>
            <Select value={formData.interest_level} onValueChange={(v) => setFormData({...formData, interest_level: v})}>
              <SelectItem value="high">High - Ready to buy</SelectItem>
              <SelectItem value="medium">Medium - Exploring options</SelectItem>
              <SelectItem value="low">Low - Just browsing</SelectItem>
            </Select>
          </div>

          <div>
            <Label>Visit Notes</Label>
            <Textarea 
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="What did you discuss? Products shown? Customer concerns?"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox 
              checked={formData.follow_up_required}
              onCheckedChange={(checked) => setFormData({...formData, follow_up_required: !!checked})}
            />
            <Label>Follow-up Required</Label>
          </div>

          {formData.follow_up_required && (
            <div>
              <Label>Follow-up Date</Label>
              <Input 
                type="date"
                value={formData.follow_up_date}
                onChange={(e) => setFormData({...formData, follow_up_date: e.target.value})}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Record Visit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 3. **Customer Card - Show Visit History**

```typescript
// In customer detail view
const { data: visitHistory } = useQuery({
  queryKey: ['customer-visits', customerId],
  queryFn: async () => {
    const res = await fetch(`/api/crm/customers/${customerId}/visits`);
    return res.json();
  }
});

return (
  <Card>
    <CardHeader>
      <CardTitle>Visit History</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        {visitHistory?.map(visit => (
          <div key={visit.id} className="flex items-center justify-between p-3 border rounded">
            <div>
              <div className="font-semibold">
                {format(new Date(visit.interaction_date), 'MMM dd, yyyy')}
              </div>
              <div className="text-sm text-gray-600">{visit.notes}</div>
              <div className="text-xs text-gray-500">
                Handled by: {visit.handled_by_name}
              </div>
            </div>
            <Badge>{visit.type}</Badge>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);
```

---

## API Endpoints to Create

### 1. **GET /api/crm/customers/[id]/visits** - Get visit history
```typescript
// src/app/api/crm/customers/[id]/visits/route.ts
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { data, error } = await supabase
    .from('customer_interactions')
    .select(`
      *,
      created_by_user:users!customer_interactions_created_by_fkey(name)
    `)
    .eq('customer_id', params.id)
    .eq('type', 'visit')
    .order('interaction_date', { ascending: false });

  if (error) return NextResponse.json({ error }, { status: 500 });
  
  return NextResponse.json(data.map(visit => ({
    ...visit,
    handled_by_name: visit.created_by_user?.name
  })));
}
```

### 2. **POST /api/crm/customers/[id]/visit** - Record new visit
```typescript
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { notes, visit_type, interest_level } = await req.json();
  const user = await getCurrentUser(); // Your auth method

  // Insert interaction
  const { data: interaction, error: interactionError } = await supabase
    .from('customer_interactions')
    .insert({
      customer_id: params.id,
      type: 'visit',
      notes,
      interaction_date: new Date().toISOString(),
      created_by: user.id
    })
    .select()
    .single();

  if (interactionError) return NextResponse.json({ error: interactionError }, { status: 500 });

  // Update customer's last visit date
  const { error: updateError } = await supabase
    .from('customers')
    .update({
      customer_visit_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
      updated_by: user.id
    })
    .eq('id', params.id);

  if (updateError) return NextResponse.json({ error: updateError }, { status: 500 });

  return NextResponse.json(interaction);
}
```

### 3. **PATCH /api/crm/customers/[id]** - Update sales rep assignment
```typescript
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { assigned_sales_rep_id } = await req.json();
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from('customers')
    .update({
      assigned_sales_rep_id,
      updated_at: new Date().toISOString(),
      updated_by: user.id
    })
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json(data);
}
```

---

## Dashboard Metrics to Add

```typescript
// Visit metrics
const visitMetrics = {
  todayVisits: 'SELECT COUNT(*) FROM customer_interactions WHERE type = \'visit\' AND DATE(interaction_date) = CURRENT_DATE',
  
  weeklyVisits: 'SELECT COUNT(*) FROM customer_interactions WHERE type = \'visit\' AND interaction_date >= CURRENT_DATE - INTERVAL \'7 days\'',
  
  revisitRate: `
    SELECT 
      COUNT(DISTINCT customer_id) FILTER (WHERE visit_count > 1)::float / 
      NULLIF(COUNT(DISTINCT customer_id), 0) * 100 as revisit_rate
    FROM (
      SELECT customer_id, COUNT(*) as visit_count
      FROM customer_interactions
      WHERE type = 'visit'
      GROUP BY customer_id
    ) subquery
  `,
  
  topSalesReps: `
    SELECT 
      u.name,
      COUNT(DISTINCT ci.customer_id) as customers_handled,
      COUNT(ci.id) as total_visits,
      COUNT(DISTINCT so.id) as orders_closed
    FROM users u
    LEFT JOIN customer_interactions ci ON u.id = ci.created_by AND ci.type = 'visit'
    LEFT JOIN sales_orders so ON u.id = so.sales_representative_id
    WHERE u.role = 'sales'
    GROUP BY u.id, u.name
    ORDER BY orders_closed DESC
    LIMIT 10
  `
};
```

---

## Key Features Summary

### ✅ **What You Can Do NOW (with existing schema):**
1. **Assign sales reps** to customers via `assigned_sales_rep_id`
2. **Track latest visit** via `customer_visit_date`
3. **Record all visit interactions** via `customer_interactions` table
4. **Count total visits** per customer by querying interactions
5. **See visit history** with timestamps and notes
6. **Track who handled each visit** via `created_by` field

### 🎯 **Recommended Immediate Actions:**
1. Update Customer Form to include sales rep dropdown
2. Add "Record Visit" button in customer table actions
3. Create visit history panel in customer detail view
4. Add visit metrics to dashboard (today's visits, revisit rate)
5. Create follow-up reminder system based on visit notes

### 🚀 **Advanced Features (Optional):**
1. Create dedicated `customer_visits` table for structured data
2. Add visit type, interest level, products discussed
3. Build follow-up reminder system with notifications
4. Create sales funnel by visit stage
5. Generate visit reports per sales rep
6. Track conversion rate from visit to purchase

---

## Example Workflow

**Scenario: Customer visits showroom**

1. Sales rep opens customer profile or creates new customer
2. Clicks "Record Visit" button
3. Fills form:
   - Visit type: Walk-in
   - Interest: High - interested in sofas
   - Products discussed: Select from catalog
   - Follow-up needed: Yes, call in 2 days
4. System automatically:
   - Creates interaction record with type='visit'
   - Updates customer_visit_date to today
   - Assigns sales rep if not already assigned
   - Creates follow-up task for 2 days later
5. Dashboard updates:
   - Today's visits count increases
   - Sales rep's visit count increases
   - Customer moves to "Active" status if was "Lead"

**Next visit by same customer (Revisit):**
- Same process, but system shows previous visit history
- Sales rep can see what was discussed before
- Revisit counter increments
- Follow-up status can be marked as completed

---

## Migration (if needed)

If you want to populate existing data:

```sql
-- Count existing visits per customer from sales orders
UPDATE customers c
SET customer_visit_date = (
  SELECT MAX(so.created_at::date)
  FROM sales_orders so
  WHERE so.customer_id = c.id
)
WHERE EXISTS (
  SELECT 1 FROM sales_orders so WHERE so.customer_id = c.id
);

-- Assign sales reps based on most recent order
UPDATE customers c
SET assigned_sales_rep_id = (
  SELECT so.sales_representative_id
  FROM sales_orders so
  WHERE so.customer_id = c.id
    AND so.sales_representative_id IS NOT NULL
  ORDER BY so.created_at DESC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 
  FROM sales_orders so 
  WHERE so.customer_id = c.id 
    AND so.sales_representative_id IS NOT NULL
);
```

---

## Conclusion

**Your current schema is already well-designed for tracking customer revisits and sales rep assignments!** You just need to:

1. Build the UI components to leverage existing fields
2. Create API endpoints for visit recording
3. Add metrics to dashboard
4. Train staff on the workflow

No schema changes required unless you want the advanced `customer_visits` table for more structured tracking.
