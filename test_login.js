const axios = require('axios');

async function testLogin() {
    try {
        const res = await axios.post('http://localhost:3000/api/v1/auth/sign-in', {
            username: 'Klisman',
            password: 'wrongpassword' // Solo quiero provocar que llegue al getUser
        }, {
            validateStatus: () => true // No lanzar error en 401/500
        });
        console.log('Status:', res.status);
        console.log('Data:', JSON.stringify(res.data, null, 2));
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('Server is down or not on port 3000');
        } else {
            console.log('Error:', error.message);
        }
    }
}

testLogin();
