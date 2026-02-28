const axios = require('axios');

async function testSaasUsers() {
    try {
        console.log("---- Testing SaaS Users Payload Enrichment ----");

        // 1. Iniciar sesión como superadmin
        const res1 = await axios.post('http://localhost:3000/api/v1/auth/sign-in', {
            username: 'superadmin',
            password: 'password_superadmin'
        });
        const globalToken = res1.data.body.token;
        console.log("Global Token obtained.");

        const api = axios.create({
            baseURL: 'http://localhost:3000/api/v1/saas',
            headers: { Authorization: `Bearer ${globalToken}` }
        });

        // Test GET /users
        const resGet = await api.get('/users?limit=3');
        console.log("\nGET /users -> data structure:\n", JSON.stringify(resGet.data.body, null, 2));

    } catch (e) {
        console.error("Test error:", e.response ? e.response.data : e.message);
    }
}

testSaasUsers();
