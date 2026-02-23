const { models } = require('../libs/sequelize');
const bcrypt = require('bcrypt');

async function seedSuperAdmin() {
    try {
        console.log('--- Iniciando Seed ---');

        // 1. Company
        // Intentamos buscar por ID 1
        let company = await models.Company.findByPk(1);
        if (!company) {
            // Si no existe, creamos
            /* Nota: Sequelize no garantiza ID 1 en auto-increment si ya hubo borrados, 
               pero intentaremos forzarlo si el dialecto lo permite, o simplemente crear uno nuevo. */
            console.log('Creando Company ID 1...');
            // En MySQL podemos forzar ID si no está ocupado
            company = await models.Company.create({
                id: 1,
                name: 'SaaS Superadmin',
                slug: 'saas-admin',
                plan: 'enterprise',
                seats: 999,
                status: 'active'
            });
        } else {
            console.log(`Company ID 1 encontrada: ${company.name}`);
        }

        // 2. Employee
        // Incluimos campos obligatorios según describeTable: name, first_lastname, second_lastname, fullname, dni
        let [employee, createdEmployee] = await models.Employee.findOrCreate({
            where: { dni: 'SUPERADMIN-001' },
            defaults: {
                name: 'Super',
                firstLastname: 'Admin',
                secondLastname: 'SaaS',
                fullname: 'Super Admin SaaS',
                dni: 'SUPERADMIN-001',
                email: 'admin@saas.com',
                companyId: company.id
            }
        });
        console.log(`Employee ID ${employee.id} (Created: ${createdEmployee})`);

        // 3. User
        const passwordHash = await bcrypt.hash('password123', 10);
        let [user, createdUser] = await models.User.findOrCreate({
            where: { username: 'superadmin' },
            defaults: {
                password: passwordHash,
                // email: 'admin@saas.com', // User model might not have email field distinct from Employee depending on schema version
                status: true,
                companyId: company.id,
                userableId: employee.id,
                userableType: 'Employee'
            }
        });
        console.log(`User ID ${user.id} (Created: ${createdUser})`);

        if (!createdUser) {
            // Si ya existía, actualizamos password y company para asegurar acceso
            console.log('Actualizando usuario existente...');
            await user.update({
                password: passwordHash,
                companyId: company.id,
                status: true,
                userableId: employee.id,
                userableType: 'Employee'
            });
        }

        // 4. Role
        let [role] = await models.Role.findOrCreate({ where: { name: 'admin' } });
        // Verificamos si ya tiene el rol
        const hasRole = await user.hasRole(role);
        if (!hasRole) {
            await user.addRole(role);
            console.log('Rol asignado.');
        } else {
            console.log('Ya tiene rol admin.');
        }

        console.log('--- Seed Completado Exitosamente ---');
        process.exit(0);
    } catch (error) {
        console.error('SEED ERROR:', error);
        process.exit(1);
    }
}

// Ejecutar
console.log('Esperando conexión a BD...');
setTimeout(() => {
    seedSuperAdmin();
}, 2000);
