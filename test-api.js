const fs = require('fs');

async function testAPI() {
  try {
    const response = await fetch('http://localhost:3000/api/sales/orders');
    const data = await response.json();
    
    console.log('API Response Status:', response.status);
    console.log('Data structure:', typeof data);
    console.log('Data keys:', Object.keys(data));
    
    if (data.value && data.value.length > 0) {
      console.log('First Order Items:', JSON.stringify(data.value[0].items, null, 2));
    } else if (Array.isArray(data) && data.length > 0) {
      console.log('First Order Items:', JSON.stringify(data[0].items, null, 2));
    } else {
      console.log('First few items of data:', JSON.stringify(data, null, 2));
    }
    
    // Write to file for inspection
    fs.writeFileSync('api-test-result.json', JSON.stringify(data, null, 2));
    console.log('Results written to api-test-result.json');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testAPI();
