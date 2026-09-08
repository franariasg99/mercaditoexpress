import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminTenant } from "@/hooks/useAuth";

const SEEN_KEY = "me_seen_order_ids";

function readSeen(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeSeen(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    // guardamos como mucho los últimos 500 ids
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(ids.slice(-500)));
  } catch {
    /* noop */
  }
}

/** Marca pedidos como vistos (se llama al abrir el panel de pedidos). */
export function markOrdersSeen(ids: string[]) {
  if (!ids.length) return;
  const seen = new Set(readSeen());
  let changed = false;
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      changed = true;
    }
  }
  if (changed) writeSeen([...seen]);
  return changed;
}

/**
 * Cantidad de pedidos nuevos (estado "recibido") aún no vistos por el admin.
 * Se refresca automáticamente cada 20 segundos.
 */
export function useNewOrdersCount() {
  const { tenantId } = useAdminTenant();

  const q = useQuery({
    queryKey: ["new-orders-count", tenantId],
    enabled: Boolean(tenantId),
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id")
        .eq("tenant_id", tenantId!)
        .eq("status", "recibido");
      if (error) throw error;
      const seen = new Set(readSeen());
      return (data ?? []).filter((o) => !seen.has(o.id)).length;
    },
  });

  return { count: q.data ?? 0, isAdminStore: Boolean(tenantId) };
}

/** Hook helper para marcar como vistos e invalidar el badge. */
export function useMarkOrdersSeen() {
  const qc = useQueryClient();
  return (ids: string[]) => {
    if (markOrdersSeen(ids)) {
      qc.invalidateQueries({ queryKey: ["new-orders-count"] });
    }
  };
}
