// Script to create test sales orders with different aging dates
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAgingTestData() {
  try {
    console.log('🧪 Creating test sales orders for aging reports...');
    
    const today = new Date();
    
    // Test data with different aging periods
    const testOrders = [
      {
        customer_id: '30250364-8c87-4e81-8819-984cca929514', // Existing customer
        date: new Date(today.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 45 days old
        status: 'confirmed',
        final_price: 15000,
        original_price: 15000,
        supplier_name: 'Test Supplier',
        quote_id: null,
        total_paid: 0,
        notes: 'Test order for aging - 45 days old'
      },
      {
        customer_id: '30250364-8c87-4e81-8819-984cca929514',
        date: new Date(today.getTime() - 75 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 75 days old
        status: 'confirmed',
        final_price: 25000,
        original_price: 25000,
        supplier_name: 'Test Supplier',
        quote_id: null,
        total_paid: 5000, // Partially paid
        notes: 'Test order for aging - 75 days old (partially paid)'
      },
      {
        customer_id: '30250364-8c87-4e81-8819-984cca929514',
        date: new Date(today.getTime() - 100 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 100 days old
        status: 'confirmed',
        final_price: 35000,
        original_price: 35000,
        supplier_name: 'Test Supplier',
        quote_id: null,
        total_paid: 0,
        notes: 'Test order for aging - 100 days old'
      },
      {
        customer_id: '30250364-8c87-4e81-8819-984cca929514',
        date: new Date(today.getTime() - 150 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 150 days old
        status: 'confirmed',
        final_price: 45000,
        original_price: 45000,
        supplier_name: 'Test Supplier',
        quote_id: null,
        total_paid: 0,
        notes: 'Test order for aging - 150 days old'
      }
    ];

    console.log('📝 Inserting test orders...');
    
    for (const order of testOrders) {
      const { data, error } = await supabase
        .from('sales_orders')
        .insert([order])
        .select();
      
      if (error) {
        console.error('❌ Error creating test order:', error);
      } else {
        console.log(`✅ Created test order: ${order.notes}`);
        console.log(`   Date: ${order.date}, Amount: ₹${order.final_price.toLocaleString()}`);
      }
    }
    
    console.log('\n🎉 Test data creation completed!');
    console.log('🔍 Now check your aging reports to see the data categorized by age.');
    console.log('\n📊 Expected aging distribution:');
    console.log('   • 31-60 days: ₹15,000 (45 days old)');
    console.log('   • 61-90 days: ₹20,000 (75 days old, ₹25,000 - ₹5,000 paid)');
    console.log('   • 91-120 days: ₹35,000 (100 days old)');
    console.log('   • 120+ days: ₹45,000 (150 days old)');
    console.log('   • Total Outstanding: ₹115,000');
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

createAgingTestData();
