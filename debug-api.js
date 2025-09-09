// Quick debug script to test API
async function testAPI() {
  try {
    const response = await fetch('http://localhost:3000/api/procurement/purchase_orders');
    const data = await response.json();
    
    console.log('Total purchase orders:', data.length);
    
    // Check first few orders
    data.slice(0, 3).forEach((order, index) => {
      console.log(`\n=== Order ${index + 1} ===`);
      console.log('ID:', order.id);
      console.log('Sales Order ID:', order.sales_order_id);
      console.log('Sales Order Found:', !!order.sales_order);
      
      if (order.sales_order) {
        console.log('Customer:', order.sales_order.customer);
        console.log('Customer Name:', order.sales_order.customer_name);
        console.log('Sales Rep:', order.sales_order.sales_rep);
        console.log('Created By:', order.sales_order.created_by);
      } else {
        console.log('No sales order data');
      }
      
      console.log('Creator:', order.creator);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testAPI();
