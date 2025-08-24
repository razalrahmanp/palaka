// Test script to check for recently added products
const testRecentProducts = async () => {
  console.log('🔍 Testing Recent Products Discovery...\n');

  const tests = [
    {
      name: 'Default API Call (first 20 products)',
      url: 'http://localhost:3000/api/products',
    },
    {
      name: 'Large limit (1000 products)',
      url: 'http://localhost:3000/api/products?limit=1000',
    },
    {
      name: 'Paginated - Page 2',
      url: 'http://localhost:3000/api/products?page=2&limit=20',
    },
    {
      name: 'Search test (if you know a recent product name)',
      url: 'http://localhost:3000/api/products?search=SOFA',
    }
  ];

  for (const test of tests) {
    console.log(`🧪 ${test.name}`);
    console.log(`   URL: ${test.url}`);
    
    try {
      const response = await fetch(test.url);
      const data = await response.json();
      
      if (response.ok) {
        const products = data.products || [];
        console.log(`   ✅ Status: ${response.status}`);
        console.log(`   📊 Found: ${products.length} products`);
        console.log(`   📄 Total in DB: ${data.pagination?.total || 'N/A'}`);
        console.log(`   📈 Pages: ${data.pagination?.totalPages || 'N/A'}`);
        
        if (products.length > 0) {
          // Show first 3 products with creation dates
          console.log(`   🔝 First 3 products:`);
          products.slice(0, 3).forEach((product, idx) => {
            const createdDate = product.product_created_at || product.updated_at || 'Unknown';
            console.log(`      ${idx + 1}. ${product.product_name} (Created: ${createdDate})`);
          });
          
          // Show last 3 products
          if (products.length > 3) {
            console.log(`   🔽 Last 3 products:`);
            products.slice(-3).forEach((product, idx) => {
              const createdDate = product.product_created_at || product.updated_at || 'Unknown';
              console.log(`      ${products.length - 2 + idx}. ${product.product_name} (Created: ${createdDate})`);
            });
          }
        }
      } else {
        console.log(`   ❌ Error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`   💥 Exception: ${error.message}`);
    }
    
    console.log('');
  }

  // Additional test: Check if there are any products created today
  console.log('🗓️  Checking for today\'s products...');
  try {
    const response = await fetch('http://localhost:3000/api/products?limit=1000');
    const data = await response.json();
    
    if (response.ok && data.products) {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const todaysProducts = data.products.filter(product => {
        const createdDate = product.product_created_at || product.updated_at;
        return createdDate && createdDate.startsWith(today);
      });
      
      console.log(`   📅 Products created today (${today}): ${todaysProducts.length}`);
      if (todaysProducts.length > 0) {
        todaysProducts.forEach((product, idx) => {
          console.log(`      ${idx + 1}. ${product.product_name} (${product.product_created_at})`);
        });
      }
    }
  } catch (error) {
    console.log(`   💥 Error checking today's products: ${error.message}`);
  }

  console.log('\n💡 Recommendations:');
  console.log('   1. Check if recently added products appear in the first page');
  console.log('   2. If not, they might be on later pages - check pagination');
  console.log('   3. Try searching for the specific product name');
  console.log('   4. Verify the product was actually saved to the database');
  console.log('   5. Check if there are any caching issues in the frontend');
};

testRecentProducts();
