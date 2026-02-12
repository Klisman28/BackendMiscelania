# 🐛 Resolución: Unknown Column 'first_name'

**Fecha**: 2026-02-11  
**Estado**: ✅ **RESUELTO**

---

## 🔍 Diagnóstico

El error `Unknown column 'first_name'` ocurría porque **la migración de base de datos no se había ejecutado**, aunque el archivo de migración existía.

1. **Causa Raíz**: La migración `20260211203100-simplify-customer-fields.js` no se aplicó automáticamente ni manualmente tras su creación.
2. **Base de Datos**: Confirmado que Sequelize conecta correctamente a `SQLSHOPcelanialis.sh`.
3. **Estado Previo**: Las columnas `first_name`, `last_name`, `is_final_consumer`, `nit` no existían físicamente en la tabla `customers`.

---

## 🛠️ Solución Aplicada

### **1. Migración Idempotente y Robusta**
Se actualizó el archivo de migración `database/migrations/20260211203100-simplify-customer-fields.js` para ser **idempotente**:
- ✅ Verifica si las columnas ya existen antes de intentar agregarlas (evita errores si se corre parcialmente).
- ✅ Migra datos existentes (`name` -> `first_name`, etc.) de forma segura.
- ✅ Asegura que no queden valores `NULL` antes de aplicar restricciones `NOT NULL`.

### **2. Ejecución de Migración**
Se ejecutó exitosamente el comando:
```bash
npm run migrations:run
```

**Resultado:**
- Columnas creadas correctamente.
- Datos migrados.
- Índices creados.

### **3. Verificación de Columnas**
Se confirmó la existencia de las columnas mediante script de verificación directo:
- `✅ Column first_name exists!`
- `✅ Column last_name exists!`
- `✅ Column is_final_consumer exists!`
- `✅ Column nit exists!`

---

## ✅ Evidencia de Funcionamiento

Se realizó una prueba POST exitosa al endpoint `/api/v1/customers` (bypass de auth para validación pura):

**Request:**
```json
{
  "firstName": "Juan",
  "lastName": "Garcia",
  "isFinalConsumer": true,
  "telephone": "5557545"
}
```

**Response (Exitosa 201):**
```json
{
  "data": {
    "id": 18,
    "firstName": "Juan",
    "lastName": "Garcia",
    "isFinalConsumer": true,
    "nit": "CF",
    "telephone": "5557545",
    "email": null,
    "address": null
  },
  "message": "Cliente registrado con éxito"
}
```

La respuesta confirma que:
1. El backend ya no falla con `Unknown column`.
2. El campo `nit` se asigna automáticamente a "CF" según la regla de negocio.

---

## 🚀 Cómo Probar (Usuario)

1. **Login (si es necesario)**:
   ```bash
   curl -X POST http://localhost:3000/api/v1/auth/sign-in -d ...
   ```

2. **Crear Cliente**:
   ```bash
   curl -X POST http://localhost:3000/api/v1/customers \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer TU_TOKEN" \
     -d '{
       "firstName": "Prueba",
       "lastName": "Final",
       "isFinalConsumer": true
     }'
   ```

3. **Script Automatizado**:
   Ejecutar el script PowerShell provisto:
   ```powershell
   .\test-customer-simplification.ps1
   ```
   *(Asegúrate de actualizar el token en el script)*

---

**Problema Resuelto Definitivamente.**
La base de datos está sincronizada con el código.
