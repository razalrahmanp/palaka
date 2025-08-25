# Al Rams ERP - Complete Cart to Sales Order Workflow Documentation

## 📋 Table of Contents
1. [Overview](#overview)
2. [Cart Management System](#cart-management-system)
3. [Product Types & Classification](#product-types--classification)
4. [Quote Creation Process](#quote-creation-process)
5. [Quote to Sales Order Conversion](#quote-to-sales-order-conversion)
6. [Database Schema Implementation](#database-schema-implementation)
7. [Screen Flow & Navigation](#screen-flow--navigation)
8. [Pricing & Discount System](#pricing--discount-system)
9. [Implementation Code Reference](#implementation-code-reference)
10. [Business Rules & Validations](#business-rules--validations)

---

## 1. Overview

### Business Process Flow
The Al Rams ERP system implements a sophisticated cart-to-sales workflow:

```
🛒 Product Selection → 🛍️ Cart Management → 📋 Quote Creation → 💼 Sales Order → 🚚 Delivery
    (SalesCatalogScreen)   (Redux Store)      (Database)      (Enhanced Conversion)   (Logistics)
```

### Key Stakeholders & Screens
- **Sales Representatives**: Use `SalesCatalogScreen.tsx` for product selection and cart management
- **Sales Managers**: Use `QuoteDetailsScreen.tsx` and `SalesListScreen.tsx` for approvals
- **Customers**: Receive quotes and provide approvals
- **Warehouse Team**: Handle inventory allocation and order fulfillment

---

## 2. Cart Management System

### 2.1 Redux Store Implementation

#### Cart State Structure
```typescript
// filepath: src/store/cartSlice.ts
interface CartState {
  items: CartItem[];
  draftTimestamp: number | null;  // For tracking cart session
}

interface CartItem {
  // Core identification
  id: string;                     // Unique cart item ID
  productId: string;              // Reference to original product
  name: string;                   // Product name
  
  // Pricing structure with advanced discount support
  price: number;                  // Current effective price (post individual discount)
  mrp_price: number;             // Original MRP price
  discount_percentage: number;    // Individual product discount (0-8% max)
  discounted_price: number;      // Final calculated discounted price
  quantity: number;              // Quantity in cart
  unitPrice: number;             // Unit price for calculations
  
  // Product details
  sku: string;
  image_url?: string;
  supplier_name?: string;
  supplier_id?: string;
  product_name: string;
  cost?: number;                 // Cost price for margin calculations
  location?: string;             // Warehouse location
  category?: string;
  
  // Product type classification
  type: 'store' | 'new' | 'custom';
  isNewProduct?: boolean;        // Entirely new products created during sales
  isCustomized?: boolean;        // Customized existing products
  
  // Customization data for new/custom products
  customization?: {
    description?: string;
    cost?: number;
    profitMargin?: number;
    supplier_id?: string;
    dimensions?: string;          // L×W×H format
    finish?: string;              // Matte, Glossy, Textured, etc.
    color?: string;
    materials?: string[];         // Array of materials
    instructions?: string;        // Custom instructions
    estimatedDelivery?: number;   // Days
    complexity?: 'low' | 'medium' | 'high';
  };
  
  // Enhanced product data for new products
  productData?: {
    cost: number;
    supplier_name?: string;
    category?: string;
    sku?: string;
    profitMargin?: string;
  };
  
  // Original product reference (for customizations)
  originalProduct?: Product;
}
```

#### Redux Actions Available
```typescript
// Cart management actions from cartSlice.ts
interface CartActions {
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateCartQuantity: (id: string, quantity: number) => void;
  setCartItems: (items: CartItem[]) => void;
  clearCart: () => void;
  
  // AsyncStorage persistence
  saveCartToStorage: () => Promise<void>;
  loadCartFromStorageAsync: () => Promise<void>;
  clearCartFromStorage: () => Promise<void>;
}
```

### 2.2 Cart Operations Implementation

#### Adding Products to Cart (SalesCatalogScreen.tsx)
```typescript
// Standard product addition
const addToCart = (product: Product) => {
  const existingItem = cart.find(item => item.id === product.id);
  
  if (existingItem) {
    // Check stock limits
    if (existingItem.quantity >= product.quantity) {
      Alert.alert('Stock Limit', `Only ${product.quantity} items available in stock`);
      return;
    }
    dispatch(updateCartQuantity({ id: product.id, quantity: existingItem.quantity + 1 }));
  } else {
    // Create new cart item with discount support
    const individualDiscount = productDiscounts[product.id];
    const mrpPrice = product.price || 0;
    const discountPercentage = individualDiscount?.percentage || 0;
    const discountedPrice = individualDiscount?.discountedPrice || mrpPrice;

    const cartItem: CartItem = {
      id: product.id,
      productId: product.id,
      name: product.name,
      price: discountedPrice,
      mrp_price: mrpPrice,
      discount_percentage: discountPercentage,
      discounted_price: discountedPrice,
      quantity: 1,
      sku: product.sku || '',
      unitPrice: discountedPrice,
      type: 'store',
      originalProduct: product,
      // ... other product details
    };
    
    dispatch(addToCartAction(cartItem));
  }
  
  dispatch(saveCartToStorage());
};
```

#### New Product Addition
```typescript
// Adding completely new products
const addNewProductToCart = (newProductData: any) => {
  const selectedSupplier = suppliers.find(s => s.id === newProductData.supplier_id);
  
  const cartItem: CartItem = {
    id: `new-${Date.now()}`,
    productId: `new-${Date.now()}`,
    name: newProductData.name,
    price: parseFloat(newProductData.price),
    mrp_price: parseFloat(newProductData.price),
    quantity: 1,
    type: 'new',
    isNewProduct: true,
    productData: {
      ...newProductData,
      supplier_name: selectedSupplier?.name,
    }
  };
  
  dispatch(addToCartAction(cartItem));
  dispatch(saveCartToStorage());
};
```

#### Customized Product Addition
```typescript
// Adding customized existing products via UnifiedProductModal
const handleUnifiedProductAddToCart = (productData: any) => {
  if (productData.mode === 'customize_existing' && productData.baseProduct) {
    const finalPrice = productData.customPrice 
      ? parseFloat(productData.customPrice)
      : productData.baseProduct.price * 1.25; // 25% markup

    const cartItem: CartItem = {
      id: `custom-${productData.baseProduct.id}-${Date.now()}`,
      name: productData.name,
      price: finalPrice,
      mrp_price: finalPrice,
      quantity: 1,
      type: 'custom',
      isCustomized: true,
      customization: {
        materials: productData.materials,
        color: productData.color,
        dimensions: productData.dimensions,
        finish: productData.finish,
        specifications: productData.specifications,
        customInstructions: productData.customInstructions,
      },
      originalProduct: productData.baseProduct,
    };
    
    dispatch(addToCartAction(cartItem));
  }
};
```

---

## 3. Product Types & Classification

### 3.1 Store Products (Existing Inventory)
**Source**: Inventory management system
**Screen**: SalesCatalogScreen.tsx
**Database Query**: 
```sql
SELECT products.*, inventory_items.quantity, suppliers.name as supplier_name
FROM inventory_items 
JOIN products ON inventory_items.product_id = products.id 
JOIN suppliers ON products.supplier_id = suppliers.id 
WHERE inventory_items.quantity > 0 AND products.is_deleted = false
```

**Features**:
- Real-time stock checking
- Individual product discounts (up to 8%)
- Automatic supplier information
- Image support with full-screen viewing

### 3.2 New Products (Created During Sales)
**Source**: UnifiedProductModal component
**Purpose**: Entirely new products not in inventory
**Data Structure**:
```typescript
interface NewProductData {
  name: string;
  description: string;
  price: string;
  cost: string;
  profitMargin: string;
  supplier_id: string;
  category: string;
  sku: string;
  specifications?: string;
  materials?: string[];
  dimensions?: string;
  finish?: string;
  color?: string;
}
```

### 3.3 Customized Products
**Source**: Existing products with modifications
**Customization Options**:
- Dimensions (L×W×H format)
- Materials (multi-select)
- Finish types (Matte, Glossy, Textured)
- Colors (color picker or text)
- Custom specifications
- Special instructions

---

## 4. Quote Creation Process

### 4.1 Quote Creation Workflow (SalesCatalogScreen.tsx)

#### Step 1: Cart Validation
```typescript
const proceedToCheckout = () => {
  if (cart.length === 0) {
    Alert.alert('Empty Cart', 'Please add items to cart before creating a quote');
    return;
  }
  setShowCart(false);
  setShowCustomerModal(true);
};
```

#### Step 2: Customer Data Collection
```typescript
interface CustomerData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

// Customer creation/linking logic
const createQuoteWithCustomer = async (customerData: CustomerData) => {
  let customerId = null;
  
  if (customerData.email) {
    // Check existing customer
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id, name')
      .eq('email', customerData.email)
      .single();
      
    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      // Create new customer
      const { data: newCustomer } = await supabase
        .from('customers')
        .insert([{
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          address: customerData.address,
          status: 'Active',
          created_by: user?.id,
        }])
        .select()
        .single();
        
      customerId = newCustomer.id;
    }
  }
  
  // Proceed to quote creation...
};
```

#### Step 3: Financial Calculations
```typescript
// Quote totals calculation
const subtotal = getSubtotalPrice(); // Sum of cart items after individual discounts
const originalPrice = cart.reduce((total, item) => {
  const mrpPrice = item.mrp_price || item.price;
  return total + (mrpPrice * item.quantity);
}, 0);

const orderLevelDiscountAmount = discountData?.discountAmount || 0;
const totalDiscountAmount = (originalPrice - subtotal) + orderLevelDiscountAmount;
const finalTotal = subtotal - orderLevelDiscountAmount + freightCharges;
```

#### Step 4: Quote Database Creation
```typescript
// Main quote record
const { data: quote, error: quoteError } = await supabase
  .from('quotes')
  .insert([{
    customer_id: customerId,
    customer_name: customerData.name,
    total_price: finalTotal,
    final_price: finalTotal,
    original_price: originalPrice,
    discount_amount: totalDiscountAmount,
    freight_charges: freightCharges,
    items: cart, // JSON array of cart items
    created_by: user?.id,
    status: 'Draft',
    // EMI details if applicable
    emi_enabled: discountData?.emiEnabled || false,
    emi_plan: discountData?.emiPlan || {},
    emi_monthly: discountData?.emiMonthly || 0,
  }])
  .select()
  .single();
```

#### Step 5: Custom Items Processing
```typescript
// Process custom and new products
const customItems = [];
const regularItems = [];

cart.forEach(item => {
  if (item.isNewProduct || item.isCustomized) {
    customItems.push({
      quote_id: quote.id,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      item_type: item.isNewProduct ? 'new' : 'custom',
      specifications: item.customization?.description || '',
      supplier_id: item.supplier_id,
      configuration: item.customization || item.productData || {},
    });
  } else {
    regularItems.push(item);
  }
});

// Insert custom items if any
if (customItems.length > 0) {
  await supabase
    .from('quote_custom_items')
    .insert(customItems);
}
```

### 4.2 Quote Status Management

#### Quote States
```typescript
enum QuoteStatus {
  DRAFT = 'Draft',              // Initial creation
  UNDER_REVIEW = 'Under Review', // Submitted for approval
  APPROVED = 'Approved',        // Manager approved
  SENT = 'Sent',               // Sent to customer
  ACCEPTED = 'Accepted',       // Customer accepted
  REJECTED = 'Rejected',       // Rejected by customer/manager
  EXPIRED = 'Expired',         // Past validity date
  CONVERTED = 'Converted',     // Successfully converted to sales order
}
```

---

## 5. Quote to Sales Order Conversion

### 5.1 Enhanced Conversion Process (salesSlice.ts)

#### Main Conversion Function
```typescript
export const convertQuoteToOrder = createAsyncThunk(
  'sales/convertQuoteToOrder',
  async ({ quoteId, created_by }: { quoteId: string; created_by: string }) => {
    console.log('🚀 STARTING QUOTE TO ORDER CONVERSION');

    // Step 1: Fetch quote and custom items in parallel
    const [quoteResult, customItemsResult] = await Promise.all([
      supabase.from('quotes').select('*').eq('id', quoteId).single(),
      supabase.from('quote_custom_items').select('*').eq('quote_id', quoteId)
    ]);

    const quote = quoteResult.data;
    const customItems = customItemsResult.data || [];

    // Step 2: Create sales order
    const { data: order, error: orderError } = await supabase
      .from('sales_orders')
      .insert([{
        quote_id: quoteId,
        customer_id: quote.customer_id,
        customer_name: quote.customer_name,
        total_price: quote.total_price,
        final_price: quote.final_price,
        original_price: quote.original_price,
        discount_amount: quote.discount_amount,
        freight_charges: quote.freight_charges,
        sales_representative_id: quote.sales_representative_id || created_by,
        created_by: created_by,
        status: 'draft',
        // Copy financial options
        emi_enabled: quote.emi_enabled,
        emi_plan: quote.emi_plan,
        emi_monthly: quote.emi_monthly,
      }])
      .select()
      .single();

    // Step 3: Process items with enhanced validation
    const allItemsToInsert = [];
    
    // Process custom items first (Priority 1)
    for (const item of customItems) {
      let customProduct = null;
      
      if (item.item_type === 'new' || item.item_type === 'custom') {
        // Create custom product record
        const { data: newCustomProduct } = await supabase
          .from('custom_products')
          .insert([{
            name: item.name,
            description: item.specifications,
            base_price: item.unit_price,
            configuration_schema: item.configuration,
            supplier_id: item.supplier_id,
            created_by: created_by,
          }])
          .select()
          .single();
          
        customProduct = newCustomProduct;
      }
      
      // Create sales order item with XOR constraint validation
      const salesOrderItem = {
        order_id: order.id,
        product_id: null, // XOR constraint: either product_id OR custom_product_id
        custom_product_id: customProduct?.id || null,
        line_number: allItemsToInsert.length + 1,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        final_price: item.unit_price,
        supplier_id: item.supplier_id,
        supplier_name: item.supplier_name || null,
      };
      
      allItemsToInsert.push(salesOrderItem);
    }
    
    // Process regular quote items (Priority 2)
    if (quote.items && Array.isArray(quote.items)) {
      for (const item of quote.items) {
        if (!item.isNewProduct && !item.isCustomized) {
          // Regular product
          const salesOrderItem = {
            order_id: order.id,
            product_id: item.productId,
            custom_product_id: null,
            line_number: allItemsToInsert.length + 1,
            name: item.name,
            quantity: item.quantity,
            unit_price: item.price,
            final_price: item.price,
            sku: item.sku,
          };
          
          allItemsToInsert.push(salesOrderItem);
        }
      }
    }

    // Step 4: Insert all sales order items
    const { data: insertedItems } = await supabase
      .from('sales_order_items')
      .insert(allItemsToInsert)
      .select();

    // Step 5: Update quote status
    await supabase
      .from('quotes')
      .update({ status: 'Converted' })
      .eq('id', quoteId);

    console.log('✅ QUOTE TO ORDER CONVERSION COMPLETE');
    return order;
  }
);
```

### 5.2 Conversion Triggers

#### From QuoteDetailsScreen.tsx
```typescript
const handleConvertToOrder = async () => {
  if (!deliveryDetails.expected_delivery_date.trim()) {
    Alert.alert('Error', 'Please select an expected delivery date');
    return;
  }

  try {
    // Use enhanced Redux action
    const result = await dispatch(convertQuoteToOrder({
      quoteId: quote.id,
      created_by: user?.id || '',
    }));

    if (convertQuoteToOrder.fulfilled.match(result)) {
      const salesOrder = result.payload;
      
      // Update with delivery details
      await supabase
        .from('sales_orders')
        .update({
          address: deliveryDetails.address,
          expected_delivery_date: deliveryDetails.expected_delivery_date,
          notes: deliveryDetails.notes || null,
          status: 'confirmed'
        })
        .eq('id', salesOrder.id);

      Alert.alert('Quote Converted Successfully!');
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to convert quote');
  }
};
```

---

## 6. Database Schema Implementation

### 6.1 Core Tables

#### Quotes Table
```sql
CREATE TABLE quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id),
  customer_name text NOT NULL, -- Denormalized for performance
  
  -- Status management
  status text DEFAULT 'Draft' CHECK (status IN (
    'Draft', 'Under Review', 'Approved', 'Sent', 
    'Accepted', 'Rejected', 'Expired', 'Converted'
  )),
  valid_until date,
  
  -- Financial data
  subtotal numeric DEFAULT 0,
  original_price numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  discount_percentage numeric DEFAULT 0,
  freight_charges numeric DEFAULT 0,
  total_price numeric NOT NULL,
  final_price numeric NOT NULL,
  
  -- EMI support
  emi_enabled boolean DEFAULT false,
  emi_plan jsonb DEFAULT '{}',
  emi_monthly numeric DEFAULT 0,
  bajaj_finance_amount numeric DEFAULT 0,
  
  -- Quote items (JSON for backward compatibility)
  items jsonb DEFAULT '[]',
  
  -- Metadata
  sales_representative_id uuid REFERENCES users(id),
  created_by uuid REFERENCES users(id) NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  
  is_deleted boolean DEFAULT false
);

-- Performance indexes
CREATE INDEX idx_quotes_customer_id ON quotes(customer_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_created_at ON quotes(created_at);
```

#### Quote Custom Items Table
```sql
CREATE TABLE quote_custom_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES quotes(id) ON DELETE CASCADE NOT NULL,
  
  -- Product information
  name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  
  -- Item classification
  item_type text NOT NULL CHECK (item_type IN ('new', 'custom')),
  
  -- Structured customization data
  specifications text,
  dimensions text,
  finish text,
  color text,
  materials jsonb DEFAULT '[]',
  custom_instructions text,
  
  -- Supplier information
  supplier_id uuid REFERENCES suppliers(id),
  supplier_name text,
  
  -- Configuration (legacy support)
  configuration jsonb DEFAULT '{}',
  
  -- Media
  image_url text,
  
  -- Metadata
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX idx_quote_custom_items_quote_id ON quote_custom_items(quote_id);
```

#### Sales Orders Table
```sql
CREATE TABLE sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  quote_id uuid REFERENCES quotes(id),
  customer_id uuid REFERENCES customers(id) NOT NULL,
  customer_name text NOT NULL,
  
  -- Status pipeline
  status text DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_approval', 'confirmed', 'ready_for_delivery',
    'partial_delivery_ready', 'in_delivery', 'delivered', 
    'completed', 'cancelled', 'on_hold'
  )),
  
  -- Financial data (inherited from quote)
  total_price numeric NOT NULL,
  final_price numeric NOT NULL,
  original_price numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  freight_charges numeric DEFAULT 0,
  
  -- EMI data
  emi_enabled boolean DEFAULT false,
  emi_plan jsonb DEFAULT '{}',
  emi_monthly numeric DEFAULT 0,
  
  -- Delivery information
  address text,
  expected_delivery_date date,
  actual_delivery_date date,
  notes text,
  
  -- Sales tracking
  sales_representative_id uuid REFERENCES users(id),
  created_by uuid REFERENCES users(id) NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  
  is_deleted boolean DEFAULT false
);

CREATE INDEX idx_sales_orders_customer_id ON sales_orders(customer_id);
CREATE INDEX idx_sales_orders_quote_id ON sales_orders(quote_id);
CREATE INDEX idx_sales_orders_status ON sales_orders(status);
```

#### Sales Order Items Table
```sql
CREATE TABLE sales_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES sales_orders(id) ON DELETE CASCADE NOT NULL,
  quote_item_id uuid REFERENCES quote_items(id),
  line_number integer NOT NULL,
  
  -- XOR constraint: either regular product OR custom product
  product_id uuid REFERENCES products(id),
  custom_product_id uuid REFERENCES custom_products(id),
  
  -- Product details
  name text NOT NULL,
  description text,
  sku text,
  category text,
  
  -- Quantities and pricing
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  final_price numeric NOT NULL,
  cost_price numeric DEFAULT 0,
  
  -- Configuration
  configuration jsonb DEFAULT '{}',
  specifications text,
  
  -- Supplier information
  supplier_id uuid REFERENCES suppliers(id),
  supplier_name text,
  
  -- Delivery tracking
  delivered_quantity integer DEFAULT 0,
  
  -- Metadata
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  
  -- XOR constraint enforcement
  CONSTRAINT sales_order_items_product_check CHECK (
    (product_id IS NOT NULL AND custom_product_id IS NULL) OR 
    (product_id IS NULL AND custom_product_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX idx_sales_order_items_order_line ON sales_order_items(order_id, line_number);
CREATE INDEX idx_sales_order_items_product_id ON sales_order_items(product_id);
CREATE INDEX idx_sales_order_items_custom_product_id ON sales_order_items(custom_product_id);
```

---

## 7. Screen Flow & Navigation

### 7.1 Primary Navigation Flow

```
SalesCatalogScreen.tsx (Main Shopping)
├── Product Selection & Cart Building
├── Individual Product Discounts (up to 8%)
├── Order-Level Discounts & EMI
├── Customer Modal (Data Collection)
└── Quote Creation
    ↓
QuotesListScreen.tsx (Quote Management)
├── Quote Approval Workflow
├── Delivery Details Collection
└── Convert to Sales Order
    ↓
SalesListScreen.tsx (Order Management)
├── Order Status Tracking
├── Financial Validation
└── Delivery Coordination
```

### 7.2 Screen Implementation Details

#### SalesCatalogScreen.tsx - Main Shopping Interface
**Key Functions**:
```typescript
// Product loading with inventory check
const fetchProducts = async () => {
  const { data, error } = await supabase
    .from('inventory_items')
    .select(`
      *,
      product:products(*),
      supplier:suppliers(*)
    `)
    .eq('is_deleted', false)
    .gt('quantity', 0)
    .order('product.name');
};

// Cart management
const addToCart = (product: Product) => { /* Implementation above */ };
const updateCartQuantityHandler = (productId: string, change: number) => { /* ... */ };
const removeFromCartHandler = (productId: string) => { /* ... */ };

// Discount management
const handleApplyDiscount = (discountData: DiscountData) => { /* ... */ };
const applyProductDiscount = (productId: string, percentage: number) => { /* ... */ };

// Quote creation
const createQuoteWithCustomer = async (customerData: CustomerData) => { /* Implementation above */ };
```

**Key Features**:
- Real-time inventory display
- Product search and filtering
- Individual product discounts (max 8%)
- Order-level discounts and EMI plans
- New product creation via UnifiedProductModal
- Product customization support

#### QuoteDetailsScreen.tsx - Quote Management
**Key Functions**:
```typescript
// Quote conversion to sales order
const handleConvertToOrder = async () => { /* Implementation above */ };

// Quote approval (for managers)
const handleApprovalAction = (action: 'approve' | 'reject') => { /* ... */ };

// Special discount management
const saveSpecialDiscountChanges = async () => { /* ... */ };
```

#### SalesListScreen.tsx - Sales Order Management
**Key Functions**:
```typescript
// Enhanced quote to order conversion
const approveQuote = async (quote: Quote, deliveryDetails: DeliveryDetails) => { /* ... */ };

// Auto-fix financial discrepancies
const autoFixOrderPricing = async (order: SalesOrder) => { /* ... */ };
```

---

## 8. Pricing & Discount System

### 8.1 Individual Product Discounts

#### Implementation (SalesCatalogScreen.tsx)
```typescript
// Product-level discount state
const [productDiscounts, setProductDiscounts] = useState<{
  [productId: string]: {
    percentage: number;
    discountedPrice: number;
  }
}>({});

// Apply individual discount (max 8%)
const applyProductDiscount = (productId: string, percentage: number) => {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const originalPrice = product.price;
  const discountedPrice = originalPrice * (1 - percentage / 100);
  
  // Update product discounts state
  setProductDiscounts(prev => ({
    ...prev,
    [productId]: { percentage, discountedPrice }
  }));

  // Update cart if product is already added
  const updatedItems = cart.map(item => {
    if (item.id === productId) {
      return {
        ...item,
        price: discountedPrice,
        discount_percentage: percentage,
        discounted_price: discountedPrice,
        mrp_price: originalPrice
      };
    }
    return item;
  });
  
  dispatch(setCartItems(updatedItems));
  dispatch(saveCartToStorage());
};
```

### 8.2 Order-Level Discounts

#### Discount Data Structure
```typescript
interface DiscountData {
  discountPercentage: number;     // Order-level discount %
  discountAmount: number;         // Calculated discount amount
  emiEnabled: boolean;           // Bajaj Finance EMI
  emiPlan?: {
    name: string;
    months: number;
    interestRate: number;
  };
  emiMonthly: number;            // Monthly EMI amount
  freightCharges: number;        // Shipping charges
}
```

#### EMI Integration (Bajaj Finance)
```typescript
// EMI plans configuration
const emiPlans = [
  { name: '6 Months', months: 6, interestRate: 12 },
  { name: '12 Months', months: 12, interestRate: 15 },
  { name: '18 Months', months: 18, interestRate: 18 },
  { name: '24 Months', months: 24, interestRate: 20 },
];

// EMI calculation
const calculateEMI = (principal: number, rate: number, months: number) => {
  const monthlyRate = rate / 100 / 12;
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / 
              (Math.pow(1 + monthlyRate, months) - 1);
  return emi;
};

// Important: EMI plans clear all individual product discounts
const handleApplyDiscount = (newDiscountData: DiscountData) => {
  if (newDiscountData.emiEnabled) {
    // Clear individual product discounts
    setProductDiscounts({});
    
    // Reset cart items to MRP prices
    const updatedItems = cart.map(item => ({
      ...item,
      price: item.mrp_price,
      discount_percentage: 0,
      discounted_price: item.mrp_price
    }));
    dispatch(setCartItems(updatedItems));
  }
  
  setDiscountData(newDiscountData);
};
```

### 8.3 Financial Calculations

#### Total Price Calculation
```typescript
// Subtotal (after individual discounts)
const getSubtotalPrice = () => {
  return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
};

// Final total with order-level discount and freight
const getTotalPrice = () => {
  const subtotal = getSubtotalPrice();
  const orderLevelDiscountAmount = discountData?.discountAmount || 0;
  return subtotal - orderLevelDiscountAmount + freightCharges;
};

// Original price (sum of MRP prices)
const getOriginalPrice = () => {
  return cart.reduce((total, item) => {
    const mrpPrice = item.mrp_price || item.price;
    return total + (mrpPrice * item.quantity);
  }, 0);
};
```

---

## 9. Implementation Code Reference

### 9.1 Key Files Structure

```
src/
├── store/
│   ├── cartSlice.ts                 # Cart Redux state management
│   └── slices/salesSlice.ts         # Sales orders and quote conversion
├── screens/
│   └── sales/
│       ├── SalesCatalogScreen.tsx   # Main shopping interface
│       ├── QuoteDetailsScreen.tsx   # Quote management
│       ├── QuotesListScreen.tsx     # Quote listing and approval
│       └── SalesListScreen.tsx      # Sales order management
├── components/
│   └── sales/
│       ├── UnifiedProductModal.tsx  # New/custom product creation
│       ├── ProductDetailsModal.tsx  # Product information display
│       └── DiscountModal.tsx        # Order-level discount management
└── types/
    ├── index.ts                     # CartItem, Product interfaces
    └── sales.ts                     # Quote, SalesOrder interfaces
```

### 9.2 Database Queries

#### Product Loading with Inventory
```typescript
// Get products with current inventory levels
const { data: products, error } = await supabase
  .from('inventory_items')
  .select(`
    *,
    product:products(*),
    supplier:suppliers(name, phone, email)
  `)
  .eq('is_deleted', false)
  .gt('quantity', 0)
  .order('product.name');
```

#### Quote Creation
```typescript
// Create quote with items
const { data: quote, error } = await supabase
  .from('quotes')
  .insert([{
    customer_id: customerId,
    customer_name: customerData.name,
    total_price: finalTotal,
    final_price: finalTotal,
    original_price: originalPrice,
    discount_amount: totalDiscountAmount,
    freight_charges: freightCharges,
    items: cart, // JSON array
    sales_representative_id: user?.id,
    created_by: user?.id,
    status: 'Draft',
    emi_enabled: discountData?.emiEnabled || false,
    emi_plan: discountData?.emiPlan || {},
  }])
  .select()
  .single();
```

#### Sales Order Conversion Query
```typescript
// Enhanced conversion with proper item handling
const convertQuoteToOrder = async (quoteId: string, created_by: string) => {
  // Multi-step process with validation
  // See implementation in Section 5.1
};
```

---

## 10. Business Rules & Validations

### 10.1 Cart Validation Rules

1. **Stock Availability**: Products can only be added if `inventory_items.quantity > 0`
2. **Quantity Limits**: Cart quantity cannot exceed available stock
3. **Individual Discounts**: Maximum 8% discount per product
4. **EMI Restrictions**: EMI plans clear all individual product discounts
5. **Product Types**: Support for store, new, and custom products

### 10.2 Quote Validation Rules

1. **Customer Required**: Must have customer name (email optional)
2. **Non-Empty Cart**: At least one item required
3. **Price Validation**: All calculations must be accurate
4. **Status Transitions**: Draft → Under Review → Approved → Converted

### 10.3 Sales Order Validation Rules

1. **XOR Constraint**: Each item must have either `product_id` OR `custom_product_id`
2. **Financial Accuracy**: Order totals must match quote totals
3. **Inventory Allocation**: Stock automatically reduced on `ready_for_delivery` status
4. **Delivery Requirements**: Address and expected delivery date required

### 10.4 Error Handling

#### Cart Operations
```typescript
// Stock limit validation
if (existingItem.quantity >= product.quantity) {
  Alert.alert('Stock Limit', `Only ${product.quantity} items available in stock`);
  return;
}

// Price validation
if (isNaN(parseFloat(newProductData.price)) || parseFloat(newProductData.price) <= 0) {
  Alert.alert('Invalid Price', 'Please enter a valid price');
  return;
}
```

#### Quote Creation
```typescript
// Customer validation
if (!customerData.name.trim()) {
  Alert.alert('Missing Information', 'Customer name is required');
  return;
}

// Cart validation
if (cart.length === 0) {
  Alert.alert('Empty Cart', 'Please add items to cart before creating a quote');
  return;
}
```

#### Sales Order Conversion
```typescript
// Quote status validation
if (quote.status !== 'Accepted' && quote.status !== 'Approved') {
  throw new Error('Quote must be accepted or approved before conversion');
}

// XOR constraint validation
const invalidItems = allItemsToInsert.filter(item => {
  const hasProduct = item.product_id !== null;
  const hasCustomProduct = item.custom_product_id !== null;
  return hasProduct === hasCustomProduct; // Both true or both false = invalid
});

if (invalidItems.length > 0) {
  throw new Error('XOR constraint violation: Items must have either product_id OR custom_product_id');
}
```

---

## 📊 Summary

The Al Rams ERP cart-to-sales workflow implements a comprehensive, production-ready system with:

✅ **Advanced Cart Management**: Redux-based state with AsyncStorage persistence
✅ **Multi-Product Support**: Store, new, and customized products
✅ **Sophisticated Pricing**: Individual and order-level discounts, EMI integration
✅ **Enhanced Quote System**: Structured custom items, approval workflow
✅ **Robust Conversion**: Quote-to-order with validation and error handling
✅ **Complete Audit Trail**: Full tracking from cart to delivery
✅ **Mobile-First Design**: Optimized for sales representatives in the field

The system handles complex business requirements while maintaining data integrity and providing an excellent user experience for sales teams.
