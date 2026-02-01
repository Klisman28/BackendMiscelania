'use strict';

const { DataTypes } = require('sequelize');

const WAREHOUSE_TABLE = 'warehouses';
const INVENTORY_BALANCE_TABLE = 'inventory_balances';
const INVENTORY_MOVEMENT_TABLE = 'inventory_movements';
const TRANSFER_TABLE = 'transfers';
const TRANSFER_ITEM_TABLE = 'transfer_items';
const SALE_TABLE = 'sales';
const PRODUCT_TABLE = 'products';

module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Create Warehouse Table
        await queryInterface.createTable(WAREHOUSE_TABLE, {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: DataTypes.INTEGER
            },
            name: {
                allowNull: false,
                type: DataTypes.STRING,
                unique: true
            },
            address: {
                allowNull: true,
                type: DataTypes.STRING
            },
            active: {
                allowNull: false,
                type: DataTypes.BOOLEAN,
                defaultValue: true
            }
        });

        // 2. Insert Default Warehouse
        await queryInterface.bulkInsert(WAREHOUSE_TABLE, [{
            name: 'Main Warehouse',
            address: 'Main Location',
            active: true
        }]);

        // 3. Create Inventory Balance Table
        await queryInterface.createTable(INVENTORY_BALANCE_TABLE, {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: DataTypes.INTEGER
            },
            productId: {
                field: 'product_id',
                allowNull: false,
                type: DataTypes.INTEGER,
                references: {
                    model: PRODUCT_TABLE,
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            warehouseId: {
                field: 'warehouse_id',
                allowNull: false,
                type: DataTypes.INTEGER,
                references: {
                    model: WAREHOUSE_TABLE,
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            quantity: {
                allowNull: false,
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            createdAt: {
                allowNull: false,
                type: DataTypes.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updatedAt: {
                allowNull: false,
                type: DataTypes.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        // Add unique constraint
        await queryInterface.addConstraint(INVENTORY_BALANCE_TABLE, {
            fields: ['product_id', 'warehouse_id'],
            type: 'unique',
            name: 'unique_inventory_balance_product_warehouse'
        });

        // 4. Migrate Data: Move stock from Product table to InventoryBalance (Main Warehouse)
        // We need to fetch all products first. 
        // Since we can't reliably use models here, we use raw query.
        const [products] = await queryInterface.sequelize.query(
            `SELECT id, stock FROM ${PRODUCT_TABLE}`
        );

        if (products.length > 0) {
            const inventoryRecords = products.map(product => ({
                product_id: product.id,
                warehouse_id: 1, // Main Warehouse ID is 1 (auto-increment) because we just inserted it
                quantity: product.stock || 0,
                createdAt: new Date(),
                updatedAt: new Date()
            }));

            await queryInterface.bulkInsert(INVENTORY_BALANCE_TABLE, inventoryRecords);
        }

        // 5. Create Inventory Movement Table
        await queryInterface.createTable(INVENTORY_MOVEMENT_TABLE, {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: DataTypes.INTEGER
            },
            productId: {
                field: 'product_id',
                allowNull: false,
                type: DataTypes.INTEGER,
                references: {
                    model: PRODUCT_TABLE,
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            warehouseId: {
                field: 'warehouse_id',
                allowNull: false,
                type: DataTypes.INTEGER,
                references: {
                    model: WAREHOUSE_TABLE,
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            type: {
                allowNull: false,
                type: DataTypes.STRING,
            },
            quantity: {
                allowNull: false,
                type: DataTypes.INTEGER
            },
            referenceId: {
                field: 'reference_id',
                allowNull: true,
                type: DataTypes.STRING
            },
            description: {
                type: DataTypes.STRING,
                allowNull: true
            },
            userId: {
                field: 'user_id',
                type: DataTypes.INTEGER,
                allowNull: true
            },
            createdAt: {
                allowNull: false,
                type: DataTypes.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        // 6. Create Transfer Table
        await queryInterface.createTable(TRANSFER_TABLE, {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: DataTypes.INTEGER
            },
            fromWarehouseId: {
                field: 'from_warehouse_id',
                allowNull: false,
                type: DataTypes.INTEGER,
                references: {
                    model: WAREHOUSE_TABLE,
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT'
            },
            toWarehouseId: {
                field: 'to_warehouse_id',
                allowNull: false,
                type: DataTypes.INTEGER,
                references: {
                    model: WAREHOUSE_TABLE,
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT'
            },
            status: {
                allowNull: false,
                type: DataTypes.STRING,
                defaultValue: 'COMPLETED'
            },
            date: {
                allowNull: false,
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW
            },
            userId: {
                field: 'user_id',
                allowNull: true,
                type: DataTypes.INTEGER
            },
            observation: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            createdAt: {
                allowNull: false,
                type: DataTypes.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updatedAt: {
                allowNull: false,
                type: DataTypes.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        // 7. Create Transfer Item Table
        await queryInterface.createTable(TRANSFER_ITEM_TABLE, {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: DataTypes.INTEGER
            },
            transferId: {
                field: 'transfer_id',
                allowNull: false,
                type: DataTypes.INTEGER,
                references: {
                    model: TRANSFER_TABLE,
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            productId: {
                field: 'product_id',
                allowNull: false,
                type: DataTypes.INTEGER,
                references: {
                    model: PRODUCT_TABLE,
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'NO ACTION'
            },
            quantity: {
                allowNull: false,
                type: DataTypes.INTEGER
            }
        });

        // 8. Update Sale Table
        await queryInterface.addColumn(SALE_TABLE, 'warehouse_id', {
            allowNull: true,
            type: DataTypes.INTEGER,
            references: {
                model: WAREHOUSE_TABLE,
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT'
        });
    },

    async down(queryInterface, Sequelize) {
        // Drop in reverse order
        await queryInterface.removeColumn(SALE_TABLE, 'warehouse_id');
        await queryInterface.dropTable(TRANSFER_ITEM_TABLE);
        await queryInterface.dropTable(TRANSFER_TABLE);
        await queryInterface.dropTable(INVENTORY_MOVEMENT_TABLE);
        await queryInterface.dropTable(INVENTORY_BALANCE_TABLE);
        await queryInterface.dropTable(WAREHOUSE_TABLE);
    }
};
