const axios = require('axios');

async function runTest() {
    console.log('Iniciando Test de Aislamiento Tenant...');
    try {
        // Estas credenciales asumen que la DB local tiene UserA para la empresa 1 y UserB para la empresa 2.
        // MODIFICAR SEGÚN EL ENTORNO LOCAL.
        const loginA = await axios.post('http://localhost:3000/api/v1/auth/login', {
            username: 'adminA',
            password: 'passwordA'
        });
        const tokenA = loginA.data.token;

        console.log('User A logged in OK');

        const authConfigA = { headers: { Authorization: `Bearer ${tokenA}` } };

        const catData = { name: "Categoria Tenant A Secret", description: "This should not be seen by B", icon: "icon" };
        const createRes = await axios.post('http://localhost:3000/api/v1/categories', catData, authConfigA);
        const categoryId = createRes.data.body.id;
        console.log('Categoria creada en Tenant A con ID:', categoryId);

        const loginB = await axios.post('http://localhost:3000/api/v1/auth/login', {
            username: 'adminB',
            password: 'passwordB'
        });
        const tokenB = loginB.data.token;
        const authConfigB = { headers: { Authorization: `Bearer ${tokenB}` } };
        console.log('User B logged in OK');

        const listRes = await axios.get('http://localhost:3000/api/v1/categories', authConfigB);
        const found = listRes.data.body.categories.find(c => c.id === categoryId);
        if (found) {
            console.error('❌ FAILURE: User B can see User A categoria!');
        } else {
            console.log('✅ PASS: User B no puede ver la categoría en listado general.');
        }

        try {
            await axios.get(`http://localhost:3000/api/v1/categories/${categoryId}`, authConfigB);
            console.error('❌ FAILURE: User B can do GET BY ID directly!');
        } catch (e) {
            if (e.response && e.response.status === 404) {
                console.log('✅ PASS: User B receives 404 on direct GET.');
            } else {
                console.error('Unexpected error code on direct GET:', e.response?.status);
            }
        }

        const spoofCat = {
            name: 'Spoofed B Category',
            companyId: 1 // Attempting to inject into company 1
        };

        console.log('Attempting to create category with spoofed companyId=1 for User B...');
        const spoofRes = await axios.post('http://localhost:3000/api/v1/categories', spoofCat, authConfigB);
        console.log('✅ PASS: Create success. Now verifying it ignored the companyId payload.');
        const newId = spoofRes.data.body.id;

        // Verificar si User A lo tiene (no debería tenerlo)
        try {
            await axios.get(`http://localhost:3000/api/v1/categories/${newId}`, authConfigA);
            console.error('❌ FAILURE: spoofed category went to User A!');
        } catch (e) {
            if (e.response && e.response.status === 404) {
                console.log('✅ PASS: Spoofed category did NOT go to User A.');
            }
        }

        console.log('All tests finished.');

    } catch (err) {
        if (err.response && err.response.status === 401) {
            console.log('Setup de BD no coincide con las credenciales de prueba, por favor actualiza las credenciales en este script.');
        } else {
            console.error('Test script crashed:', err.message);
        }
    }
}

runTest();
