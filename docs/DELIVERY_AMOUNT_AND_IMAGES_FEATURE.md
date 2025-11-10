# Delivery Details Enhancement - Amount Collected & Item Images

## Changes Made

### 1. Amount Collected Field
**Location:** Delivery Details Page (Driver Dashboard)

**Changes:**
- Added `amount_collected` input field (defaults to 0)
- No prefill - driver enters amount only if cash was collected
- Saves to deliveries table via PATCH API

**UI:**
```
┌─────────────────────────────────────┐
│ Cash on Delivery                    │
├─────────────────────────────────────┤
│ Amount Collected (₹)                │
│ [  0  ] [Save Amount]               │
│ Leave as 0 if payment not collected │
└─────────────────────────────────────┘
```

---

### 2. Delivered Items Photos
**New Feature:** Upload photos of items after delivery

**How it works:**
1. Driver clicks "Add Photo" button
2. Selects one or multiple images
3. Images upload to S3 (using existing presign method)
4. Saved as `delivery_proofs` with type `delivered_item`
5. Displayed in grid with remove option

**UI:**
```
┌─────────────────────────────────────┐
│ Delivered Items Photos [Add Photo]  │
├─────────────────────────────────────┤
│ [Image 1] [Image 2] [Image 3]       │
│                                     │
│ No photos yet? Click Add Photo      │
└─────────────────────────────────────┘
```

---

### 3. Database Changes

**Migration File:** `database/migrations/add_delivery_amount_and_item_images.sql`

**Changes:**
```sql
-- Add amount_collected column
ALTER TABLE deliveries 
ADD COLUMN amount_collected NUMERIC DEFAULT 0;

-- Update delivery_proofs to support 'delivered_item' type
ALTER TABLE delivery_proofs 
ADD CONSTRAINT delivery_proofs_type_check 
CHECK (type IN ('photo', 'signature', 'delivered_item'));
```

**Run Migration:**
```bash
psql -h your-db-host -U your-user -d your-database -f database/migrations/add_delivery_amount_and_item_images.sql
```

---

### 4. Type Updates

**File:** `src/types/index.ts`

```typescript
export interface DeliveryProof {
  id: string;
  delivery_id: string;
  type: 'photo' | 'signature' | 'delivered_item'; // Added 'delivered_item'
  url: string;
  timestamp: string;
}
```

---

### 5. Component Updates

**File:** `src/components/logistics/DeliveryDetails.tsx`

**New Features:**
- ✅ Amount collected input (default 0)
- ✅ Multi-image upload for delivered items
- ✅ Image preview with remove option
- ✅ Separate sections for:
  - Cash on Delivery
  - Delivered Items Photos
  - Proof of Delivery (signature/general)
- ✅ Toast notifications for success/error
- ✅ Loading states during upload

**Image Upload Flow:**
```
1. Select image(s)
   ↓
2. Call /api/s3/presign (existing method)
   ↓
3. Upload to S3
   ↓
4. Save to delivery_proofs table
   ↓
5. Display in UI
```

---

## Usage Instructions

### For Drivers:

1. **Open Delivery Details** for a delivery

2. **Enter Amount Collected:**
   - If customer paid cash: Enter amount (e.g., 5000)
   - If no cash collected: Leave as 0
   - Click "Save Amount"

3. **Upload Item Photos:**
   - Click "Add Photo" under "Delivered Items Photos"
   - Select one or multiple images
   - Images upload automatically
   - Can remove images by hovering and clicking X

4. **Upload Proof of Delivery:**
   - Click camera icon under "Proof of Delivery"
   - Upload customer signature or general photo

5. **Update Status:**
   - Click PENDING → IN_TRANSIT → DELIVERED

---

## API Endpoints Used

### Existing (No changes needed):
- `GET /api/logistics/proofs?delivery_id={id}` - Fetch proofs
- `POST /api/logistics/proofs` - Save new proof
- `POST /api/s3/presign` - Get S3 upload URL

### New (Need to create):
- `PATCH /api/logistics/deliveries/[id]` - Update amount_collected

---

## Benefits

✅ **Track cash collection** - Know how much COD was collected
✅ **Visual proof** - Photos of delivered items for quality assurance
✅ **Default to 0** - No confusion about prefilled values
✅ **Multi-upload** - Upload multiple item photos at once
✅ **Organized** - Separate sections for different proof types
✅ **Easy removal** - Remove incorrect photos before finalizing

---

## Example Flow

**Scenario:** Driver delivers furniture worth ₹50,000 (COD)

1. Driver marks status as "In Transit"
2. Arrives at customer location
3. Unloads items
4. Takes photos of:
   - Sofa in customer's living room
   - Dining table setup
   - Wardrobe installation
5. Customer pays ₹50,000 cash
6. Driver enters: Amount Collected = 50000
7. Customer signs on paper
8. Driver uploads signature photo
9. Marks status as "Delivered"

**Result:**
- Amount tracked: ₹50,000
- 3 item photos saved
- 1 signature proof saved
- Complete delivery record

---

## Migration Instructions

1. **Run the SQL migration:**
   ```bash
   # Via Supabase dashboard
   Go to SQL Editor → Run the migration script
   
   # Or via CLI
   psql -f database/migrations/add_delivery_amount_and_item_images.sql
   ```

2. **Verify changes:**
   ```sql
   -- Check if column added
   SELECT column_name, data_type, column_default 
   FROM information_schema.columns 
   WHERE table_name = 'deliveries' AND column_name = 'amount_collected';
   
   -- Check constraint updated
   SELECT constraint_name, check_clause 
   FROM information_schema.check_constraints 
   WHERE constraint_name = 'delivery_proofs_type_check';
   ```

3. **Test the feature:**
   - Go to Logistics page
   - Open any delivery
   - Test amount input
   - Test image upload

---

## Future Enhancements

Possible improvements:

1. **Auto-calculate expected COD** from sales order
2. **Mismatch alert** if collected amount differs from order total
3. **Image compression** before upload
4. **GPS location** stamp on photos
5. **Timestamp** on each uploaded image
6. **Bulk download** all delivery photos
7. **Image gallery** view with zoom

---

Your delivery tracking now has cash collection and item photo upload! 🚚📸💰
