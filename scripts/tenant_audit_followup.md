# Seguimiento de Auditoría Multi-tenant

## 1. Comandos de Verificación Estática
Para asegurar que no introducimos endpoints unscoped a futuro:

```bash
# Buscar servicios que usan findByPk (que no soporta where: { companyId } directo como parámetro extra)
rg "findByPk\(" services/

# Buscar métodos findAll en servicios y verificar que incluyen companyId
rg "findAll\(" services/

# Detectar confianza en el body para el companyId en routers (data leakage / spoofing)
rg "companyId:\s*req\.body" routes/
```

## 2. Script de Aislamiento
Ejecutar el script `node scripts/tenant_isolation_test.js` para crear un producto en el Tenant A de forma automatizada y verificar que el Tenant B recibe 404 al intentar consultarlo.

## 3. Pruebas Manuales (Postman/cURL)
1. **Login como User A** (Tenant A).
2. **Crear categoría**: Hacer `POST /api/v1/categories` con el body: `{"name": "Prueba A"}`.
3. **Login como User B** (Tenant B).
4. **Listar categorías**: Hacer `GET /api/v1/categories`. Validar que "Prueba A" NO aparece.
5. **Intentar Spoofing**: Crear otra categoría desde Tenant B, pero enviando `companyId: [ID del Tenant A]` en el JSON del body.
6. **Verificar Spoofing**: Listar categorías en Tenant B y validar que la recién creada pertenece al Tenant B, confirmando que nuestro parseo descarta el companyId del usuario malicioso y fuerza el del token JWT.

## 4. Criterios de Aceptación Cumplidos
✅ **0 cross-tenant reads/writes**: Todas las búsquedas en `findAll` o conteos `count` fuerzan `companyId` del usuario en sesión.
✅ **JWT Membership Verified**: `tenantGuard` verifica membresía activa del token usando `company_users`.
✅ **SaaS Global routes clear**: Los middlewares están aplicados exclusivamente en la API v1 tenant, dejando `routes/saas/saas.router.js` limpio para la operatoria general del Superadmin.
