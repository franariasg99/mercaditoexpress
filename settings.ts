import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DeliveryMode = "envio" | "retiro" | "ambos";

export type LogoShape = "circle" | "square" | "rect";

export type AppSettings = {
  payment_alias: string;
  store_whatsapp: string;
  delivery_fee: number;
  free_shipping_min: number;
  store_open: boolean;
  closed_message: string;
  min_order: number;
  service_fee_pct: number;
  first_order_discount_pct: number;
  store_name: string;
  store_tagline: string;
  store_logo_url: string | null;
  store_logo_shape: LogoShape;
  delivery_mode: DeliveryMode;
  pickup_address: string;
  brand_color: string;
  store_address: string;
  store_email: string;
  store_hours: string;
  cash_enabled: boolean;
};

export const DEFAULT_SETTINGS: AppSettings = {
  payment_alias: "Fran.ariasg99",
  store_whatsapp: "5492615585633",
  delivery_fee: 0,
  free_shipping_min: 0,
  store_open: true,
  closed_message: "En este momento no estamos tomando pedidos. Volvé más tarde.",
  min_order: 25000,
  service_fee_pct: 3.5,
  first_order_discount_pct: 5,
  store_name: "Mercadito Express",
  store_tagline: "Tu super, rápido y cerca",
  store_logo_url: null,
  store_logo_shape: "circle",
  delivery_mode: "ambos",
  pickup_address: "",
  brand_color: "#3f3fb0",
  store_address: "",
  store_email: "",
  store_hours: "",
  cash_enabled: true,
};

export const DELIVERY_MODE_LABEL: Record<DeliveryMode, string> = {
  envio: "Solo envío a domicilio",
  retiro: "Solo retiro en el local",
  ambos: "Envío a domicilio y retiro",
};

export const settingsQuery = (tenantId: string | null) =>
  queryOptions({
  queryKey: ["app-settings", tenantId],
  queryFn: async (): Promise<AppSettings> => {
    if (!tenantId) return DEFAULT_SETTINGS;
    const { data, error } = await supabase
      .from("app_settings")
      .select(
        "payment_alias, store_whatsapp, delivery_fee, free_shipping_min, store_open, closed_message, min_order, service_fee_pct, first_order_discount_pct, store_name, store_tagline, store_logo_url, store_logo_shape, delivery_mode, pickup_address, brand_color, store_address, store_email, store_hours, cash_enabled",
      )
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return DEFAULT_SETTINGS;
    const row = data as unknown as Record<string, unknown>;
    return {
      payment_alias: String(row["payment_alias"] ?? DEFAULT_SETTINGS.payment_alias),
      store_whatsapp: String(row["store_whatsapp"] ?? DEFAULT_SETTINGS.store_whatsapp),
      delivery_fee: Number(row["delivery_fee"] ?? 0),
      free_shipping_min: Number(row["free_shipping_min"] ?? 0),
      store_open: Boolean(row["store_open"]),
      closed_message: String(row["closed_message"] ?? DEFAULT_SETTINGS.closed_message),
      min_order: Number(row["min_order"] ?? DEFAULT_SETTINGS.min_order),
      service_fee_pct: Number(row["service_fee_pct"] ?? DEFAULT_SETTINGS.service_fee_pct),
      first_order_discount_pct: Number(
        row["first_order_discount_pct"] ?? DEFAULT_SETTINGS.first_order_discount_pct,
      ),
      store_name: String(row["store_name"] ?? DEFAULT_SETTINGS.store_name),
      store_tagline: String(row["store_tagline"] ?? DEFAULT_SETTINGS.store_tagline),
      store_logo_url: (row["store_logo_url"] as string | null) ?? null,
      store_logo_shape: ((row["store_logo_shape"] as LogoShape | null) ?? "circle"),
      delivery_mode: (row["delivery_mode"] as DeliveryMode) ?? "ambos",
      pickup_address: String(row["pickup_address"] ?? ""),
      brand_color: String(row["brand_color"] ?? DEFAULT_SETTINGS.brand_color),
      store_address: String(row["store_address"] ?? ""),
      store_email: String(row["store_email"] ?? ""),
      store_hours: String(row["store_hours"] ?? ""),
      cash_enabled: row["cash_enabled"] == null ? true : Boolean(row["cash_enabled"]),
    };
  },
})
