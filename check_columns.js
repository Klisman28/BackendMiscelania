const { sequelize } = require('./libs/sequelize');

async function check() {
    try {
        const tables = ['users', 'employees', 'products', 'inventory_balances', 'inventory_movements'];
        for (const table of tables) {
            try {
                const [results] = await sequelize.query(`DESCRIBE \`${table}\``);
                const cols = results.map(r => r.Field);
                const hasCompanyId = cols.includes('company_id');
                console.log(`\n[${table}] columns:`, cols.join(', '));
                console.log(`  -> has company_id: ${hasCompanyId}`);
            } catch (e) {
                console.log(`\n[${table}] ERROR: ${e.message}`);
            }
        }
    } finally {
        await sequelize.close();
    }
}

check();
