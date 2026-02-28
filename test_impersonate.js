(async () => {
    try {
        const loginRes = await fetch('http://localhost:3000/api/v1/auth/sign-in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'superadmin', password: 'password_superadmin' })
        });
        const loginData = await loginRes.json();
        const token = loginData.body.token;
        console.log("LOGIN TOKEN:", JSON.stringify(loginData.body.user));

        const impersonateRes = await fetch('http://localhost:3000/api/v1/auth/impersonate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ companyId: 13 })
        });

        const impersonateData = await impersonateRes.json();
        console.log("IMPERSONATE RESPONSE:", JSON.stringify(impersonateData));
        const impersonateToken = impersonateData.body?.token;

        if (impersonateToken) {
            const prodRes = await fetch('http://localhost:3000/api/v1/products', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${impersonateToken}` }
            });
            console.log("PRODUCTS STATUS:", prodRes.status);
            const text = await prodRes.text();
            console.log("PRODUCTS RESPONSE:", text.substring(0, 100)); // only first 100 chars
        }
    } catch (e) {
        console.error(e);
    }
})();
