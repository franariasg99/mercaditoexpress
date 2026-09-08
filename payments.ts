/**
 * Estructura preparada para integrar un sistema de pago real (Mercado Pago).
 *
 * Hoy los pedidos se crean con payment_status = "pendiente" y coordinación por
 * WhatsApp. Cuando se conecten las credenciales de Mercado Pago, la
 * confirmación debe llegar por webhook del proveedor (server route en
 * /api/public/...) y recién ahí actualizar el pedido a "aprobado".
 *
 * Nunca se guardan datos de tarjetas en la aplicación.
 */
import type { PaymentStatus } from "./orders";

export const PAYMENTS_ENABLED = false;
export const PAYMENT_PROVIDER = "mercadopago" as const;

export const initialPaymentStatus: PaymentStatus = "pendiente";
