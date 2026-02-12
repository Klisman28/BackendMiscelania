# 🎯 Simplificación del Modelo de Clientes

**Fecha**: 2026-02-11  
**Objetivo**: Simplificar el modelo de clientes/personas con campos más intuitivos y validaciones mejoradas

---

## 📋 Cambios Implementados

### **Antes (Campos Antiguos)**
```javascript
{
  "name": "Juan",
  "firstLastname": "Pérez",
  "secondLastname": "García",
  "dni": "12345678",
  "email": "juan@example.com",
  "telephone": "555-1234",
  "address": "Calle Principal 123"
}
```

### **Ahora (Campos Nuevos)**
```javascript
{
  "firstName": "Juan",
  "lastName": "Pérez García",
  "isFinalConsumer": false,
  "nit": "1234567-8",
  "email": "juan@example.com",
  "telephone": "555-1234",
  "address": "Calle Principal 123"
}
```

---

## ✨ Nuevos Campos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `firstName` | String | ✅ Sí (min 2, max 100) | Nombre del cliente |
| `lastName` | String | ✅ Sí (min 2, max 100) | Apellido(s) del cliente |
| `isFinalConsumer` | Boolean | ❌ No (default: false) | Indica si es consumidor final (C/F) |
| `nit` | String | ❌ Condicional | NIT/RUC del cliente |
| `email` | String | ❌ No | Email (validado si se envía) |
| `telephone` | String | ❌ No (min 7, max 20) | Teléfono |
| `address` | String | ❌ No (min 5, max 255) | Dirección |

---

## 🔒 Reglas de Negocio para NIT

### **Caso 1: Consumidor Final (`isFinalConsumer: true`)**
```javascript
// Request
{
  "firstName": "María",
  "lastName": "López",
  "isFinalConsumer": true
  // nit NO enviado o vacío
}

// Backend AUTO-asigna nit = 'CF'
// Response
{
  "id": 1,
  "firstName": "María",
  "lastName": "López",
  "isFinalConsumer": true,
  "nit": "CF",  // ← AUTO-asignado
  "email": null,
  "telephone": null,
  "address": null
}
```

###(** **Caso 2: Cliente con NIT (`isFinalConsumer: false`)**
```javascript
// Request
{
  "firstName": "Empresa",
  "lastName": "S.A.",
  "isFinalConsumer": false,
  "nit": "1234567-8"
}

// Response
{
  "id": 2,
  "firstName": "Empresa",
  "lastName": "S.a.",
  "isFinalConsumer": false,
  "nit": "1234567-8",
  "email": null,
  "telephone": null,
  "address": null
}
```

### **Caso 3: Cliente sin NIT (`isFinalConsumer: false`, NIT vacío)**
```javascript
// Request
{
  "firstName": "Carlos",
  "lastName": "Ramírez",
  "isFinalConsumer": false
  // nit no enviado
}

// Response
{
  "id": 3,
  "firstName": "Carlos",
  "lastName": "Ramírez",
  "isFinalConsumer": false,
  "nit": null,  // ← Permitido
  "email": null,
  "telephone": null,
  "address": null
}
```

---

## 🔄 Compatibilidad con Campos Antiguos

El backend mantiene **100% compatibilidad** con requests que usen el formato antiguo:

```javascript
// Request con formato ANTIGUO
POST /api/v1/customers
{
  "name": "Pedro",
  "firstLastname": "González",
  "secondLastname": "Martínez"
}

// Backend MAPEA automáticamente a:
{
  firstName: "Pedro",
  lastName: "González Martínez"
}

// Response
{
  "id": 4,
  "firstName": "Pedro",
  "lastName": "González martínez",
  "isFinalConsumer": false,
  "nit": null,
  ...
}
```

---

## 📂 Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| **`database/migrations/20260211203100-simplify-customer-fields.js`** | ✅ Migración para agregar nuevos campos y migrar datos existentes |
| **`database/models/customer.model.js`** | ✅ Schema actualizado con nuevos campos + campos antiguos para compatibilidad |
| **`schemas/client/customers.schema.js`** | ✅ Validación Joi con reglas condicionales para NIT |
| **`services/client/customers.service.js`** | ✅ Lógica de mapeo, NIT automático, y respuestas consistentes |
| **`routes/client/customers.router.js`** | ✅ Uso de `updateCustomerSchema` en PUT |

---

## 🧪 Ejemplos de Uso (curl)

### **1. Crear Consumidor Final**
```bash
curl -X POST http://localhost:3000/api/v1/customers \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "María",
    "lastName": "López",
    "isFinalConsumer": true,
    "email": "maria@example.com",
    "telephone": "555-5678"
  }'
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "firstName": "María",
    "lastName": "López",
    "isFinalConsumer": true,
    "nit": "CF",
    "email": "maria@example.com",
    "telephone": "555-5678",
    "address": null
  },
  "message": "Cliente registrado con éxito"
}
```

---

### **2. Crear Cliente con NIT**
```bash
curl -X POST http://localhost:3000/api/v1/customers \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Tech Solutions",
    "lastName": "S.A. de C.V.",
    "isFinalConsumer": false,
    "nit": "0614-230393-101-6",
    "email": "contacto@techsolutions.com",
    "telephone": "555-9999",
    "address": "Boulevard Los Próceres 123"
  }'
```

**Response:**
```json
{
  "data": {
    "id": 2,
    "firstName": "Tech solutions",
    "lastName": "S.a. de c.v.",
    "isFinalConsumer": false,
    "nit": "0614-230393-101-6",
    "email": "contacto@techsolutions.com",
    "telephone": "555-9999",
    "address": "Boulevard Los Próceres 123"
  },
  "message": "Cliente registrado con éxito"
}
```

---

### **3. Crear con Formato Antiguo (Backward Compatibility)**
```bash
curl -X POST http://localhost:3000/api/v1/customers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pedro",
    "firstLastname": "González",
    "secondLastname": "Martínez",
    "email": "pedro@example.com"
  }'
```

**Response (mapeado automáticamente):**
```json
{
  "data": {
    "id": 3,
    "firstName": "Pedro",
    "lastName": "González martínez",
    "isFinalConsumer": false,
    "nit": null,
    "email": "pedro@example.com",
    "telephone": null,
    "address": null
  },
  "message": "Cliente registrado con éxito"
}
```

---

### **4. Actualizar Cliente**
```bash
curl -X PUT http://localhost:3000/api/v1/customers/1 \
  -H "Content-Type: application/json" \
  -d '{
    "telephone": "555-1111",
    "address": "Nueva dirección 456"
  }'
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "firstName": "María",
    "lastName": "López",
    "isFinalConsumer": true,
    "nit": "CF",
    "email": "maria@example.com",
    "telephone": "555-1111",
    "address": "Nueva dirección 456"
  },
  "message": "Cliente actualizado con éxito"
}
```

---

### **5. Cambiar de CF a Cliente con NIT**
```bash
curl -X PUT http://localhost:3000/api/v1/customers/1 \
  -H "Content-Type: application/json" \
  -d '{
    "isFinalConsumer": false,
    "nit": "1234567-8"
  }'
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "firstName": "María",
    "lastName": "López",
    "isFinalConsumer": false,
    "nit": "1234567-8",
    ...
  },
  "message": "Cliente actualizado con éxito"
}
```

---

### **6. Listar Clientes con Búsqueda**
```bash
# Buscar por nombre, apellido o NIT
curl -X GET "http://localhost:3000/api/v1/customers?search=María&limit=10&offset=0"
```

**Response:**
```json
{
  "data": {
    "customers": [
      {
        "id": 1,
        "firstName": "María",
        "lastName": "López",
        "isFinalConsumer": true,
        "nit": "CF",
        ...
      }
    ],
    "total": 1
  }
}
```

---

### **7. Obtener Cliente por ID**
```bash
curl -X GET http://localhost:3000/api/v1/customers/1
```

---

### **8. Eliminar Cliente**
```bash
curl -X DELETE http://localhost:3000/api/v1/customers/1
```

---

## ⚠️ Validaciones

### **Errores Comunes**

#### **1. firstName o lastName faltantes**
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "\"firstName\" is required"
}
```

#### **2. Email inválido**
```bash
curl -X POST http://localhost:3000/api/v1/customers \
  -d '{"firstName":"Test","lastName":"User","email":"not-an-email"}'

# Error:
{
  "message": "\"email\" must be a valid email"
}
```

#### **3. NIT con formato inválido**
```bash
curl -X POST http://localhost:3000/api/v1/customers \
  -d '{
    "firstName":"Test",
    "lastName":"User",
    "isFinalConsumer":false,
    "nit":"abc@#$%"
  }'

# Error:
{
  "message": "\"nit\" with value \"abc@#$%\" fails to match the required pattern"
}
```

---

## 🔍 Lógica Interna del Service

### **Mapeo de Campos Antiguos**
```javascript
_mapLegacyFields(data) {
  // Si vienen campos antiguos y NO nuevos, mapear:
  if (!data.firstName && data.name) {
    data.firstName = data.name;
  }
  
  if (!data.lastName && (data.firstLastname || data.secondLastname)) {
    data.lastName = `${data.firstLastname} ${data.secondLastname}`.trim();
  }
  
  return data;
}
```

### **Manejo Automático de NIT**
```javascript
_handleNIT(data) {
  if (data.isFinalConsumer === true) {
    data.nit = 'CF';  // Forzar CF
  } else if (data.isFinalConsumer === false) {
    if (!data.nit || data.nit.trim() === '') {
      data.nit = null;  // Permitir null
    }
  }
  return data;
}
```

---

## 📊 Migración de Datos

La migración automática convierte:
```sql
-- ANTES (datos existentes)
name = 'Juan'
first_lastname = 'Pérez'
second_lastname = 'García'

-- DESPUÉS (migración automática)
first_name = 'Juan'
last_name = 'Pérez García'
is_final_consumer = false
nit = NULL
```

---

## ✅ Checklist de Implementación

- [x] Migración creada y lista para ejecutar
- [x] Modelo actualizado con nuevos campos
- [x] Campos antiguos mantenidos para compatibilidad
- [x] Schema Joi con validación condicional de NIT
- [x] Service con lógica de mapeo automático
- [x] Service con NIT automático para CF
- [x] Router actualizado con updateCustomerSchema
- [x] Búsqueda mejorada (firstName, lastName, NIT)
- [x] Documentación completa
- [x] Ejemplos curl

---

## 🚀 Ejecutar Migración

```bash
npm run migrations:run
```

---

**Implementado por**: Antigravity AI Assistant  
**Versión**: 2.0.0  
**Estado**: ✅ Listo para Testing
