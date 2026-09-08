import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getSlotUsage } from "./store.functions";

export type DeliverySlot = {
  id: string;
  date_id: string;
  start_time: string;
  end_time: string;
  max_orders: number | null;
  is_active: boolean;
  sort_order: number;
  /** Zonas de envío a las que aplica este horario. Vacío = todas las zonas. */
  zone_ids: string[];
};

export type DeliveryDate = {
  id: string;
  date: string;
  is_active: boolean;
  delivery_slots: DeliverySlot[];
};

export const deliveryDatesQuery = (tenantId: string | null) =>
  queryOptions({
  queryKey: ["delivery-dates", tenantId],
  queryFn: async (): Promise<DeliveryDate[]> => {
    if (!tenantId) return [];
    const { data, error } = await supabase
      .from("delivery_dates")
      .select(
        "id, date, is_active, delivery_slots(id, date_id, start_time, end_time, max_orders, is_active, sort_order, zone_ids)",
      )
      .eq("tenant_id", tenantId)
      .order("date");
    if (error) throw error;
    return (data ?? []).map((d) => ({
      ...d,
      delivery_slots: [...(d.delivery_slots ?? [])]
        .map((s) => ({ ...s, zone_ids: (s as { zone_ids?: string[] | null }).zone_ids ?? [] }))
        .sort(
        (a, b) => a.sort_order - b.sort_order || a.start_time.localeCompare(b.start_time),
      ),
    })) as DeliveryDate[];
  },
})

export const slotUsageQuery = (tenantId: string | null) =>
  queryOptions({
    queryKey: ["slot-usage", tenantId],
    queryFn: async (): Promise<Record<string, number>> =>
      tenantId ? getSlotUsage({ data: { tenant_id: tenantId } }) : {},
  });

export function formatDeliveryDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y!, (m ?? 1) - 1, d ?? 1);
  const txt = date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

/** ¿Este horario aplica a la zona del cliente? Sin zonas asignadas = aplica a todas. */
export function slotMatchesZone(slot: DeliverySlot, zoneId: string | null): boolean {
  if (slot.zone_ids.length === 0) return true;
  return zoneId != null && slot.zone_ids.includes(zoneId);
}

export function slotLabel(s: DeliverySlot): string {
  return `${s.start_time} – ${s.end_time}`;
}