const { sequelize, models } = require('./libs/sequelize');

async function run() {
    console.log("=========================================");
    console.log("INICIANDO RECONCILIACIÓN DE INVENTARIO...");
    console.log("=========================================\n");

    const transaction = await sequelize.transaction();
    try {
        const products = await models.Product.findAll({ transaction });
        let updatedCount = 0;

        console.log(`Se encontraron ${products.length} productos para analizar.\n`);

        for (const product of products) {
            // Calculate sum from precisely matching inventory balances
            const sum = await models.InventoryBalance.sum('quantity', {
                where: {
                    productId: product.id,
                    companyId: product.companyId
                },
                transaction
            });

            const actualSum = sum || 0;

            // Reconcile and report changes
            if (product.stock !== actualSum) {
                console.log(`[DESCUADRE DETECTADO] Producto ID: ${product.id} - ${product.name}`);
                console.log(`   Stock Global Actual : ${product.stock}`);
                console.log(`   Suma Real Bodegas   : ${actualSum}`);
                console.log(`   Diferencia / Fuga   : ${product.stock - actualSum}`);
                console.log(`   --> Actualizando a  : ${actualSum}\n`);

                await product.update(
                    { stock: actualSum },
                    { transaction, hooks: false }
                );

                updatedCount++;
            }
        }

        await transaction.commit();

        console.log("=========================================");
        console.log(" RECONCILIACIÓN COMPLETADA CON ÉXITO");
        console.log(` Total de productos corregidos: ${updatedCount}`);
        console.log("=========================================\n");
        process.exit(0);

    } catch (err) {
        console.error("\n❌ Error grave durante la reconciliación:", err.message);
        await transaction.rollback();
        process.exit(1);
    }
}

run();
