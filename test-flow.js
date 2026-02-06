// Helper for fetch
const fetch = global.fetch;

// Config
const BASE_URL = 'http://localhost:3000/api/v1';
const WAREHOUSE_ID = 1; // Assuming Warehouse 1 exists

// Helper to generate unique SKU
const generateSku = () => `TEST-${Math.floor(Math.random() * 100000)}`;

async function request(url, method = 'GET', body = null, token = null) {
    const headers = {
        'Content-Type': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = {
        method,
        headers
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(url, options);
    let data = {};
    const text = await res.text();
    try {
        data = JSON.parse(text);
    } catch (e) {
        data = { text };
    }

    if (!res.ok) {
        const error = new Error(`Request failed: ${res.status} ${res.statusText}`);
        error.response = { status: res.status, data };
        throw error;
    }

    return { data };
}

async function runTests() {
    console.log('🚀 Starting Product & Inventory Flow Tests (using native fetch)...\n');

    try {
        // 0. Login to get Token
        console.log('🔐 Authenticating...');
        const loginPayload = {
            username: 'admin',
            password: '12341234'
        };

        let token = '';
        try {
            const loginRes = await request(`${BASE_URL}/auth/sign-in`, 'POST', loginPayload);
            const body = loginRes.data.body || loginRes.data;
            token = body.token || body.access_token;
            console.log('✅ Authenticated.');
        } catch (e) {
            console.error('❌ Login failed (expected if creds wrong):', e.response?.data || e.message);
            console.log('   Continuing assuming auth is disabled on server...');
        }

        // 1. Get dependencies (Brand, Subcategory, Unit)
        console.log('\n📦 Fetching dependencies...');
        const brandId = 1;
        const subcategoryId = 1;
        const unitId = 1;

        // 2. Create Product
        const newSku = generateSku();
        const productPayload = {
            name: `Test Product ${newSku}`,
            sku: newSku,
            price: 1500.00,
            cost: 1000.00,
            stock: 0,
            stockMin: 5,
            brandId,
            subcategoryId,
            unitId,
            utility: 500.00
        };

        console.log(`\n🆕 Creating Product: ${newSku}...`);
        let productId;
        try {
            const res = await request(`${BASE_URL}/products`, 'POST', productPayload, token);
            console.log('✅ Product created:', res.data.message || 'Success');
            productId = res.data.body?.id || res.data.id;
        } catch (err) {
            console.error('❌ Failed to create product:', err.response?.data || err.message);
            if (err.response?.status === 409) console.log('   (SKU Conflict - expected if re-running)');
        }

        if (!productId) {
            console.error('❌ Could not get new Product ID. Aborting.');
            return;
        }

        // 3. Add Stock (Inventory In)
        console.log(`\n📥 Adding Stock (20 units) to Warehouse ${WAREHOUSE_ID}...`);
        const inPayload = {
            warehouseId: WAREHOUSE_ID,
            productId: productId,
            quantity: 20,
            description: "Initial Stock Load"
        };

        try {
            const resIn = await request(`${BASE_URL}/inventory/in`, 'POST', inPayload, token);
            console.log('✅ Stock added:', resIn.data.message || 'Success');
        } catch (err) {
            console.error('❌ Failed to add stock:', err.response?.data || err.message);
        }

        // 4. Verify Balance
        console.log(`\n🔍 Verifying Stock Level...`);
        // Note: Search param needs URL encoding if complex, but simple SKU is fine.
        const resStock = await request(`${BASE_URL}/warehouses/${WAREHOUSE_ID}/stock?search=${newSku}`, 'GET', null, token);

        const items = resStock.data.data || [];
        const item = items.find(i => i.product.sku === newSku);
        if (item) {
            console.log(`✅ Balance found: ${item.quantity} units (Expected 20)`);
        } else {
            console.log(`❌ Balance record not found for ${newSku}`);
            console.log('   Results:', JSON.stringify(items.slice(0, 3)));
        }

        // 5. Verify Movements
        console.log(`\n📜 Checking Movements Log...`);
        try {
            const resMovements = await request(`${BASE_URL}/inventory/movements?productId=${productId}&warehouseId=${WAREHOUSE_ID}&type=IN`, 'GET', null, token);

            if (resMovements.data.length > 0) {
                console.log(`✅ Movement found: ${resMovements.data[0].description} - ${resMovements.data[0].quantity}`);
            } else {
                console.log(`❌ No movement record found.`);
            }
        } catch (e) {
            console.error('❌ Failed to get movements:', e.response?.data || e.message);
        }

        // 6. Test Product Search
        console.log(`\n🔎 Testing Product Search...`);
        const resSearch = await request(`${BASE_URL}/products?search=${newSku}`, 'GET', null, token);

        // Check structure of search response
        const searchBody = resSearch.data.body || resSearch.data;
        const searchResults = searchBody.products || searchBody;
        console.log(`✅ Search result count: ${searchResults.length || 0}`);

    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

runTests();
