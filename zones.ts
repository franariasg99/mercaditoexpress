import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toZone, type ShippingZone } from "./geo";

export * from "./geo";

export const shippingZonesQuery = (tenantId: string | null) =>
  queryOptions({
    queryKey: ["shipping-zones", tenantId],
    queryFn: async (): Promise<ShippingZone[]> => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("shipping_zones")
        .select("id, name, shipping_cost, is_active, sort_order, polygon")
        .eq("tenant_id", tenantId)
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return (data ?? []).map((r) => toZone(r as unknown as Record<string, unknown>));
    },
  });
