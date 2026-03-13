const { Model, DataTypes } = require('sequelize');
const SequelizeSlugify = require('sequelize-slugify');

const CATEGORY_TABLE = 'categories';

const CategorySchema = {
    id: {
        allowNull: true,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
    },
    name: {
        allowNull: true,
        type: DataTypes.STRING,
        get() {
            const newValue = this.getDataValue('name');
            return newValue[0].toUpperCase() + newValue.slice(1);
        },
        set(value) {
            this.setDataValue('name', value.toLowerCase().trim());
        }
    },
    code: {
        allowNull: true,
        type: DataTypes.STRING,
    },
    slug: {
        type: DataTypes.STRING,
    },
    companyId: {
        field: 'company_id',
        allowNull: true,
        type: DataTypes.INTEGER,
        defaultValue: 1
    }
}

class Category extends Model {
    static associate(models) {
        this.hasMany(models.Subcategory, {
            as: 'subcategories',
            foreignKey: 'categoryId'
        });
        this.belongsTo(models.Company, { as: 'company', foreignKey: 'companyId' });
    }

    static config(sequelize) {
        return {
            sequelize,
            tableName: CATEGORY_TABLE,
            modelName: 'Category',
            timestamps: false,
            indexes: [
                { unique: true, fields: ['name', 'company_id'], name: 'categories_name_company_unique' },
                { unique: true, fields: ['code', 'company_id'], name: 'categories_code_company_unique' },
                { unique: true, fields: ['slug', 'company_id'], name: 'categories_slug_company_unique' }
            ]
        }
    }

    static slugify(models) {
        SequelizeSlugify.slugifyModel(models.Category, {
            source: ['name']
        });
    }
}

module.exports = { CATEGORY_TABLE, CategorySchema, Category }