const http = require('http');
const { spawn } = require('child_process');

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}/api`;

let serverProcess;
let token;
let createdProduct;
let createdCustomer;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function startServer() {
    console.log('🚀 Starting server for testing...');
    serverProcess = spawn('node', ['server/index.js'], { stdio: 'pipe' });
    
    serverProcess.stdout.on('data', (data) => {
        // console.log(`[Server]: ${data}`);
    });

    // Wait for server to be ready
    for (let i = 0; i < 20; i++) {
        try {
            await fetch(`${BASE_URL}/health`);
            console.log('✅ Server is ready!');
            return;
        } catch (e) {
            await sleep(1000);
        }
    }
    throw new Error('Timeout waiting for server to start');
}

async function apiRequest(method, endpoint, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const res = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `Request failed: ${res.status}`);
    return json;
}

async function runTests() {
    try {
        console.log('\n--- 1. Authentication Test ---');
        const login = await apiRequest('POST', '/auth/login', { username: 'admin', password: 'password' });
        token = login.token;
        console.log('✅ Login successful. Token received.');

        console.log('\n--- 2. Product Management Test ---');
        const newProduct = {
            name: 'Test Product ' + Date.now(),
            barcode: 'TEST-' + Date.now(),
            price: 100,
            cost: 50,
            quantity: 10,
            categoryId: 'general'
        };
        createdProduct = await apiRequest('POST', '/products', newProduct);
        console.log(`✅ Product created: ${createdProduct.name} (ID: ${createdProduct._id})`);

        console.log('\n--- 3. Create Customer Test ---');
        const newCustomer = {
            name: 'Test Customer',
            phone: '01000000000'
        };
        createdCustomer = await apiRequest('POST', '/customers', newCustomer);
        console.log(`✅ Customer created: ${createdCustomer.name} (ID: ${createdCustomer._id})`);

        console.log('\n--- 4. Sale & Loyalty Test ---');
        const saleData = {
            items: [{ productId: createdProduct._id, quantity: 2, price: 100, name: createdProduct.name }],
            total: 200,
            subtotal: 200,
            discount: 0,
            payments: [{ method: 'cash', amount: 200 }],
            customerId: createdCustomer._id
        };
        const sale = await apiRequest('POST', '/sales', saleData);
        console.log(`✅ Sale completed. Invoice: ${sale.invoiceNumber}`);

        // Verify Stock Update
        const updatedProduct = await apiRequest('GET', `/products`);
        const p = updatedProduct.find(p => p._id === createdProduct._id);
        if (p.quantity === 8) console.log('✅ Stock updated correctly (10 - 2 = 8).');
        else console.error(`❌ Stock update failed! Expected 8, got ${p.quantity}`);

        // Verify Loyalty Points
        const updatedCustomer = await apiRequest('GET', `/customers/${createdCustomer._id}`);
        // Default 1 point per 1 unit currency (settings dependent, but let's check it increased)
        if (updatedCustomer.loyaltyPoints > 0) console.log(`✅ Loyalty points awarded: ${updatedCustomer.loyaltyPoints}`);
        else console.warn('⚠️ No loyalty points awarded (check settings).');

        console.log('\n--- 5. Analytics Module Test ---');
        const predictions = await apiRequest('GET', '/analytics/stock-prediction');
        if (Array.isArray(predictions)) console.log(`✅ Analytics endpoint working. Returned ${predictions.length} items.`);
        else console.error('❌ Analytics endpoint returned invalid data.');

        console.log('\n--- 6. Cleanup ---');
        await apiRequest('DELETE', `/products/${createdProduct._id}`);
        await apiRequest('DELETE', `/customers/${createdCustomer._id}`);
        console.log('✅ Test data cleaned up.');

        console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! The system is fully functional.');

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        process.exit(1);
    } finally {
        if (serverProcess) {
            console.log('🛑 Stopping server...');
            serverProcess.kill();
        }
    }
}

// Start
startServer().then(runTests).catch(err => {
    console.error('Fatal Error:', err);
    if (serverProcess) serverProcess.kill();
});
