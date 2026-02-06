// Test script for warehouse stock pagination
// Usage: node test-stock-pagination.js

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';
const WAREHOUSE_ID = 1; // Change this to an existing warehouse ID

async function testStockPagination() {
    console.log('🧪 Testing Warehouse Stock Pagination\n');
    console.log('='.repeat(60));

    try {
        // Test 1: Basic request (default pagination)
        console.log('\n✅ Test 1: Basic request (default pageSize=10)');
        const test1 = await axios.get(`${BASE_URL}/warehouses/${WAREHOUSE_ID}/stock`);
        console.log(`   Response: ${test1.data.data.length} items, total: ${test1.data.total}`);
        console.log(`   First item:`, test1.data.data[0]?.product?.name || 'N/A');

        // Test 2: Page 1 with pageSize 5
        console.log('\n✅ Test 2: Page 1 with pageSize=5');
        const test2 = await axios.get(`${BASE_URL}/warehouses/${WAREHOUSE_ID}/stock`, {
            params: { pageSize: 5 }
        });
        console.log(`   Response: ${test2.data.data.length} items, total: ${test2.data.total}`);
        console.log(`   Items on page 1:`, test2.data.data.map(i => i.product.name).join(', '));

        // Test 3: Page 2 with pageSize 5 (items 6-10)
        console.log('\n✅ Test 3: Page 2 with pageSize=5 (should show items 6-10)');
        const test3 = await axios.get(`${BASE_URL}/warehouses/${WAREHOUSE_ID}/stock`, {
            params: { pageIndex: 2, pageSize: 5 }
        });
        console.log(`   Response: ${test3.data.data.length} items, total: ${test3.data.total}`);
        console.log(`   Items on page 2:`, test3.data.data.map(i => i.product.name).join(', '));
        console.log(`   ⚠️  Total should match page 1: ${test2.data.total === test3.data.total ? 'PASS ✓' : 'FAIL ✗'}`);

        // Test 4: Using alias parameters (page and limit)
        console.log('\n✅ Test 4: Using alias parameters (page=2, limit=5)');
        const test4 = await axios.get(`${BASE_URL}/warehouses/${WAREHOUSE_ID}/stock`, {
            params: { page: 2, limit: 5 }
        });
        console.log(`   Response: ${test4.data.data.length} items, total: ${test4.data.total}`);
        console.log(`   ⚠️  Should match Test 3: ${JSON.stringify(test3.data.data) === JSON.stringify(test4.data.data) ? 'PASS ✓' : 'FAIL ✗'}`);

        // Test 5: With search filter
        if (test1.data.data.length > 0) {
            const firstProductName = test1.data.data[0].product.name;
            const searchTerm = firstProductName.substring(0, 3);
            console.log(`\n✅ Test 5: Search by product name (search="${searchTerm}")`);
            const test5 = await axios.get(`${BASE_URL}/warehouses/${WAREHOUSE_ID}/stock`, {
                params: { search: searchTerm }
            });
            console.log(`   Response: ${test5.data.data.length} items, total: ${test5.data.total}`);
            console.log(`   ⚠️  Total should be <= original: ${test5.data.total <= test1.data.total ? 'PASS ✓' : 'FAIL ✗'}`);
        }

        // Test 6: Sort by quantity ascending
        console.log('\n✅ Test 6: Sort by quantity ascending');
        const test6 = await axios.get(`${BASE_URL}/warehouses/${WAREHOUSE_ID}/stock`, {
            params: {
                pageSize: 5,
                sort: JSON.stringify([{ key: 'quantity', order: 'asc' }])
            }
        });
        console.log(`   Response: ${test6.data.data.length} items, total: ${test6.data.total}`);
        const quantities = test6.data.data.map(i => i.quantity);
        console.log(`   Quantities:`, quantities.join(', '));
        const isAscending = quantities.every((val, i, arr) => i === 0 || arr[i - 1] <= val);
        console.log(`   ⚠️  Should be ascending: ${isAscending ? 'PASS ✓' : 'FAIL ✗'}`);

        // Test 7: Sort by product name
        console.log('\n✅ Test 7: Sort by product name descending');
        const test7 = await axios.get(`${BASE_URL}/warehouses/${WAREHOUSE_ID}/stock`, {
            params: {
                pageSize: 5,
                sort: JSON.stringify([{ key: 'product.name', order: 'desc' }])
            }
        });
        console.log(`   Response: ${test7.data.data.length} items, total: ${test7.data.total}`);
        console.log(`   Products:`, test7.data.data.map(i => i.product.name).join(', '));

        // Test 8: Invalid warehouse ID (should return 404)
        console.log('\n✅ Test 8: Invalid warehouse ID (expect 404)');
        try {
            await axios.get(`${BASE_URL}/warehouses/99999/stock`);
            console.log('   ❌ FAIL - Should have thrown 404 error');
        } catch (error) {
            console.log(`   ✓ PASS - Got expected error: ${error.response?.status} ${error.response?.statusText}`);
        }

        // Test 9: Invalid pagination parameters
        console.log('\n✅ Test 9: Invalid pageIndex=0 (expect 400)');
        try {
            await axios.get(`${BASE_URL}/warehouses/${WAREHOUSE_ID}/stock`, {
                params: { pageIndex: 0 }
            });
            console.log('   ❌ FAIL - Should have thrown 400 error');
        } catch (error) {
            console.log(`   ✓ PASS - Got expected error: ${error.response?.status} ${error.response?.data?.message || error.message}`);
        }

        // Test 10: PageSize exceeding max (should cap at 100)
        console.log('\n✅ Test 10: pageSize=150 (should cap at 100)');
        const test10 = await axios.get(`${BASE_URL}/warehouses/${WAREHOUSE_ID}/stock`, {
            params: { pageSize: 150 }
        });
        console.log(`   Response: ${test10.data.data.length} items (max 100), total: ${test10.data.total}`);
        console.log(`   ⚠️  Items count should be <= 100: ${test10.data.data.length <= 100 ? 'PASS ✓' : 'FAIL ✗'}`);

        console.log('\n' + '='.repeat(60));
        console.log('✅ All tests completed!');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n❌ Test failed:', error.response?.data || error.message);
        console.error('   Make sure the server is running and warehouse ID exists');
    }
}

// Run tests
testStockPagination();
