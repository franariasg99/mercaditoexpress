import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PlatformSettings = {
  monthly_subscription_price: number;
  whatsapp_contact_number: string;
  payment_alias: string;
};

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  monthly_subscription_price: 25000,
  whatsapp_contact_number: "5492615585633",
  payment_alias: "Fran.ariasg99",
};

export const platformSettingsQuery = () =>
  queryOptions({
    queryKey: ["platform-settings"],
    queryFn: async (): Promise<PlatformSettings> => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("monthly_subscription_price, whatsapp_contact_number, payment_alias")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return DEFAULT_PLATFORM_SETTINGS;
      const row = data as unknown as Record<string, unknown>;
      return {
        monthly_subscription_price: Number(
          row["monthly_subscription_price"] ?? DEFAULT_PLATFORM_SETTINGS.monthly_subscription_price,
        ),
        whatsapp_contact_number: String(
          row["whatsapp_contact_number"] ?? DEFAULT_PLATFORM_SETTINGS.whatsapp_contact_number,
        ),
        payment_alias: String(row["payment_alias"] ?? DEFAULT_PLATFORM_SETTINGS.payment_alias),
      };
    },
    staleTime: 60_000,
  });

/** Normaliza un número local argentino al formato internacional de WhatsApp. */
export function waNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("54")) return digits;
  if (digits.length === 10) return `549${digits}`;
  return digits;
}

export function waLink(raw: string, message: string): string {
  return `https://wa.me/${waNumber(raw)}?text=${encodeURIComponent(message)}`;
}

/** Día de cobro mensual (1-31) derivado de la fecha de alta del comercio. */
export function billingDay(createdAtISO: string): number {
  return new Date(createdAtISO).getDate();
}

/** Próxima fecha de pago mensual a partir del día de alta. */
export function nextBillingDate(createdAtISO: string, from: Date = new Date()): Date {
  const day = billingDay(createdAtISO);
  const inMonth = (y: number, m: number) =>
    new Date(y, m, Math.min(day, new Date(y, m + 1, 0).getDate()));
  const candidate = inMonth(from.getFullYear(), from.getMonth());
  if (candidate.getTime() >= new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime())
    return candidate;
  return inMonth(from.getFullYear(), from.getMonth() + 1);
}

export function formatDateAR(d: Date): string {
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
