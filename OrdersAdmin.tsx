import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useMarkOrdersSeen } from "@/hooks/useNewOrders";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { googleMapsUrl } from "@/components/market/LocationPicker";
import { supabase } from "@/integrations/supabase/client";
import { useAdminTenant } from "@/hooks/useAuth";
import { money } from "@/lib/format";
import {
  DELIVERY_LABEL,
  ORDER_STATUSES,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABEL,
  orderCode,
} from "@/lib/orders";

type AdminOrder = {
  id: string;
  order_number: number;
  created_at: string;
  status: string;
  payment_status: string;
  payment_provider: string | null;
  delivery_method: string;
  customer_name: string | null;
  phone: string | null;
  address: string | null;
  address_reference: string | null;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  location_confirmed: boolean | null;
  delivery_date: string | null;
  delivery_time: string | null;
  is_guest: boolean;
  subtotal_original: number;
  discount_total: number;
  first_order_discount: number;
  subtotal_final: number;
  service_fee: number;
  tip: number;
  total: number;
  order_items: { name: string; quantity: number; unit_price: number }[];
};

function useAdminOrders(tenantId: string | null) {
  return useQuery({
    queryKey: ["admin-orders", tenantId],
    queryFn: async (): Promise<AdminOrder[]> => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_number, created_at, status, payment_status, payment_provider, delivery_method, customer_name, phone, address, address_reference, notes, latitude, longitude, location_confirmed, delivery_date, delivery_time, is_guest, subtotal_original, discount_total, first_order_discount, subtotal_final, service_fee, tip, total, order_items(name, quantity, unit_price)",
        )
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as AdminOrder[];
    },
  });
}

function dateLabel(dateStr: string | null) {
  if (dateStr === "__pickup__") return "🏪 Retiro en el local · a coordinar";
  if (!dateStr) return "Sin fecha de entrega";
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = d.getTime() === today.getTime();
  const formatted = d.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return isToday ? `📅 Hoy · ${formatted}` : formatted;
}


export function OrdersAdmin() {
  const qc = useQueryClient();
  const { tenantId } = useAdminTenant();
  const orders = useAdminOrders(tenantId);
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({});
  const markSeen = useMarkOrdersSeen();

  // Al ver el listado, los pedidos nuevos dejan de estar "sin ver" (se apaga el badge)
  useEffect(() => {
    const ids = (orders.data ?? []).filter((o) => o.status === "recibido").map((o) => o.id);
    if (ids.length) markSeen(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders.data]);



  const filtered = (orders.data ?? []).filter((o) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return [String(o.order_number), o.customer_name ?? "", o.phone ?? "", o.address ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(t);
  });

  const groups = filtered.reduce<Record<string, AdminOrder[]>>((acc, o) => {
    const key = o.delivery_date ?? (o.delivery_method === "retiro" ? "__pickup__" : "__none__");
    if (!acc[key]) acc[key] = [];
    acc[key].push(o);
    return acc;
  }, {});

  const rank = (k: string) => (k === "__pickup__" ? 1 : k === "__none__" ? 2 : 0);
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    if (rank(a) !== 0) return 0;
    return new Date(b).getTime() - new Date(a).getTime();
  });


  async function update(id: string, patch: { status?: string; payment_status?: string }) {
    const { error } = await supabase.from("orders").update(patch).eq("id", id);
    if (error) toast.error("No se pudo actualizar el pedido");
    else {
      toast.success("Pedido actualizado");
      void qc.invalidateQueries({ queryKey: ["admin-orders"] });
    }
  }

  async function removeOrder(id: string, num: number) {
    if (!window.confirm(`¿Eliminar el pedido #${num}? Esta acción no se puede deshacer.`)) return;
    const { error: itemsError } = await supabase.from("order_items").delete().eq("order_id", id);
    if (itemsError) {
      toast.error("No se pudo eliminar el pedido");
      return;
    }
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) toast.error("No se pudo eliminar el pedido");
    else {
      toast.success("Pedido eliminado");
      void qc.invalidateQueries({ queryKey: ["admin-orders"] });
    }
  }

  async function removeDay(label: string, items: AdminOrder[]) {
    if (
      !window.confirm(
        `¿Eliminar los ${items.length} pedidos de "${label}"? Esta acción no se puede deshacer.`,
      )
    )
      return;
    const ids = items.map((o) => o.id);
    const { error: itemsError } = await supabase.from("order_items").delete().in("order_id", ids);
    if (itemsError) {
      toast.error("No se pudieron eliminar los pedidos");
      return;
    }
    const { error } = await supabase.from("orders").delete().in("id", ids);
    if (error) toast.error("No se pudieron eliminar los pedidos");
    else {
      toast.success("Pedidos del día eliminados");
      void qc.invalidateQueries({ queryKey: ["admin-orders"] });
    }
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder="Buscar por número, cliente, teléfono o dirección"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {orders.isLoading && <p className="text-sm text-muted-foreground">Cargando pedidos…</p>}
      {!orders.isLoading && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">No hay pedidos para mostrar.</p>
      )}

      <div className="space-y-4">
        {sortedKeys.map((key) => {
          const items = groups[key]!;
          const label = dateLabel(key === "__none__" ? null : key);
          const isCollapsed = collapsedDates[key] ?? false;
          const dayTotal = items.reduce((sum, o) => sum + o.total, 0);
          return (
            <section key={key} className="rounded-2xl border border-border bg-surface">
              <div className="flex items-center gap-2 p-4">
                <button
                  type="button"
                  onClick={() => setCollapsedDates((s) => ({ ...s, [key]: !s[key] }))}
                  className="flex flex-1 items-center justify-between gap-2 text-left"
                >
                  <div>
                    <h3 className="font-display text-sm font-bold uppercase tracking-wide">
                      {label}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {items.length} pedido{items.length === 1 ? "" : "s"} · Total: {money(dayTotal)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold">{isCollapsed ? "▼" : "▲"}</span>
                </button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-destructive"
                  onClick={() => void removeDay(label, items)}
                >
                  Eliminar día
                </Button>
              </div>

              {!isCollapsed && (
                <div className="space-y-3 border-t border-border p-3">
                  {items.map((o) => {
                    const open = openId === o.id;
                    return (
                      <article key={o.id} className="rounded-xl border border-border bg-background">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-2 p-3 text-left"
                          onClick={() => setOpenId(open ? null : o.id)}
                        >
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 text-sm font-semibold">
                              <span className="truncate">
                                {orderCode(o.order_number)} · {o.customer_name ?? "Cliente"}
                              </span>
                              <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                                {o.delivery_method === "retiro" ? "🏪 Retiro" : "🚚 Envío"}
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(o.created_at).toLocaleString("es-AR")} ·{" "}
                              {ORDER_STATUS_LABEL[o.status] ?? o.status} ·{" "}
                              {PAYMENT_STATUS_LABEL[o.payment_status] ?? o.payment_status}
                            </p>
                          </div>

                          <span className="shrink-0 text-sm font-semibold">{money(o.total)}</span>
                        </button>

                        {open && (
                          <div className="space-y-3 border-t border-border p-3 text-sm">
                            <dl className="grid grid-cols-2 gap-2">
                              <Info label="Cliente" value={o.customer_name ?? "—"} />
                              <Info label="Teléfono" value={o.phone ?? "—"} />
                              <Info label="Tipo de cuenta" value={o.is_guest ? "Invitado" : "Registrado"} />
                              <Info label="Entrega" value={DELIVERY_LABEL[o.delivery_method] ?? o.delivery_method} />
                              <Info
                                label="Método de pago"
                                value={o.payment_provider === "efectivo" ? "Efectivo" : "Transferencia"}
                              />
                              <Info
                                label="Fecha y horario"
                                value={o.delivery_date ? `${o.delivery_date} · ${o.delivery_time ?? ""}` : "A coordinar"}
                              />
                              <Info label="Referencia" value={o.address_reference ?? "—"} />
                              <Info label="Dirección" value={o.address ?? "—"} />
                              <Info
                                label="Ubicación GPS"
                                value={
                                  o.latitude != null && o.longitude != null
                                    ? `${o.latitude}, ${o.longitude}${o.location_confirmed ? " ✓" : ""}`
                                    : "Sin coordenadas"
                                }
                              />
                            </dl>
                            {o.notes && <p className="text-muted-foreground">Notas: {o.notes}</p>}

                            {o.latitude != null && o.longitude != null && (
                              <Button asChild variant="secondary" className="w-full">
                                <a
                                  href={googleMapsUrl(o.latitude, o.longitude)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  📍 Abrir ubicación en Google Maps
                                </a>
                              </Button>
                            )}

                            <ul className="space-y-1">
                              {o.order_items.map((i, idx) => (
                                <li key={idx} className="flex justify-between">
                                  <span>
                                    {i.quantity}× {i.name}
                                  </span>
                                  <span>{money(i.unit_price * i.quantity)}</span>
                                </li>
                              ))}
                            </ul>

                            <div className="space-y-1 rounded-xl bg-surface p-3">
                              <Row label="Subtotal original" value={money(o.subtotal_original)} />
                              {o.discount_total > 0 && (
                                <Row label="Promociones" value={`-${money(o.discount_total)}`} />
                              )}
                              {o.first_order_discount > 0 && (
                                <Row label="Descuento 1er pedido" value={`-${money(o.first_order_discount)}`} />
                              )}
                              <Row label="Subtotal" value={money(o.subtotal_final)} />
                              <Row label="Tarifa de servicio" value={money(o.service_fee)} />
                              {o.tip > 0 && <Row label="Propina" value={money(o.tip)} />}
                              <Row label="Total" value={money(o.total)} strong />
                            </div>

                            <div className="grid gap-2">
                              <label className="text-xs font-medium" htmlFor={`st-${o.id}`}>
                                Estado del pedido
                              </label>
                              <select
                                id={`st-${o.id}`}
                                className="h-10 rounded-xl border border-border bg-background px-3"
                                value={o.status}
                                onChange={(e) => void update(o.id, { status: e.target.value })}
                              >
                                {ORDER_STATUSES.map((s) => (
                                  <option key={s} value={s}>
                                    {ORDER_STATUS_LABEL[s]}
                                  </option>
                                ))}
                              </select>
                              <label className="text-xs font-medium" htmlFor={`pay-${o.id}`}>
                                Estado del pago
                              </label>
                              <select
                                id={`pay-${o.id}`}
                                className="h-10 rounded-xl border border-border bg-background px-3"
                                value={o.payment_status}
                                onChange={(e) => void update(o.id, { payment_status: e.target.value })}
                              >
                                {PAYMENT_STATUSES.map((s) => (
                                  <option key={s} value={s}>
                                    {PAYMENT_STATUS_LABEL[s]}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={() => void removeOrder(o.id, o.order_number)}
                              className="h-10 rounded-xl bg-destructive px-3 text-sm font-semibold text-destructive-foreground"
                            >
                              Eliminar pedido
                            </button>

                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words font-medium">{value}</dd>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "font-bold" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
