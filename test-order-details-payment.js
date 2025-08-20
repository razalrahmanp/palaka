// Test script to verify order details payment integration
const testOrderDetailsPayment = async () => {
  console.log('Testing Order Details Payment Integration...\n');
  
  try {
    // First, get list of orders
    const ordersResponse = await fetch('http://localhost:3000/api/sales/orders');
    const orders = await ordersResponse.json();
    
    if (orders.length === 0) {
      console.log('No orders found to test');
      return;
    }
    
    // Test payment summary for first order
    const testOrder = orders[0];
    console.log(`Testing order: ${testOrder.id}`);
    console.log(`Customer: ${testOrder.customer?.name || 'Unknown'}`);
    console.log(`Total: ${testOrder.final_price || testOrder.total}`);
    
    // Test payment summary API
    const paymentResponse = await fetch(`http://localhost:3000/api/sales/orders/${testOrder.id}/payment-summary`);
    
    if (paymentResponse.ok) {
      const paymentSummary = await paymentResponse.json();
      console.log('\nPayment Summary from API:');
      console.log(`- Total Paid: ${paymentSummary.total_paid}`);
      console.log(`- Balance Due: ${paymentSummary.balance_due}`);
      console.log(`- Payment Status: ${paymentSummary.payment_status}`);
      console.log(`- Payment Count: ${paymentSummary.payment_count}`);
      
      // Verify payment calculation
      const expectedBalance = (testOrder.final_price || testOrder.total) - paymentSummary.total_paid;
      const actualBalance = paymentSummary.balance_due;
      
      console.log('\nValidation:');
      console.log(`Expected Balance: ${expectedBalance}`);
      console.log(`Actual Balance: ${actualBalance}`);
      console.log(`Balance Match: ${Math.abs(expectedBalance - actualBalance) < 0.01 ? '✅' : '❌'}`);
      
      // Test payment status logic
      const orderTotal = testOrder.final_price || testOrder.total;
      const expectedStatus = paymentSummary.total_paid >= orderTotal ? 'paid' : 
                            paymentSummary.total_paid > 0 ? 'partial' : 'pending';
      console.log(`Expected Status: ${expectedStatus}`);
      console.log(`Actual Status: ${paymentSummary.payment_status}`);
      console.log(`Status Match: ${expectedStatus === paymentSummary.payment_status ? '✅' : '❌'}`);
      
    } else {
      console.log('\n❌ Payment summary API failed');
      console.log(`Status: ${paymentResponse.status}`);
    }
    
    console.log('\n✅ Order Details Payment Integration Test Complete');
    
  } catch (error) {
    console.error('❌ Error testing order details payment:', error);
  }
};

testOrderDetailsPayment();
