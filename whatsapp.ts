import { money } from "./format";
import { DELIVERY_LABEL, PAYMENT_STATUS_LABEL, orderCode } from "./orders";

/** WhatsApp del administrador de Mercadito Express (+54 9 261 558-5633). */
export const ADMIN_WHATSAPP = "5492615585633";

export type WhatsappOrder = {
  order_number: number;
  customer_name: string;
  phone: string;
  address: string | null;
  address_reference?: string | null;
  notes: string | null;
  delivery_method: string;
  payment_status: string;
  delivery_date?: string | null;
  delivery_time?: string | null;
  service_fee?: number;
  shipping_cost?: number;
  shipping?: number;
  tip?: number;
  payment_alias?: string;
  payment_method?: string;
  total: number;
  items: { name: string; quantity: number; unit_price: number }[];
};

export function buildOrderMessage(o: WhatsappOrder): string {
  const lines = [
    `🛒 NUEVO PEDIDO ${orderCode(o.order_number)}`,
    "",
    `Cliente: ${o.customer_name}`,
    `WhatsApp: ${o.phone}`,
    `Dirección: ${o.address?.trim() ? o.address : "Retiro en el local"}`,
    ...(o.address_reference?.trim() ? [`Referencia: ${o.address_reference}`] : []),
    "",
    "PRODUCTOS:",
    ...o.items.map(
      (i) =>
        `• ${i.quantity} x ${i.name} — ${money(i.unit_price)} c/u · subtotal ${money(
          i.unit_price * i.quantity,
        )}`,
    ),
    "",
    `Costo de envío: ${
      o.delivery_method === "retiro" ? "Retiro en el local" : money(o.shipping_cost ?? 0)
    }`,
    ...(o.service_fee ? [`Tarifa de servicio: ${money(o.service_fee)}`] : []),
    ...(o.shipping ? [`Envío: ${money(o.shipping)}`] : []),
    ...(o.tip ? [`Propina: ${money(o.tip)}`] : []),
    `TOTAL: ${money(o.total)}`,
    o.payment_method === "efectivo"
      ? "Método de pago: Efectivo al recibir"
      : `Método de pago: Transferencia bancaria${o.payment_alias ? ` (alias ${o.payment_alias})` : ""}`,
    `Método de entrega: ${DELIVERY_LABEL[o.delivery_method] ?? o.delivery_method}`,
    ...(o.delivery_date
      ? [`Entrega: ${o.delivery_date}${o.delivery_time ? ` · ${o.delivery_time}` : ""}`]
      : []),
    `Indicaciones: ${o.notes?.trim() ? o.notes : "-"}`,
    `Pago: ${PAYMENT_STATUS_LABEL[o.payment_status] ?? o.payment_status}`,
  ];
  return lines.join("\n");
}

/** Normaliza un número a formato wa.me (solo dígitos). */
export function normalizeWhatsapp(raw: string | null | undefined): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  return digits.length >= 8 ? digits : ADMIN_WHATSAPP;
}

/** Arma el enlace de WhatsApp del comercio (o el de la plataforma como respaldo). */
export function whatsappUrl(message: string, phone?: string | null): string {
  return `https://wa.me/${normalizeWhatsapp(phone)}?text=${encodeURIComponent(message)}`;
}
