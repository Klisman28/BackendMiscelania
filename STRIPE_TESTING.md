
# Guía de Pruebas Locales para Stripe Webhooks

Para probar que tu backend procesa correctamente los eventos de suscripción (pagos, cancelaciones, actualizaciones) sin necesidad de desplegar en un servidor real, utilizaremos la **Stripe CLI**.

## 1. Prerrequisitos
- Tener una cuenta en [Stripe Dashboard](https://dashboard.stripe.com/).
- Tener instalado el [Stripe CLI](https://stripe.com/docs/stripe-cli).

## 2. Autenticación
Abre una terminal y ejecuta:
```bash
stripe login
```
Sigue las instrucciones del navegador para vincular la CLI con tu cuenta de Stripe.

## 3. Iniciar el Listener (Túnel)
Este comando intercepta los eventos de Stripe y los redirige a tu servidor local.

```bash
stripe listen --forward-to localhost:3000/api/v1/saas/webhook
```

**¡IMPORTANTE!**
Al iniciar, la terminal te mostrará un mensaje como este:
> Ready! Your webhook signing secret is **whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxx**

Copia ese código `whsec_...` (Webhook Secret).

## 4. Configurar Entorno Local
Abre tu archivo `.env` en el backend y pega el secreto que acabas de copiar:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxx  <-- Tu clave secreta del Dashboard
```

Debes reiniciar tu servidor backend (`npm run dev`) para que tome el nuevo secreto.

## 5. Probar Eventos
Mantén la terminal del `stripe listen` abierta. Abre una **nueva terminal** y dispara eventos simulados:

### Crear una suscripción simulada
```bash
stripe trigger customer.subscription.created
```

### Simular un pago de factura exitoso
```bash
stripe trigger invoice.payment_succeeded
```

### Simular cancelación de suscripción
```bash
stripe trigger customer.subscription.deleted
```

## 6. Verificación
Si todo funciona, verás en la consola de `listen`:
`--> customer.subscription.created [evt_...]`
`<--  [200] POST http://localhost:3000/api/v1/saas/webhook`

Y en la consola de tu backend (`npm run dev`), deberías ver los logs de `StripeService`:
`Company [Nombre] subscription updated to active`

## Solución de Problemas
- **Error 400 (Webhook Error: No signatures found...)**: 
  - Verifica que `STRIPE_WEBHOOK_SECRET` en el `.env` coincide exactamente con el que muestra `stripe listen`.
  - Asegúrate de que `index.js` está configurado para NO aplicar `express.json()` en la ruta del webhook (ya lo configuramos).

