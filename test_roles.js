const axios = require('axios');

async function testRoles() {
    try {
        console.log("---- Testing Roles API ----");

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

        // Test GET
        const resGet = await api.get('/roles');
        console.log("GET /roles -> Result:", resGet.data.body);

        // Test POST
        const resPost = await api.post('/roles', { name: 'ROL_TEST_123' });
        const newRoleId = resPost.data.body.id;
        console.log("POST /roles -> Created:", newRoleId);

        // Test PATCH
        await api.patch(`/roles/${newRoleId}`, { name: 'ROL_TEST_UPDATED' });
        console.log("PATCH /roles -> Updated name.");

        // Test DELETE
        await api.delete(`/roles/${newRoleId}`);
        console.log("DELETE /roles -> Success.");

    } catch (e) {
        console.error("Test error:", e.response ? e.response.data : e.message);
    }
}

testRoles();
