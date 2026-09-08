export const ORDER_STATUSES = [
  "recibido",
  "pago_confirmado",
  "preparando",
  "enviado",
  "entregado",
  "cancelado",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABEL: Record<string, string> = {
  recibido: "Pedido recibido",
  pago_confirmado: "Pago confirmado",
  preparando: "Preparando pedido",
  enviado: "Pedido enviado",
  entregado: "Pedido entregado",
  cancelado: "Cancelado",
};

export const PAYMENT_STATUSES = ["pendiente", "aprobado", "rechazado"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pendiente: "Pago pendiente",
  aprobado: "Pago aprobado",
  rechazado: "Pago rechazado",
};

export type DeliveryMethod = "envio" | "retiro";
export const DELIVERY_LABEL: Record<string, string> = {
  envio: "Envío a domicilio",
  retiro: "Retiro en el local",
};

export const orderCode = (n: number) => `#${String(n).padStart(4, "0")}`;
