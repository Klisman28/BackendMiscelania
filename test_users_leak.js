// Testing User Scoping
const axios = require('axios');

async function testUsersLeak() {
    try {
        console.log("---- Testing User Scoping ----");

        // 1. Iniciar sesión como superadmin global
        const res1 = await axios.post('http://localhost:3000/api/v1/auth/sign-in', {
            username: 'superadmin',
            password: 'password_superadmin'
        });
        const globalToken = res1.data.body.token;

        console.log("Global Token obtained.");

        // Tratar de pedir /api/v1/users => debería fallar porque req.companyId == null y tenantGuard lo bloquea (requires companyId)
        try {
            await axios.get('http://localhost:3000/api/v1/users', {
                headers: { Authorization: `Bearer ${globalToken}` }
            });
            console.error("FAIL: Superadmin global allowed to access tenant endpoint /users without companyId!");
        } catch (e) {
            console.log("OK: Global superadmin blocked from /users ->", e.response.status, e.response.data.message);
        }

        // 2. Impersonate company 13 (or 1)
        const res2 = await axios.post('http://localhost:3000/api/v1/auth/impersonate', { companyId: 1 }, {
            headers: { Authorization: `Bearer ${globalToken}` }
        });
        const tenantToken = res2.data.body.token;
        console.log("Impersonate Token obtained for company 1.");

        // Consultar /api/v1/users 
        const usersReq = await axios.get('http://localhost:3000/api/v1/users', {
            headers: { Authorization: `Bearer ${tenantToken}` }
        });

        console.log(`OK: Users fetched for company 1 -> Total: ${usersReq.data.body.totalUsers}, Retrieved: ${usersReq.data.body.users?.length}`);

    } catch (e) {
        console.error("Test error:", e.message);
        if (e.response) {
            console.error("Status:", e.response.status, e.response.data);
        }
    }
}

testUsersLeak();
