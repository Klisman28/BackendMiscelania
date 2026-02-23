const { Sequelize } = require('sequelize');
const config = require('./config/config');

const env = 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
    host: dbConfig.host,
    dialect: dbConfig.dialect
});

async function checkUsersTable() {
    try {
        const [results, metadata] = await sequelize.query("DESCRIBE users;");
        console.log(JSON.stringify(results, null, 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

checkUsersTable();
