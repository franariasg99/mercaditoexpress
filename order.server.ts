import { createClient } from "@supabase/supabase-js";
import { cartTotals, priceLine } from "./pricing";
import { findZoneFor, toZone, type ShippingZone } from "./geo";

export type PlaceOrderPayload = {
  tenant_id: string;
  items: { product_id: string; qty: number }[];
  customer_name: string;
  phone: string;
  delivery_method: "envio" | "retiro";
  address: string | null;
  address_reference: string | null;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  delivery_slot_id: string | null;
  tip: number;
  location_confirmed: boolean;
  payment_method?: "transferencia" | "efectivo";
};

function admin() {
  return import("@/integrations/supabase/client.server").then((m) => m.supabaseAdmin);
}

/** Devuelve el usuario autenticado si el pedido llega con sesión, o null (invitado). */
export async function userFromBearer(bearer: string | null | undefined) {
  const token = bearer?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const client = createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data } = await client.auth.getUser(token);
  return data.user ?? null;
}

export async function fetchSlotUsage(tenantId: string): Promise<Record<string, number>> {
  const db = await admin();
  const { data } = await db
    .from("orders")
    .select("delivery_slot_id")
    .eq("tenant_id", tenantId)
    .not("delivery_slot_id", "is", null)
    .neq("status", "cancelado");
  const out: Record<string, number> = {};
  for (const row of data ?? []) {
    const id = row.delivery_slot_id as string;
    out[id] = (out[id] ?? 0) + 1;
  }
  return out;
}

const ORDER_FIELDS =
  "id, order_number, created_at, status, payment_status, payment_provider, delivery_method, total, address, address_reference, phone, notes, customer_name, latitude, longitude, delivery_date, delivery_time, subtotal_original, discount_total, first_order_discount, subtotal_final, service_fee, shipping_cost, tip, order_items(name, quantity, unit_price, image_url)";

export type OrderItemView = {
  name: string;
  quantity: number;
  unit_price: number;
  image_url: string | null;
};

export type OrderView = {
  id: string;
  order_number: number;
  created_at: string;
  status: string;
  payment_status: string;
  payment_provider: string;
  delivery_method: string;
  customer_name: string | null;
  phone: string | null;
  address: string | null;
  address_reference: string | null;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  delivery_date: string | null;
  delivery_time: string | null;
  subtotal_original: number;
  discount_total: number;
  first_order_discount: number;
  subtotal_final: number;
  service_fee: number;
  shipping_cost: number;
  tip: number;
  total: number;
  items: OrderItemView[];
};

export async function fetchOrder(id: string, token: string | null): Promise<OrderView | null> {
  const db = await admin();
  const { data, error } = await db
    .from("orders")
    .select(`${ORDER_FIELDS}, guest_token, user_id`)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  if (!token || data.guest_token !== token) return null;
  const o = data as unknown as Record<string, unknown> & {
    order_items: { name: string; quantity: number; unit_price: number; image_url: string | null }[];
  };
  const num = (v: unknown) => Number(v ?? 0);
  return {
    id: String(o["id"]),
    order_number: num(o["order_number"]),
    created_at: String(o["created_at"]),
    status: String(o["status"]),
    payment_status: String(o["payment_status"]),
    payment_provider: String(o["payment_provider"] ?? "transferencia"),
    delivery_method: String(o["delivery_method"]),
    customer_name: (o["customer_name"] as string | null) ?? null,
    phone: (o["phone"] as string | null) ?? null,
    address: (o["address"] as string | null) ?? null,
    address_reference: (o["address_reference"] as string | null) ?? null,
    notes: (o["notes"] as string | null) ?? null,
    latitude: o["latitude"] == null ? null : num(o["latitude"]),
    longitude: o["longitude"] == null ? null : num(o["longitude"]),
    delivery_date: (o["delivery_date"] as string | null) ?? null,
    delivery_time: (o["delivery_time"] as string | null) ?? null,
    subtotal_original: num(o["subtotal_original"]),
    discount_total: num(o["discount_total"]),
    first_order_discount: num(o["first_order_discount"]),
    subtotal_final: num(o["subtotal_final"]),
    service_fee: num(o["service_fee"]),
    shipping_cost: num(o["shipping_cost"]),
    tip: num(o["tip"]),
    total: num(o["total"]),
    items: o.order_items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unit_price: Number(i.unit_price),
      image_url: i.image_url,
    })),
  };
}

export async function createOrder(payload: PlaceOrderPayload, bearer: string | null) {
  const db = await admin();

  const { data: tenant } = await db
    .from("tenants")
    .select("id, status, name")
    .eq("id", payload.tenant_id)
    .maybeSingle();
  if (!tenant) throw new Error("La tienda no existe");
  if (!["active", "trial", "subscription_active"].includes(String(tenant.status))) {
    throw new Error("Esta tienda no está habilitada para recibir pedidos");
  }

  const { data: settings } = await db
    .from("app_settings")
    .select("*")
    .eq("tenant_id", payload.tenant_id)
    .maybeSingle();
  if (!settings) throw new Error("No se pudo leer la configuración de la tienda");
  if (!settings.store_open) throw new Error(settings.closed_message);

  if (payload.items.length === 0) throw new Error("Tu carrito está vacío");

  const deliveryMode = String(
    (settings as unknown as Record<string, unknown>)["delivery_mode"] ?? "ambos",
  );
  if (deliveryMode === "envio" && payload.delivery_method !== "envio") {
    throw new Error("Solo hacemos envíos a domicilio en este momento");
  }
  if (deliveryMode === "retiro" && payload.delivery_method !== "retiro") {
    throw new Error("Por ahora los pedidos son solo con retiro en el local");
  }

  if (payload.delivery_method === "envio") {
    if (!payload.address || payload.address.trim().length < 5) {
      throw new Error("Ingresá la dirección de entrega");
    }
    if (payload.latitude == null || payload.longitude == null) {
      throw new Error("Elegí tu dirección desde las sugerencias para finalizar el pedido");
    }
  }

  // Zonas de envío: validación por coordenadas (geofencing).
  let zone: ShippingZone | null = null;
  if (payload.delivery_method === "envio") {
    const { data: zoneRows } = await db
      .from("shipping_zones")
      .select("id, name, shipping_cost, is_active, sort_order, polygon")
      .eq("tenant_id", payload.tenant_id)
      .eq("is_active", true)
      .order("sort_order");
    const zones = (zoneRows ?? [])
      .map((r) => toZone(r as unknown as Record<string, unknown>))
      .filter((z) => z.polygon.length >= 3);
    if (zones.length > 0) {
      zone = findZoneFor(
        { lat: Number(payload.latitude), lng: Number(payload.longitude) },
        zones,
      );
      if (!zone) throw new Error("Lo sentimos, todavía no realizamos envíos a esta ubicación.");
    }
  }

  const ids = payload.items.map((i) => i.product_id);
  const { data: products } = await db
    .from("products")
    .select(
      "id, name, price, sale_price, stock, is_active, image_url, promo_type, promo_percent, promo_buy_qty, promo_pay_qty",
    )
    .eq("tenant_id", payload.tenant_id)
    .in("id", ids);

  const lines = payload.items.map((i) => {
    const p = products?.find((x) => x.id === i.product_id);
    if (!p || !p.is_active) throw new Error("Un producto del carrito ya no está disponible");
    const qty = Math.max(1, Math.floor(i.qty));
    if (qty > p.stock) throw new Error(`No hay stock suficiente de ${p.name} (quedan ${p.stock})`);
    return { product: p, qty };
  });

  const user = await userFromBearer(bearer);

  let firstOrderPct = 0;
  if (user) {
    const { data: profile } = await db
      .from("profiles")
      .select("first_order_discount_used")
      .eq("id", user.id)
      .maybeSingle();
    const { count } = await db
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", payload.tenant_id)
      .eq("user_id", user.id);
    if (!profile?.first_order_discount_used && (count ?? 0) === 0) {
      firstOrderPct = Number(settings.first_order_discount_pct);
    }
  }

  const totals = cartTotals(
    lines.map((l) => ({
      price: Number(l.product.price),
      sale_price: l.product.sale_price == null ? null : Number(l.product.sale_price),
      promo_type: l.product.promo_type,
      promo_percent: l.product.promo_percent == null ? null : Number(l.product.promo_percent),
      promo_buy_qty: l.product.promo_buy_qty,
      promo_pay_qty: l.product.promo_pay_qty,
      qty: l.qty,
    })),
    {
      serviceFeePct: Number(settings.service_fee_pct),
      minOrder: Number(settings.min_order),
      firstOrderPct,
      tip: Math.max(0, Number(payload.tip) || 0),
      deliveryFee: Number(settings.delivery_fee ?? 0),
      zoneFee: zone ? Number(zone.shipping_cost) : null,
      freeShippingMin: Number(settings.free_shipping_min ?? 0),
      isDelivery: payload.delivery_method === "envio",
    },
  );

  if (!totals.meetsMinimum) {
    throw new Error(
      `El monto mínimo de compra es de $${Number(settings.min_order).toLocaleString("es-AR")}.`,
    );
  }

  let deliveryDate: string | null = null;
  let deliveryTime: string | null = null;
  if (!payload.delivery_slot_id) {
    const { data: openDates } = await db
      .from("delivery_dates")
      .select("id, delivery_slots(id, is_active)")
      .eq("tenant_id", payload.tenant_id)
      .eq("is_active", true);
    const hasSlots = (openDates ?? []).some((d) =>
      ((d.delivery_slots ?? []) as { is_active: boolean }[]).some((s) => s.is_active),
    );
    if (hasSlots) throw new Error("Elegí una fecha y horario de entrega");
  } else {
    const { data: slot } = await db
      .from("delivery_slots")
      .select("id, start_time, end_time, max_orders, is_active, delivery_dates(date, is_active)")
      .eq("id", payload.delivery_slot_id)
      .eq("tenant_id", payload.tenant_id)
      .maybeSingle();
    const parent = slot?.delivery_dates as { date: string; is_active: boolean } | null;
    if (!slot || !slot.is_active || !parent?.is_active) {
      throw new Error("El horario de entrega elegido ya no está disponible");
    }
    if (slot.max_orders != null) {
      const { count } = await db
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("delivery_slot_id", slot.id)
        .neq("status", "cancelado");
      if ((count ?? 0) >= slot.max_orders) {
        throw new Error("Ese horario de entrega quedó completo, elegí otro");
      }
    }
    deliveryDate = parent.date;
    deliveryTime = `${slot.start_time} – ${slot.end_time}`;
  }

  // Descuenta stock de forma atómica antes de registrar el pedido.
  const { error: stockError } = await db.rpc("consume_stock", {
    _items: lines.map((l) => ({ id: l.product.id, qty: l.qty })),
  } as never);
  if (stockError) throw new Error("No hay stock suficiente para completar el pedido");

  const { data: order, error } = await db
    .from("orders")
    .insert({
      tenant_id: payload.tenant_id,
      user_id: user?.id ?? null,
      is_guest: !user,
      total: totals.total,
      subtotal_original: totals.subtotalOriginal,
      discount_total: totals.promoDiscount,
      first_order_discount: totals.firstOrderDiscount,
      subtotal_final: totals.subtotalFinal,
      service_fee: totals.serviceFee,
      shipping_cost: totals.shipping,
      shipping_zone_id: zone?.id ?? null,
      shipping_zone_name: zone?.name ?? null,
      tip: totals.tip,
      customer_name: payload.customer_name,
      phone: payload.phone,
      address: payload.delivery_method === "envio" ? payload.address : null,
      address_reference: payload.address_reference,
      notes: payload.notes,
      latitude: payload.latitude,
      longitude: payload.longitude,
      location_confirmed: payload.delivery_method === "envio" ? payload.location_confirmed : false,
      delivery_method: payload.delivery_method,
      delivery_slot_id: payload.delivery_slot_id,
      delivery_date: deliveryDate,
      delivery_time: deliveryTime,
      payment_status: "pendiente",
      payment_provider: payload.payment_method === "efectivo" ? "efectivo" : "transferencia",
      status: "recibido",
    })
    .select("id, order_number, guest_token")
    .single();
  if (error || !order) throw new Error("No se pudo registrar el pedido");

  await db.from("order_items").insert(
    lines.map((l) => {
      const r = priceLine(
        {
          price: Number(l.product.price),
          sale_price: l.product.sale_price == null ? null : Number(l.product.sale_price),
          promo_type: l.product.promo_type,
          promo_percent: l.product.promo_percent == null ? null : Number(l.product.promo_percent),
          promo_buy_qty: l.product.promo_buy_qty,
          promo_pay_qty: l.product.promo_pay_qty,
        },
        l.qty,
      );
      return {
        tenant_id: payload.tenant_id,
        order_id: order.id,
        product_id: l.product.id,
        name: l.product.name,
        unit_price: r.unitEffective,
        quantity: l.qty,
        image_url: l.product.image_url,
      };
    }),
  );

  if (user && firstOrderPct > 0) {
    await db
      .from("profiles")
      .update({ first_order_discount_used: true, first_order_discount_order_id: order.id })
      .eq("id", user.id);
  }

  return { id: order.id, order_number: order.order_number, token: order.guest_token };
}