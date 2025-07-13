import { User, UserRole, Customer, Product, InventoryItem, Quote, Order, Interaction, ProductionRun, PurchaseRequest, Invoice, Payment, VendorBill, Delivery, Alert, DeliveryProof } from '@/types';
import { ROLES } from './roles'; // Import roles definition

// --- MOCK USERS ---
const createMockUser = (id: string, email: string, password: string, role: UserRole): User => ({
    id,
    email,
    password,
    role,
    permissions: ROLES[role],
});

export const MOCK_USERS: User[] = [
    createMockUser('user-admin', 'admin@example.com', 'password123', 'System Administrator'),
    createMockUser('user-exec', 'exec@example.com', 'password456', 'Executive'),
    createMockUser('user-sales-mgr', 'sales_mgr@example.com', 'password789', 'Sales Manager'),
    createMockUser('user-sales-rep', 'sales_rep@example.com', 'password101', 'Sales Representative'),
    createMockUser('user-procure', 'procure@example.com', 'password102', 'Procurement Manager'),
    createMockUser('user-wh-mgr', 'warehouse_mgr@example.com', 'password103', 'Warehouse Manager'),
    createMockUser('user-wh-staff', 'warehouse_staff@example.com', 'password104', 'Warehouse Staff'),
    createMockUser('user-prod-mgr', 'prod_mgr@example.com', 'password105', 'Production Manager'),
    createMockUser('user-driver', 'driver@example.com', 'password106', 'Delivery Driver'),
    createMockUser('user-finance', 'finance@example.com', 'password107', 'Finance Manager'),
    createMockUser('user-hr', 'hr@example.com', 'password108', 'HR Manager'),
    createMockUser('user-employee', 'employee@example.com', 'password109', 'Employee'),
];

export const MOCK_CURRENT_USER = MOCK_USERS[3];
export const initialCustomers: Customer[] = [
    { id: 'C001', name: 'Prestige Furnishings', email: 'contact@prestige.com', phone: '111-222-3333', status: 'Active', source: 'Website', tags: ['High-Value'], created_at: '2025-05-01T10:00:00Z', updated_at: '2025-06-10T11:00:00Z' },
    { id: 'C002', name: 'Urban Abode', email: 'sales@urbanabode.co', phone: '444-555-6666', status: 'Lead', source: 'Referral', tags: [], created_at: '2025-06-05T14:20:00Z', updated_at: '2025-06-05T14:20:00Z' },
];

export const initialProducts: Product[] = [
    { id: 'P001', name: 'Luxury Sofa Set', price: 1200, material: 'Velvet', color: 'Grey', stock: 15, config_schema: { upholstery: ['Velvet', 'Linen', 'Leather'], legs: ['Oak', 'Metal'] } },
    { id: 'P002', name: 'Ergonomic Chair', price: 350, material: 'Mesh', color: 'Black', stock: 50 },
    { id: 'P003', name: 'King Size Bed', price: 950, material: 'Oak', color: 'Natural', stock: 8, config_schema: { headboard_style: ['Tufted', 'Plain'] } },
];

export const initialInteractions: Interaction[] = [
    { id: 'I001', customer_id: 'C001', user_id: 'user-1', type: 'Email', notes: 'Sent follow-up about new catalog.', timestamp: '2025-06-12T09:30:00Z' },
];

export const initialQuotes: Quote[] = [
    { id: 'Q001', customer_id: 'C001', customer: 'Prestige Furnishings', items: [{ product_id: 'P001', name: 'Luxury Sofa Set', qty: 2, price: 1200 }], total_price: 2400, status: 'Draft', created_by: 'Alex Green', created_at: '2025-06-14T11:00:00Z'},
    { id: 'Q002', customer_id: 'C002', customer: 'Urban Abode', items: [{ product_id: 'P002', name: 'Ergonomic Chair', qty: 5, price: 350 }], total_price: 1750, status: 'Approved', created_by: 'Alex Green', created_at: '2025-06-15T15:00:00Z'},
];

export const initialOrders: Order[] = [
    { id: 'ORD001', customer: 'Classic Comforts', items: [{ product_id: 'P002', name: 'Ergonomic Chair', qty: 10, price: 350 }], total: 3500, status: 'Processing', date: '2025-06-10', quote_id: 'Q003' },
    { id: 'ORD002', customer: 'Urban Abode', items: [{ product_id: 'P002', name: 'Ergonomic Chair', qty: 5, price: 350 }], total: 1750, status: 'Shipped', date: '2025-06-16', quote_id: 'Q002' },
];

export const MOCK_INVENTORY_ITEMS_MANAGER: InventoryItem[] = [
    { id: 'INV001', name: 'Oak Wood Planks', stock: 150, reorderPoint: 50, category: 'Raw Material', supplier: 'Forest Goods Inc.' },
    { id: 'INV002', name: 'Luxury Sofa Set', stock: 2, reorderPoint: 3, category: 'Finished Product', supplier: 'Internal' },
    { id: 'INV003', name: '8-inch Screws (Box)', stock: 200, reorderPoint: 100, category: 'Component', supplier: 'Hardware Supplies Co.' },
];

export const MOCK_PRODUCTION_ORDERS_MANAGER: ProductionRun[] = [
    { id: 'WO-001', product: 'Ergonomic Chair', quantity: 20, status: 'In Progress', progress: 60, stage: 'Assembly', startDate: '2025-06-10', order_id: 'ORD001', assigned_to: 'user-1', due_date: '2025-06-20' },
    { id: 'WO-002', product: 'Luxury Sofa Set', quantity: 5, status: 'Scheduled', progress: 0, stage: 'Cutting', startDate: '2025-06-18', order_id: 'ORD003', notes: 'High priority for showroom', due_date: '2025-06-25' },
];

export const MOCK_PROCUREMENT_ORDERS_MANAGER: PurchaseRequest[] = [
    { id: 'PQ001', supplier: 'Forest Goods Inc.', amount: 5000, date: '2025-06-08', items: ['Oak Wood x50'], quantity: 50, status: 'Approved' },
    { id: 'PQ002', supplier: 'Hardware Supplies Co.', amount: 300, date: '2025-06-15', items: ['8-inch Screws x200'], quantity: 200, status: 'Pending Approval' },
];

export const initialInvoices: Invoice[] = [
    { id: 'INV001', client: 'Classic Comforts', amount: 3500, dueDate: '2025-07-10', status: 'Unpaid', order_id: 'ORD001' },
    { id: 'INV002', client: 'Urban Abode', amount: 1750, dueDate: '2025-07-16', status: 'Paid', order_id: 'ORD002' },
];

export const initialPayments: Payment[] = [
    { id: 'PAY001', invoice_id: 'INV002', amount: 1750, method: 'Credit Card', timestamp: '2025-06-17T10:00:00Z' }
];

export const initialVendorBills: VendorBill[] = [
    { id: 'VB001', vendor_name: 'Forest Goods Inc.', amount: 5000, invoice_no: 'FG-987', status: 'Paid', date: '2025-06-09' },
    { id: 'VB002', vendor_name: 'Hardware Supplies Co.', amount: 300, invoice_no: 'HS-123', status: 'Unpaid', date: '2025-06-16' },
];

export const initialDeliveries: Delivery[] = [
    { id: 'D001', customer_name: 'Downtown Offices', address: '123 Business Rd, Cityville', phone: '555-123-4567', time_slot: '2 PM - 4 PM', status: 'en_route', updated_at: new Date().toISOString(), instructions: 'Call upon arrival.', items: [{product_id: 'P001', name: 'Luxury Sofa Set', qty: 1, price: 1200}] },
    { id: 'D002', customer_name: 'Jane Smith', address: '456 Home St, Suburbia', phone: '555-987-6543', time_slot: '10 AM - 12 PM', status: 'delivered', updated_at: '2025-06-15T11:30:00Z', items: [{product_id: 'P003', name: 'King Size Bed', qty: 1, price: 950}] },
];

export const initialDeliveryProofs: DeliveryProof[] = [
    { id: 'DP001', delivery_id: 'D002', type: 'photo', url: 'https://placehold.co/400x300/e2e8f0/64748b?text=Package+at+Door', timestamp: '2025-06-15T11:28:00Z'},
    { id: 'DP002', delivery_id: 'D002', type: 'signature', url: 'https://placehold.co/300x100/e2e8f0/64748b?text=J.Smith', timestamp: '2025-06-15T11:29:00Z'},
]

export const MOCK_ALERTS: Alert[] = [
  { id: 'alert-inv-1', type: 'Inventory', message: 'Luxury Sofa Set is below reorder point (2 left)', priority: 'high' },
  { id: 'alert-prod-1', type: 'Production', message: 'Work Order WO-001 is behind schedule', priority: 'medium' },
];

export const initialRegisteredUsers: User[] = [
    MOCK_CURRENT_USER, 
    { id: 'user-2', email: 'jane.doe@example.com', password: 'password456', role: 'Sales Representative', permissions: ROLES['Sales Representative'] },
    { id: 'user-3', email: 'bill.carpenter@example.com', password: 'password789', role: 'System Administrator', permissions: ROLES['System Administrator'] }
];
export { ROLES };

