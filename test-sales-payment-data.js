// Test script to verify sales orders payment data
const testSalesPaymentData = async () => {
  console.log('Testing Sales Orders Payment Data...\n');
  
  try {
    const response = await fetch('http://localhost:3000/api/sales/orders');
    const orders = await response.json();
    
    console.log(`Found ${orders.length} orders\n`);
    
    orders.slice(0, 3).forEach((order, index) => {
      console.log(`Order ${index + 1}:`);
      console.log(`  ID: ${order.id}`);
      console.log(`  Customer: ${order.customer?.name || 'N/A'}`);
      console.log(`  Status: ${order.status}`);
      console.log(`  Total: ${order.total || 0}`);
      console.log(`  Final Price: ${order.final_price || 0}`);
      console.log(`  Payment Status: ${order.payment_status || 'N/A'}`);
      console.log(`  Total Paid: ${order.total_paid || 0}`);
      console.log(`  Balance Due: ${order.balance_due || 0}`);
      console.log(`  Payment Count: ${order.payment_count || 0}`);
      console.log('');
    });
    
    // Check for orders with payments
    const ordersWithPayments = orders.filter(o => o.total_paid > 0);
    console.log(`Orders with payments: ${ordersWithPayments.length}`);
    
    if (ordersWithPayments.length > 0) {
      console.log('\nOrders with payments:');
      ordersWithPayments.forEach(order => {
        console.log(`  ${order.customer?.name || 'Unknown'}: Paid ${order.total_paid} / ${order.final_price || order.total} (${order.payment_status})`);
      });
    }
    
  } catch (error) {
    console.error('Error testing sales payment data:', error);
  }
};

testSalesPaymentData();
