// Test script for WhatsApp integration and Sales Order API
import { createClient } from '@supabase/supabase-js';

// Configuration (replace with your actual values)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your-supabase-url';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'your-service-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testSalesOrderAPI() {
    console.log('🧪 Testing Sales Order API Integration...\n');

    try {
        // Test 1: Fetch all sales orders
        console.log('1. Testing sales orders list...');
        const { data: orders, error: ordersError } = await supabase
            .from('sales_orders')
            .select('*')
            .limit(5);

        if (ordersError) {
            console.error('❌ Error fetching sales orders:', ordersError.message);
        } else {
            console.log(`✅ Found ${orders?.length || 0} sales orders`);
            if (orders && orders.length > 0) {
                const firstOrder = orders[0];
                console.log(`   First order ID: ${firstOrder.id}`);

                // Test 2: Fetch order details with customer and items
                console.log('\n2. Testing sales order details with customer and items...');
                await testOrderDetails(firstOrder.id);
            }
        }

        // Test 3: Test customer table
        console.log('\n3. Testing customers table...');
        const { data: customers, error: customersError } = await supabase
            .from('customers')
            .select('*')
            .limit(3);

        if (customersError) {
            console.error('❌ Error fetching customers:', customersError.message);
        } else {
            console.log(`✅ Found ${customers?.length || 0} customers`);
        }

        // Test 4: Test products table
        console.log('\n4. Testing products table...');
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('*')
            .limit(3);

        if (productsError) {
            console.error('❌ Error fetching products:', productsError.message);
        } else {
            console.log(`✅ Found ${products?.length || 0} products`);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

async function testOrderDetails(orderId) {
    try {
        // Simulate the same query as our API endpoint
        const { data: orderData, error: orderError } = await supabase
            .from('sales_orders')
            .select(`
        *,
        customers:customer_id (
          id,
          name,
          email,
          phone,
          address,
          city,
          country
        )
      `)
            .eq('id', orderId)
            .single();

        if (orderError) {
            console.error('❌ Error fetching order details:', orderError.message);
            return;
        }

        console.log('✅ Order details fetched successfully');
        console.log(`   Order Number: ${orderData.order_number || 'N/A'}`);
        console.log(`   Customer: ${orderData.customers?.name || 'N/A'}`);
        console.log(`   Phone: ${orderData.customers?.phone || 'N/A'}`);
        console.log(`   Total: $${orderData.total_amount || 0}`);

        // Fetch order items
        const { data: itemsData, error: itemsError } = await supabase
            .from('order_items')
            .select(`
        *,
        products:product_id (
          id,
          name,
          sku,
          category,
          unit_price
        )
      `)
            .eq('order_id', orderId);

        if (itemsError) {
            console.error('❌ Error fetching order items:', itemsError.message);
        } else {
            console.log(`✅ Found ${itemsData?.length || 0} order items`);
            if (itemsData && itemsData.length > 0) {
                itemsData.forEach((item, index) => {
                    console.log(`   Item ${index + 1}: ${item.products?.name || 'Unknown'} (Qty: ${item.quantity})`);
                });
            }
        }

        // Simulate WhatsApp bill formatting
        console.log('\n📱 WhatsApp Bill Preview:');
        const billPreview = formatBillPreview({
            ...orderData,
            items: itemsData
        });
        console.log(billPreview);

    } catch (error) {
        console.error('❌ Error testing order details:', error.message);
    }
}

function formatBillPreview(orderData) {
    const customer = orderData.customers;
    const items = orderData.items || [];

    let message = `🧾 AL RAMS FURNITURE - INVOICE\n\n`;
    message += `📋 Order #: ${orderData.order_number || orderData.id}\n`;
    message += `📅 Date: ${new Date(orderData.order_date || orderData.created_at).toLocaleDateString()}\n`;

    message += `\n👤 Customer Details:\n`;
    message += `Name: ${customer?.name || 'N/A'}\n`;

    if (customer ? .phone) {
        message += `Phone: ${customer.phone}\n`;
    }

    if (customer ? .address) {
        message += `Address: ${customer.address}`;
        if (customer.city) message += `, ${customer.city}`;
        if (customer.country) message += `, ${customer.country}`;
        message += `\n`;
    }

    message += `\n🛋️ Items Ordered:\n`;
    message += `${'-'.repeat(30)}\n`;

    items.forEach((item, index) => {
        const productName = item.products ? .name || `Product ${item.product_id}`;
        const itemTotal = item.quantity * item.unit_price;

        message += `${index + 1}. ${productName}\n`;
        message += `   Qty: ${item.quantity} × $${item.unit_price.toFixed(2)} = $${itemTotal.toFixed(2)}\n`;

        if (item.products ? .sku) {
            message += `   SKU: ${item.products.sku}\n`;
        }
        message += `\n`;
    });

    message += `${'-'.repeat(30)}\n`;
    message += `💰 Total Amount: $${orderData.total_amount?.toFixed(2) || '0.00'}\n`;

    message += `\n✅ Status: ${orderData.status?.toUpperCase() || 'PENDING'}\n`;
    message += `\n📞 Contact us for any queries\n`;
    message += `Thank you for choosing Al Rams Furniture! 🏡`;

    return message;
}

// Database schema validation
async function validateDatabaseSchema() {
    console.log('\n🔍 Validating Database Schema...\n');

    const tables = ['sales_orders', 'customers', 'products', 'order_items'];

    for (const table of tables) {
        try {
            const { error } = await supabase
                .from(table)
                .select('*')
                .limit(1);

            if (error) {
                console.error(`❌ Table '${table}' error:`, error.message);
            } else {
                console.log(`✅ Table '${table}' accessible`);
            }
        } catch (error) {
            console.error(`❌ Table '${table}' validation failed:`, error.message);
        }
    }
}

// Main test execution - can be called manually for testing
export async function runTests() {
    console.log('🚀 Al Rams ERP - WhatsApp Integration Test Suite\n');
    console.log('================================================\n');

    await validateDatabaseSchema();
    await testSalesOrderAPI();

    console.log('\n================================================');
    console.log('✅ Test Suite Complete!');
    console.log('\n📝 Next Steps:');
    console.log('1. Configure WhatsApp Business API credentials in .env.local');
    console.log('2. Test the sales order detail API endpoint: GET /api/sales/orders/[id]');
    console.log('3. Test the WhatsApp integration in the Sales Orders page');
    console.log('4. Verify print functionality works in the browser');
}

// Run tests if this script is executed directly
export { testSalesOrderAPI, formatBillPreview, validateDatabaseSchema };