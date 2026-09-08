import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { deliveryDatesQuery, formatDeliveryDate, slotLabel, slotUsageQuery } from "@/lib/delivery";
import { useAdminTenant } from "@/hooks/useAuth";
import { shippingZonesQuery, type ShippingZone } from "@/lib/zones";
import { money } from "@/lib/format";

/** Selector de zonas de entrega (1 o más). Ninguna marcada = todas las zonas. */
function ZonePicker({
  zones,
  selected,
  onToggle,
}: {
  zones: ShippingZone[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  if (zones.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {zones.map((z) => {
        const on = selected.includes(z.id);
        return (
          <button
            key={z.id}
            type="button"
            onClick={() => onToggle(z.id)}
            className={`rounded-full border px-2 py-1 text-xs font-medium transition ${
              on ? "border-brand bg-brand text-brand-foreground" : "border-border bg-background"
            }`}
          >
            {on ? "✓ " : ""}
            {z.name}
          </button>
        );
      })}
    </div>
  );
}

export function DeliveryAdmin() {
  const qc = useQueryClient();
  const { tenantId } = useAdminTenant();
  const dates = useQuery(deliveryDatesQuery(tenantId));
  const usage = useQuery(slotUsageQuery(tenantId));
  const zonesQ = useQuery(shippingZonesQuery(tenantId));
  const zones = zonesQ.data ?? [];
  const [newDate, setNewDate] = useState("");

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["delivery-dates"] });
    void qc.invalidateQueries({ queryKey: ["slot-usage"] });
  };

  async function addDate() {
    if (!newDate) {
      toast.error("Elegí una fecha");
      return;
    }
    const { error } = await supabase.from("delivery_dates").insert({ date: newDate, tenant_id: tenantId ?? "" });
    if (error) toast.error("No se pudo crear la fecha");
    else {
      setNewDate("");
      toast.success("Fecha creada");
      refresh();
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-display text-base font-bold">🗓️ Fechas y horarios de entrega</h2>
        <div className="mt-3 flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="new-date">Nueva fecha</Label>
            <Input
              id="new-date"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </div>
          <Button onClick={() => void addDate()}>Agregar</Button>
        </div>
      </section>

      {(dates.data ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground">Todavía no hay fechas de entrega cargadas.</p>
      )}

      {(dates.data ?? []).map((d) => (
        <section key={d.id} className="space-y-3 rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">
              {formatDeliveryDate(d.date)} {d.is_active ? "" : "· inactiva"}
            </p>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await supabase
                    .from("delivery_dates")
                    .update({ is_active: !d.is_active })
                    .eq("id", d.id);
                  refresh();
                }}
              >
                {d.is_active ? "Desactivar" : "Activar"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const { error } = await supabase.from("delivery_dates").delete().eq("id", d.id);
                  if (error) toast.error("No se puede eliminar: tiene pedidos asociados");
                  else refresh();
                }}
              >
                Eliminar
              </Button>
            </div>
          </div>

          <ul className="space-y-2">
            {d.delivery_slots.map((s) => {
              const used = usage.data?.[s.id] ?? 0;
              const full = s.max_orders != null && used >= s.max_orders;
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background p-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {slotLabel(s)} {s.is_active ? "" : "· inactivo"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {used} pedido{used === 1 ? "" : "s"}
                      {s.max_orders != null ? ` / ${s.max_orders}` : " · sin límite"}
                      {full ? " · COMPLETO" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      📍{" "}
                      {s.zone_ids.length === 0
                        ? "Todas las zonas"
                        : zones
                            .filter((z) => s.zone_ids.includes(z.id))
                            .map((z) => `${z.name}${z.shipping_cost > 0 ? ` (${money(z.shipping_cost)})` : ""}`)
                            .join(" · ") || "Zonas eliminadas"}
                    </p>
                    <div className="mt-1">
                      <ZonePicker
                        zones={zones}
                        selected={s.zone_ids}
                        onToggle={async (zid) => {
                          const next = s.zone_ids.includes(zid)
                            ? s.zone_ids.filter((x) => x !== zid)
                            : [...s.zone_ids, zid];
                          const { error } = await supabase
                            .from("delivery_slots")
                            .update({ zone_ids: next })
                            .eq("id", s.id);
                          if (error) toast.error("No se pudieron guardar las zonas");
                          else refresh();
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const raw = window.prompt(
                          "Capacidad máxima de pedidos (vacío = sin límite)",
                          s.max_orders == null ? "" : String(s.max_orders),
                        );
                        if (raw === null) return;
                        const max = raw.trim() === "" ? null : Math.max(1, Number(raw) || 1);
                        await supabase
                          .from("delivery_slots")
                          .update({ max_orders: max })
                          .eq("id", s.id);
                        refresh();
                      }}
                    >
                      Cupo
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await supabase
                          .from("delivery_slots")
                          .update({ is_active: !s.is_active })
                          .eq("id", s.id);
                        refresh();
                      }}
                    >
                      {s.is_active ? "Off" : "On"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const { error } = await supabase
                          .from("delivery_slots")
                          .delete()
                          .eq("id", s.id);
                        if (error) toast.error("No se puede eliminar: tiene pedidos asociados");
                        else refresh();
                      }}
                    >
                      🗑
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>

          <NewSlot dateId={d.id} zones={zones} onDone={refresh} />
        </section>
      ))}
    </div>
  );
}

function NewSlot({
  dateId,
  zones,
  onDone,
}: {
  dateId: string;
  zones: ShippingZone[];
  onDone: () => void;
}) {
  const { tenantId } = useAdminTenant();
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("12:00");
  const [max, setMax] = useState("");
  const [zoneIds, setZoneIds] = useState<string[]>([]);

  return (
    <div className="space-y-2">
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <Label htmlFor={`s-${dateId}`}>Desde</Label>
        <Input id={`s-${dateId}`} type="time" value={start} onChange={(e) => setStart(e.target.value)} />
      </div>
      <div className="flex-1">
        <Label htmlFor={`e-${dateId}`}>Hasta</Label>
        <Input id={`e-${dateId}`} type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>
      <div className="w-20">
        <Label htmlFor={`m-${dateId}`}>Cupo</Label>
        <Input
          id={`m-${dateId}`}
          inputMode="numeric"
          value={max}
          placeholder="∞"
          onChange={(e) => setMax(e.target.value)}
        />
      </div>
      <Button
        onClick={async () => {
          const { error } = await supabase.from("delivery_slots").insert({
            tenant_id: tenantId ?? "",
            date_id: dateId,
            start_time: start,
            end_time: end,
            max_orders: max.trim() === "" ? null : Math.max(1, Number(max) || 1),
            zone_ids: zoneIds,
          });
          if (error) toast.error("No se pudo crear el horario");
          else {
            toast.success("Horario agregado");
            setZoneIds([]);
            onDone();
          }
        }}
      >
        +
      </Button>
    </div>
      {zones.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Zonas de entrega para este horario (podés marcar 1 o más; sin marcar = todas).
          </p>
          <ZonePicker
            zones={zones}
            selected={zoneIds}
            onToggle={(id) =>
              setZoneIds((prev) =>
                prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
              )
            }
          />
        </div>
      )}
    </div>
  );
}