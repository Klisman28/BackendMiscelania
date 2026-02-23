const boom = require('@hapi/boom');
const bcrypt = require('bcrypt');
const { models, sequelize } = require('../../libs/sequelize');

class SaasService {
    /**
     * Convierte un nombre de empresa en un slug válido y único.
     * Ejemplo: "Mi Tienda Bonita" → "mi-tienda-bonita"
     */
    _generateSlug(name) {
        return name
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')          // espacios → guiones
            .replace(/[^a-z0-9-]/g, '')    // quitar caracteres especiales
            .replace(/-+/g, '-')           // múltiples guiones → uno
            .replace(/^-|-$/g, '');        // quitar guiones al inicio/fin
    }

    /**
     * Asegura que el slug sea único en la BD.
     * Si "mi-tienda" ya existe, intenta "mi-tienda-2", "mi-tienda-3", etc.
     */
    async _ensureUniqueSlug(baseSlug, t) {
        let slug = baseSlug;
        let counter = 2;

        while (true) {
            const existing = await models.Company.findOne({
                where: { slug },
                transaction: t,
            });
            if (!existing) break;
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        return slug;
    }

    /**
     * Verifica que el username no esté tomado.
     */
    async _checkUsernameAvailable(username, t) {
        const existing = await models.User.findOne({
            where: { username },
            transaction: t,
        });
        if (existing) {
            throw boom.conflict(`El nombre de usuario "${username}" ya está en uso`);
        }
    }

    /**
     * Endpoint principal: registra empresa + owner en una transacción atómica.
     *
     * Pasos:
     *  1. Validar unicidad de username
     *  2. Crear Company
     *  3. Crear User (owner) con contraseña hasheada
     *  4. Asignar rol "admin" al user
     *  5. Actualizar owner_id en Company
     *  6. Crear bodega principal (Main Warehouse)
     *  7. Crear Config inicial (series de facturación)
     *  8. Retornar datos + token automático
     */
    async signup({ companyName, ownerUsername, ownerPassword, ownerEmail }) {
        return await sequelize.transaction(async (t) => {
            // ── 1. Verificar username disponible ──────────────────────────────
            await this._checkUsernameAvailable(ownerUsername, t);

            // ── 2. Crear Company ──────────────────────────────────────────────
            const baseSlug = this._generateSlug(companyName);
            const slug = await this._ensureUniqueSlug(baseSlug, t);

            const company = await models.Company.create(
                {
                    name: companyName,
                    slug,
                    status: 'trial',   // Empieza en período de prueba
                },
                { transaction: t }
            );

            // ── 3. Crear Employee (Owner) y User ──────────────────────────────
            const ownerEmployee = await models.Employee.create(
                {
                    name: ownerUsername,
                    firstLastname: 'Owner',
                    email: ownerEmail || null,
                    companyId: company.id,
                },
                { transaction: t }
            );

            const passwordHash = await bcrypt.hash(ownerPassword, 10);

            const user = await models.User.create(
                {
                    username: ownerUsername,
                    password: passwordHash,
                    status: true,
                    companyId: company.id,
                    userableId: ownerEmployee.id,
                    userableType: 'Employee'
                },
                { transaction: t }
            );

            // ── 4. Asignar rol "admin" ────────────────────────────────────────
            // Busca o crea el rol admin para esta empresa.
            // El rol "admin" es global (tabla roles), solo necesitamos asociarlo.
            let adminRole = await models.Role.findOne({
                where: { name: 'admin' },
                transaction: t,
            });

            if (!adminRole) {
                // Fallback: crear rol si no existe (raro pero seguro)
                adminRole = await models.Role.create(
                    { name: 'admin' },
                    { transaction: t }
                );
            }

            await models.RoleUser.create(
                {
                    userId: user.id,
                    roleId: adminRole.id,
                },
                { transaction: t }
            );

            // ── 5. Actualizar owner_id en Company ────────────────────────────
            await company.update({ ownerId: user.id }, { transaction: t });

            // ── 5.5 Crear CompanyUser (Pivot) ────────────────────────────────
            // Nueva tabla pivote para manejar acceso multi-tenant
            await models.CompanyUser.create({
                companyId: company.id,
                userId: user.id,
                role: 'owner',
                status: 'active'
            }, { transaction: t });


            // ── 6. Crear Bodega Principal ────────────────────────────────────
            await models.Warehouse.create(
                {
                    name: `Bodega Principal [${slug}]`,
                    code: 'MAIN',
                    description: 'Bodega principal creada automáticamente',
                    active: true,
                    companyId: company.id,
                },
                { transaction: t }
            );

            // ── 7. Crear Config inicial ──────────────────────────────────────
            await models.Config.create(
                {
                    invoceSerie: 'FAC',
                    invoceNum: 1,
                    boletaSerie: 'BOL',
                    boletaNum: 1,
                    ticketNum: 1,
                    companyId: company.id,
                },
                { transaction: t }
            );

            // ── 8. Retornar resultado ────────────────────────────────────────
            return {
                company: {
                    id: company.id,
                    name: company.name,
                    slug: company.slug,
                    status: company.status,
                },
                owner: {
                    id: user.id,
                    username: user.username,
                    companyId: company.id,
                    roles: ['admin'],
                },
                message: `Empresa "${company.name}" creada exitosamente. Ya puedes iniciar sesión.`,
            };
        });
    }

    /**
     * Crear empresa desde el panel administrativo (SaaS Admin).
     * Requiere un usuario ya existente para ser el owner.
     */
    async createCompany({ name, slug, plan, seats, subscription_end, ownerUserId }) {
        return await sequelize.transaction(async (t) => {
            // 1. Validar slug único
            let finalSlug = slug;
            if (!finalSlug) {
                finalSlug = this._generateSlug(name);
            }
            finalSlug = await this._ensureUniqueSlug(finalSlug, t);

            // 2. Crear Company
            const company = await models.Company.create({
                name,
                slug: finalSlug,
                plan: plan || 'basic',
                seats: seats || 5,
                subscriptionEnd: subscription_end || null,
                status: 'active', // default
                ownerId: ownerUserId // Asigna el owner
            }, { transaction: t });

            // 3. Crear relación en company_users (Pivot)
            if (ownerUserId) {
                // Verificar que el user exista
                const ownerUser = await models.User.findByPk(ownerUserId, { transaction: t });
                if (!ownerUser) {
                    throw boom.badRequest('El usuario owner especificado no existe', { field: 'ownerUserId' });
                }

                // Crear o actualizar relación
                // Usamos findOrCreate para evitar duplicados si ya existe
                await models.CompanyUser.findOrCreate({
                    where: { companyId: company.id, userId: ownerUserId },
                    defaults: {
                        role: 'owner',
                        status: 'active'
                    },
                    transaction: t
                });

                // Tambien aseguramos la relación en users.companyId si es nula?
                // El usuario pidió "No confiar nunca en company_id del frontend", pero en DB sí se usa.
                // Si el usuario ya tiene companyId, no lo sobreescribimos (puede pertenecer a varias, pero user.companyId solo guarda una "default")
                // Dejamos user.companyId como está o lo actualizamos si es null?
                if (!ownerUser.companyId) {
                    await ownerUser.update({ companyId: company.id }, { transaction: t });
                }
            }

            // 4. Crear defaults (Bodega, Config)
            await models.Warehouse.create({
                name: `Bodega Principal [${finalSlug}]`,
                code: 'MAIN',
                description: 'Bodega principal creada automáticamente',
                active: true,
                companyId: company.id,
            }, { transaction: t });

            await models.Config.create({
                invoceSerie: 'FAC',
                invoceNum: 1,
                boletaSerie: 'BOL',
                boletaNum: 1,
                ticketNum: 1,
                companyId: company.id,
            }, { transaction: t });

            return company;
        });
    }
    async getBilling(companyId) {
        const company = await models.Company.findByPk(companyId);
        if (!company) throw boom.notFound('Empresa no encontrada');

        const activeUsers = await models.User.count({
            where: {
                companyId,
                status: true
            }
        });

        return {
            seats_purchased: company.seats,
            seats_used: activeUsers
        };
    }

    /**
     * Obtener listado de empresas (para dashboard de Super Admin)
     */
    async getAllCompanies(query) {
        const { limit, offset, page, search, status } = query;

        // Parse limit (default 10)
        const limitNum = parseInt(limit, 10);
        const finalLimit = (!isNaN(limitNum) && limitNum > 0) ? limitNum : 10;

        // Parse offset or calculate from page
        let finalOffset = 0;
        if (offset !== undefined && offset !== null && offset !== '') {
            const offsetNum = parseInt(offset, 10);
            if (!isNaN(offsetNum) && offsetNum >= 0) {
                finalOffset = offsetNum;
            }
        } else if (page !== undefined && page !== null && page !== '') {
            const pageNum = parseInt(page, 10);
            if (!isNaN(pageNum) && pageNum > 0) {
                finalOffset = (pageNum - 1) * finalLimit;
            }
        }

        const where = {};
        if (status) {
            where.status = status;
        }
        if (search) {
            const { Op } = require('sequelize');
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { slug: { [Op.like]: `%${search}%` } }
            ];
        }

        const options = {
            where,
            include: [
                {
                    model: models.User,
                    as: 'owner',
                    attributes: ['id', 'username'],
                    required: false
                }
            ], // Correctly closed include array
            limit: finalLimit,
            offset: finalOffset,
            order: [['createdAt', 'DESC']]
        };

        const { count, rows } = await models.Company.findAndCountAll(options);

        // Mapeamos para facilitar el frontend
        const companies = rows.map(c => {
            const plain = c.get({ plain: true });
            return {
                ...plain,
                ownerName: plain.owner ? plain.owner.username : 'N/A',
                owner: plain.owner // Keep owner object for detail view if needed
            };
        });

        return {
            total: count,
            companies,
            pagination: {
                limit: finalLimit,
                offset: finalOffset,
                total: count
            }
        };
    }

    /**
     * Actualizar estado de una empresa (active/suspended)
     */
    async updateCompanyStatus(id, status) {
        const company = await models.Company.findByPk(id);
        if (!company) throw boom.notFound('Empresa no encontrada');

        await company.update({ status });
        return company;
    }

    /**
     * Estadísticas globales del SaaS
     */
    async getGlobalStats() {
        const totalCompanies = await models.Company.count();
        const activeCompanies = await models.Company.count({ where: { status: 'active' } });
        const totalUsers = await models.User.count();

        // Ingresos estimados (suma de precios de planes activos) - Simulación
        // Idealmente sumar suscripciones de Stripe
        // Por ahora devolvemos estático

        return {
            totalCompanies,
            activeCompanies,
            totalUsers,
            revenue: 0 // Placeholder
        };
    }
    /**
     * Buscar usuarios para asignar como Owner
     */
    async getUsers(query) {
        const { limit, offset, search } = query;
        const options = {
            limit: limit ? parseInt(limit) : 20,
            offset: offset ? parseInt(offset) : 0,
            attributes: ['id', 'username', 'createdAt'],
            include: [
                {
                    model: models.Employee,
                    as: 'employee',
                    attributes: ['email'],
                    required: false
                }
            ],
            order: [['username', 'ASC']]
        };

        if (search) {
            const { Op } = require('sequelize');
            options.where = {
                [Op.or]: [
                    { username: { [Op.like]: `%${search}%` } },
                    { '$employee.email$': { [Op.like]: `%${search}%` } }
                ]
            };
        }

        const { count, rows } = await models.User.findAndCountAll(options);

        const users = rows.map(u => {
            const plain = u.get({ plain: true });
            return {
                id: plain.id,
                username: plain.username,
                email: plain.employee ? plain.employee.email : null,
                createdAt: plain.createdAt
            };
        });

        return { total: count, users };
    }
}

module.exports = SaasService;
