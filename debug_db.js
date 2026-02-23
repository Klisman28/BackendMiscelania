const { Sequelize, DataTypes } = require('sequelize');
// Configuración hardcodeada para evitar problemas de importación de config
// Asumo desarrollo local estándar o variables de entorno si están seteadas
const database = process.env.DB_NAME || 'my_store';
const username = process.env.DB_USER || 'root';
const password = process.env.DB_PASSWORD || '';
const host = process.env.DB_HOST || 'localhost';
const dialect = 'mysql';

console.log(`Connecting to ${database} as ${username}...`);

const sequelize = new Sequelize(database, username, password, {
    host,
    dialect,
    logging: console.log
});

const User = sequelize.define('User', {
    id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
    },
    username: {
        allowNull: false,
        type: DataTypes.STRING,
        unique: true,
    },
    companyId: {
        field: 'company_id',
        type: DataTypes.INTEGER
    }
}, {
    tableName: 'users',
    timestamps: true // Ajustar según realidad, pero para leer sirve
});

async function test() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        // Intentar leer un usuario
        const user = await User.findOne({
            where: { username: 'Klisman' } // Asumiendo que este user existe
        });

        if (user) {
            console.log('User found:', user.toJSON());
            console.log('Company ID:', user.companyId);
        } else {
            console.log('User Klisman not found. Trying findOne without where...');
            const anyUser = await User.findOne();
            if (anyUser) {
                console.log('Any user found:', anyUser.toJSON());
            } else {
                console.log('No users found in table.');
            }
        }

    } catch (error) {
        console.error('Unable to connect to the database or query failed:', error);
    } finally {
        await sequelize.close();
    }
}

test();
