const axios = require('axios');

async function testSuperAdmin() {
    console.log('Iniciando prueba de flujo SuperAdmin y RBAC...');
    try {
        // 1. Login SuperAdmin
        const loginRes = await axios.post('http://localhost:3000/api/v1/auth/sign-in', {
            username: 'superadmin', // REEMPLAZAR con un superadmin que no tenga company_users
            password: 'password_superadmin'
        });

        // Debería traer activeCompanyId = null
        const token = loginRes.data.body.token;
        const activeCompanyId = loginRes.data.body.user.activeCompanyId;
        console.log('1) Login SuperAdmin -> JWT recibido. activeCompanyId:', activeCompanyId === null ? 'null (OK)' : activeCompanyId);

        const config = { headers: { Authorization: `Bearer ${token}` } };

        // 2. Acceder a SaaS Admin (companies)
        try {
            const saasRes = await axios.get('http://localhost:3000/api/v1/saas/companies', config);
            console.log('2) /api/v1/saas/companies -> HTTP', saasRes.status, 'Total empresas:', saasRes.data.body.meta.total);
        } catch (e) {
            console.error('Error paso 2:', e.response?.data || e.message);
        }

        // 3. Acceder a POS Tenant route sin impersonar (debe fallar 400)
        try {
            await axios.get('http://localhost:3000/api/v1/products', config);
            console.error('3) ERROR: /api/v1/products funcionó y debió fallar con 400!');
        } catch (e) {
            if (e.response && e.response.status === 400) {
                console.log('3) /api/v1/products sin impersonar -> Recibido HTTP 400 (OK - Requiere companyId)');
            } else {
                console.error('Error paso 3 inesperado:', e.response?.data || e.message);
            }
        }

        // 4. Impersonar companyId = 1
        console.log('4) Impersonando companyId = 1...');
        const impersonateRes = await axios.post('http://localhost:3000/api/v1/auth/impersonate', { companyId: 1 }, config);
        const newToken = impersonateRes.data.body.token;
        console.log('   - Nuevo JWT recibido. activeCompanyId:', impersonateRes.data.body.user.activeCompanyId);

        const newConfig = { headers: { Authorization: `Bearer ${newToken}` } };

        // Intentar /api/v1/products nuevamente
        try {
            const prodRes = await axios.get('http://localhost:3000/api/v1/products', newConfig);
            console.log('   - /api/v1/products con token impersonado -> HTTP', prodRes.status, 'Productos listados:', prodRes.data.body.products?.length);
        } catch (e) {
            console.error('Error paso 4 products:', e.response?.data || e.message);
        }

        console.log('Prueba finalizada exitosamente.');

    } catch (err) {
        if (err.response && err.response.status === 401) {
            console.log('Setup de BD no coincide con las credenciales de prueba, actualiza "username" y "password" en el script.');
        } else {
            console.error('Crash del test script:', err.message);
        }
    }
}

testSuperAdmin();
