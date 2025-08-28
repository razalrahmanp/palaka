// Test customer creation API
async function testCustomerCreation() {
  try {
    const response = await fetch('http://localhost:3001/api/crm/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Customer',
        email: null,
        phone: '1234567890',
        address: 'Test Address',
        floor: 'Ground Floor',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
        notes: 'Test notes',
        status: 'Lead',
        source: 'billing_system',
        tags: ['Product Inquiry'], // Purpose of visit
        created_by: null
      }),
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', result);
  } catch (error) {
    console.error('Test error:', error);
  }
}

testCustomerCreation();
