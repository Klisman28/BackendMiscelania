# Ejemplos CURL para Subida de Imágenes en Productos

## 1. Crear Producto con Imagen (Multipart/Form-Data)

```bash
curl --location 'http://localhost:3000/api/v1/products' \
--form 'name="Coca Cola 3L"' \
--form 'sku="COC-3L-001"' \
--form 'price="15.50"' \
--form 'cost="12.00"' \
--form 'stock="100"' \
--form 'stockMin="10"' \
--form 'categoryId="1"' \
--form 'subcategoryId="1"' \
--form 'unitId="1"' \
--form 'brandId="1"' \
--form 'image=@"/path/to/your/image.jpg"'
```

> **Nota**: Reemplaza `/path/to/your/image.jpg` con la ruta real de tu imagen.

## 2. Editar Producto (Reemplazar Imagen)

```bash
curl --location --request PUT 'http://localhost:3000/api/v1/products/1' \
--form 'price="16.00"' \
--form 'image=@"/path/to/new/image.png"'
```

> **Nota**: Esto actualizará el precio y reemplazará la imagen anterior (borrándola del servidor).

## 3. Eliminar Producto

```bash
curl --location --request DELETE 'http://localhost:3000/api/v1/products/1'
```

> **Nota**: Esto eliminará el producto y su imagen asociada del disco.

## 4. Obtener Producto (Verificar URL)

```bash
curl --location 'http://localhost:3000/api/v1/products/1'
```

Deberías ver un campo `imageUrl` como:
`"imageUrl": "http://localhost:3000/uploads/products/product-1740000000000-123.webp"`

---

## Verificación Visual

Abre en tu navegador:
`http://localhost:3000/uploads/products/<nombre-archivo>.webp`
