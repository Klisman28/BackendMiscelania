(async () => {
    try {
        const res = await fetch('http://localhost:3000/api/v1/saas/companies/14/status', {
            method: 'OPTIONS',
            headers: {
                'Origin': 'http://localhost:3005',
                'Access-Control-Request-Method': 'PATCH',
                'Access-Control-Request-Headers': 'Authorization, Content-Type'
            }
        });

        console.log('OPTIONS status:', res.status);
        res.headers.forEach((v, k) => console.log(`${k}: ${v}`));

        const loginRes = await fetch('http://localhost:3000/api/v1/auth/sign-in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'superadmin', password: 'password_superadmin' })
        });
        const loginData = await loginRes.json();
        const token = loginData.body.token;

        const patchRes = await fetch('http://localhost:3000/api/v1/saas/companies/14/status', {
            method: 'PATCH',
            headers: {
                'Origin': 'http://localhost:3005',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: 'suspended' })
        });

        console.log('\nPATCH status:', patchRes.status);
        patchRes.headers.forEach((v, k) => console.log(`${k}: ${v}`));
        const text = await patchRes.text();
        console.log('PATCH body:', text);
    } catch (e) {
        console.error(e);
    }
})();
