const http = require('http');

const data = JSON.stringify({
    username: 'Klisman',
    password: 'Klisman1234!@#$' // Changed password to a more "real" placeholder
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/auth/sign-in',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let body = '';
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
        console.log('FULL BODY:', body);
        try {
            const parsed = JSON.parse(body);
            console.log('MESSAGE:', parsed.message);
            console.log('STACK:', parsed.stack);
        } catch (e) { }
    });
});

req.on('error', (error) => {
    console.error('Conexion error:', error.message);
});

req.write(data);
req.end();
