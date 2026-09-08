/**
 * Motor de precios y promociones de Mercadito Express.
 *
 * Orden de cálculo (fijo):
 *  1. precio original de los productos
 *  2. promociones y descuentos por producto
 *  3. subtotal después de promociones
 *  4. descuento de primer pedido (5%) cuando corresponde
 *  5. verificación de compra mínima
 *  6. tarifa de servicio (3,5%) sobre el subtotal final
 *  7. propina
 *  8. total
 */

export const PROMO_TYPES = ["none", "percent", "price", "nxm", "second_unit"] as const;
export type PromoType = (typeof PROMO_TYPES)[number];

export const PROMO_TYPE_LABEL: Record<PromoType, string> = {
  none: "Sin promoción",
  percent: "Descuento porcentual",
  price: "Precio promocional",
  nxm: "Promoción por cantidad (2x1, 3x2…)",
  second_unit: "Segunda unidad con descuento",
};

export type Promotable = {
  price: number;
  sale_price?: number | null;
  promo_type?: string | null;
  promo_percent?: number | null;
  promo_buy_qty?: number | null;
  promo_pay_qty?: number | null;
};

export type LinePricing = {
  /** Precio de lista × cantidad. */
  original: number;
  /** Total a pagar por la línea, ya con promociones aplicadas. */
  total: number;
  /** Ahorro de la línea. */
  discount: number;
  /** Precio unitario efectivo. */
  unitEffective: number;
  /** Precio unitario mostrado en la tarjeta (sin depender de la cantidad). */
  unitDisplay: number;
  /** Etiqueta corta de la promoción: "20% OFF", "2x1", "2ª unidad -50%". */
  badge: string | null;
  /** % de descuento cuando la promo es de precio (no por cantidad). */
  percentOff: number | null;
};

const round = (n: number) => Math.round(n * 100) / 100;

/** Indica si el producto tiene hoy una promoción o descuento activo. */
export function hasActivePromo(p: Promotable): boolean {
  const type = promoTypeOf(p);
  if (type === "none") return false;
  if (type === "price") return (p.sale_price ?? 0) > 0 && (p.sale_price as number) < p.price;
  if (type === "percent") return (p.promo_percent ?? 0) > 0;
  if (type === "second_unit") return (p.promo_percent ?? 50) > 0;
  if (type === "nxm") {
    const buy = Math.max(2, p.promo_buy_qty ?? 2);
    const pay = p.promo_pay_qty ?? 1;
    return pay >= 1 && pay < buy;
  }
  return false;
}

function promoTypeOf(p: Promotable): PromoType {
  const t = (p.promo_type ?? "none") as PromoType;
  if (t !== "none" && PROMO_TYPES.includes(t)) return t;
  // Compatibilidad: si hay precio de oferta cargado, es promo de precio.
  if (p.sale_price != null && p.sale_price > 0 && p.sale_price < p.price) return "price";
  return "none";
}

/** Precio unitario base ya con promos de precio/porcentaje aplicadas. */
export function unitPrice(p: Promotable): number {
  const type = promoTypeOf(p);
  if (type === "price" && p.sale_price != null && p.sale_price > 0) return round(p.sale_price);
  if (type === "percent" && p.promo_percent) {
    return round(p.price * (1 - Math.min(Math.max(p.promo_percent, 0), 100) / 100));
  }
  return round(p.price);
}

export function priceLine(p: Promotable, qty: number): LinePricing {
  const q = Math.max(0, Math.floor(qty));
  const original = round(p.price * q);
  const type = promoTypeOf(p);

  if (type === "nxm") {
    const buy = Math.max(2, p.promo_buy_qty ?? 2);
    const pay = Math.max(1, Math.min(p.promo_pay_qty ?? 1, buy - 1));
    const paid = Math.floor(q / buy) * pay + (q % buy);
    const total = round(p.price * paid);
    return {
      original,
      total,
      discount: round(original - total),
      unitEffective: q ? round(total / q) : round(p.price),
      unitDisplay: round(p.price),
      badge: `${buy}x${pay}`,
      percentOff: null,
    };
  }

  if (type === "second_unit") {
    const pct = Math.min(Math.max(p.promo_percent ?? 50, 1), 100);
    const pairs = Math.floor(q / 2);
    const total = round(p.price * (q - pairs) + p.price * (1 - pct / 100) * pairs);
    return {
      original,
      total,
      discount: round(original - total),
      unitEffective: q ? round(total / q) : round(p.price),
      unitDisplay: round(p.price),
      badge: `2ª unidad -${Math.round(pct)}%`,
      percentOff: null,
    };
  }

  const unit = unitPrice(p);
  const total = round(unit * q);
  const percentOff = unit < p.price ? Math.round((1 - unit / p.price) * 100) : null;
  return {
    original,
    total,
    discount: round(original - total),
    unitEffective: unit,
    unitDisplay: unit,
    badge: percentOff ? `${percentOff}% OFF` : null,
    percentOff,
  };
}

export type CartTotals = {
  subtotalOriginal: number;
  promoDiscount: number;
  subtotalAfterPromos: number;
  firstOrderDiscount: number;
  subtotalFinal: number;
  serviceFee: number;
  shipping: number;
  freeShipping: boolean;
  tip: number;
  total: number;
  meetsMinimum: boolean;
  missingForMinimum: number;
};

export type TotalsOptions = {
  serviceFeePct: number;
  minOrder: number;
  firstOrderPct?: number;
  tip?: number;
  /** Costo de envío del comercio (0 = sin cargo). */
  deliveryFee?: number;
  /** Costo de la zona geográfica detectada; si viene, reemplaza al costo general. */
  zoneFee?: number | null;
  /** Monto a partir del cual el envío es gratis (0 = sin umbral). */
  freeShippingMin?: number;
  /** Si el pedido es con envío a domicilio. */
  isDelivery?: boolean;
};

export function cartTotals(
  lines: (Promotable & { qty: number })[],
  opts: TotalsOptions,
): CartTotals {
  let subtotalOriginal = 0;
  let subtotalAfterPromos = 0;
  for (const l of lines) {
    const r = priceLine(l, l.qty);
    subtotalOriginal += r.original;
    subtotalAfterPromos += r.total;
  }
  subtotalOriginal = round(subtotalOriginal);
  subtotalAfterPromos = round(subtotalAfterPromos);

  const firstOrderDiscount = round((subtotalAfterPromos * (opts.firstOrderPct ?? 0)) / 100);
  const subtotalFinal = round(subtotalAfterPromos - firstOrderDiscount);
  const serviceFee = round((subtotalFinal * opts.serviceFeePct) / 100);
  const tip = round(Math.max(0, opts.tip ?? 0));
  const fee = Math.max(0, opts.zoneFee ?? opts.deliveryFee ?? 0);
  const threshold = Math.max(0, opts.freeShippingMin ?? 0);
  const freeShipping = fee === 0 || (threshold > 0 && subtotalFinal >= threshold);
  const shipping = opts.isDelivery === false || freeShipping ? 0 : round(fee);

  return {
    subtotalOriginal,
    promoDiscount: round(subtotalOriginal - subtotalAfterPromos),
    subtotalAfterPromos,
    firstOrderDiscount,
    subtotalFinal,
    serviceFee,
    shipping,
    freeShipping,
    tip,
    total: round(subtotalFinal + serviceFee + shipping + tip),
    meetsMinimum: subtotalFinal >= opts.minOrder,
    missingForMinimum: Math.max(0, round(opts.minOrder - subtotalFinal)),
  };
}