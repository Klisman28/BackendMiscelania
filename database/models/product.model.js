const { Model, DataTypes } = require('sequelize');
const SequelizeSlugify = require('sequelize-slugify');
const { BRAND_TABLE } = require('./brand.model');
const { SUBCATEGORY_TABLE } = require('./subcategory.model');
const { UNIT_TABLE } = require('./unit.model');

const PRODUCT_TABLE = 'products';

const PRODUCT_STATUS = {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    ARCHIVED: 'ARCHIVED'
};

const ProductSchema = {
    id: {
        allowNull: true,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
    },
    companyId: {
        field: 'company_id',
        allowNull: true,
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    sku: {
        allowNull: true,
        type: DataTypes.STRING,
    },
    name: {
        allowNull: true,
        type: DataTypes.STRING,
    },
    slug: {
        type: DataTypes.STRING,
    },
    cost: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: true
    },
    utility: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: true
    },
    price: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: true
    },
    stock: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    stockMin: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'stock_min'
    },
    imageUrl: {
        allowNull: true,
        type: DataTypes.STRING,
        field: 'image_url'
    },
    imageKey: {
        allowNull: true,
        type: DataTypes.STRING,
        field: 'image_key'
    },
    expirationDate: {
        allowNull: true,
        type: DataTypes.DATEONLY,
        field: 'expirationDate'
    },
    hasExpiration: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    // ── Lifecycle status ──
    status: {
        type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED'),
        allowNull: false,
        defaultValue: 'ACTIVE'
    },
    inactivatedAt: {
        field: 'inactivated_at',
        type: DataTypes.DATE,
        allowNull: true,
    },
    archivedAt: {
        field: 'archived_at',
        type: DataTypes.DATE,
        allowNull: true,
    },
    inactiveReason: {
        field: 'inactive_reason',
        type: DataTypes.STRING(500),
        allowNull: true,
    },
    // deletedAt se maneja automáticamente por paranoid
    deletedAt: {
        field: 'deleted_at',
        type: DataTypes.DATE,
        allowNull: true,
    },
    // ── FK ──
    brandId: {
        field: 'brand_id',
        allowNull: false,
        type: DataTypes.INTEGER,
        references: {
            model: BRAND_TABLE,
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    subcategoryId: {
        field: 'subcategory_id',
        allowNull: false,
        type: DataTypes.INTEGER,
        references: {
            model: SUBCATEGORY_TABLE,
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    unitId: {
        field: 'unit_id',
        allowNull: false,
        type: DataTypes.INTEGER,
        references: {
            model: UNIT_TABLE,
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
}

class Product extends Model {
    // ── Helper: ¿está activo para operaciones? ──
    isActive() {
        return this.status === PRODUCT_STATUS.ACTIVE;
    }

    static associate(models) {
        this.belongsTo(models.Company, { as: 'company', foreignKey: 'companyId' });
        this.belongsTo(models.Brand, {
            as: 'brand'
        });
        this.belongsTo(models.Subcategory, {
            as: 'subcategory'
        });
        this.belongsTo(models.Unit, {
            as: 'unit'
        });

        const relationsInclude = [
            { model: models.Brand, as: 'brand', attributes: ['id', 'name'] },
            { model: models.Subcategory, as: 'subcategory', attributes: ['id', 'name'] },
            { model: models.Unit, as: 'unit', attributes: ['id', 'symbol'] }
        ];

        // Add a default scope that includes relations automatically
        this.addScope('defaultScope', {
            where: {
                status: ['ACTIVE', 'INACTIVE'] // Excludes ARCHIVED by default
            },
            include: relationsInclude
        }, { override: true });

        // Solo activos (para listados de venta, dropdowns, etc.)
        this.addScope('active', {
            where: { status: 'ACTIVE' },
            include: relationsInclude
        }, { override: true });

        // Todos incluidos ARCHIVED (para reportes, admin)
        this.addScope('withArchived', {
            where: {},
            include: relationsInclude
        }, { override: true });

        // Solo archivados
        this.addScope('archived', {
            where: { status: 'ARCHIVED' },
            include: relationsInclude
        }, { override: true });
    }

    static config(sequelize) {
        return {
            sequelize,
            tableName: PRODUCT_TABLE,
            modelName: 'Product',
            timestamps: false,
            paranoid: true,           // Habilita soft delete con deletedAt
            deletedAt: 'deleted_at',  // Nombre de columna en DB
            // scopes with includes are defined dynamically in associate(models)
            scopes: {}
        }
    }

    static slugify(models) {
        SequelizeSlugify.slugifyModel(models.Product, {
            source: ['name']
        });
    }
}

module.exports = { PRODUCT_TABLE, ProductSchema, Product, PRODUCT_STATUS }