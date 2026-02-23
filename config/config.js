require('dotenv').config();

module.exports = {
    development: {
        username: process.env.DB_USER || 'u530329005_react1',
        password: process.env.DB_PASSWORD || '#Klisman1234',
        database: process.env.DB_NAME || 'u530329005_react1',
        host: process.env.DB_HOST || '109.106.251.202',
        dialect: 'mysql',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
    },
    test: {
        username: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || null,
        database: process.env.DB_NAME || 'database_test',
        host: '127.0.0.1',
        dialect: 'mysql'
    },
    production: {
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        dialect: 'mysql',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
    }
};
