
const { models } = require('../libs/sequelize');

async function checkUser() {
    try {
        console.log('Buscando usuario superadmin...');
        const user = await models.User.findOne({
            where: { username: 'superadmin' },
            include: ['employee', 'roles']
        });

        if (user) {
            console.log('Encontrado:', user.toJSON());
            console.log('Password Hash:', user.password);
        } else {
            console.log('Usuario superadmin NO encontrado.');

            // Listar todos los usuarios para ver qué hay
            const allUsers = await models.User.findAll({ attributes: ['id', 'username'] });
            console.log('Usuarios existentes:', allUsers.map(u => u.username));
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

setTimeout(() => {
    checkUser().then(() => process.exit(0));
}, 1000);
