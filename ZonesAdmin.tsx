import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ClientOnly } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAdminTenant } from "@/hooks/useAuth";
import { money } from "@/lib/format";
import { shippingZonesQuery, type ShippingZone, type ZonePoint } from "@/lib/zones";
import { ZoneMapEditor } from "@/components/admin/ZoneMapEditor";

export function ZonesAdmin() {
  const qc = useQueryClient();
  const { tenantId } = useAdminTenant();
  const zones = useQuery(shippingZonesQuery(tenantId));
  const list = zones.data ?? [];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [cost, setCost] = useState("0");
  const [points, setPoints] = useState<ZonePoint[]>([]);
  const [saving, setSaving] = useState(false);

  const refresh = () => void qc.invalidateQueries({ queryKey: ["shipping-zones"] });

  function startNew() {
    setEditingId("new");
    setName(`Zona ${list.length + 1}`);
    setCost("0");
    setPoints([]);
  }

  function startEdit(z: ShippingZone) {
    setEditingId(z.id);
    setName(z.name);
    setCost(String(z.shipping_cost));
    setPoints(z.polygon);
  }

  async function save() {
    if (!tenantId) return;
    if (name.trim().length < 2) {
      toast.error("Poné un nombre para la zona");
      return;
    }
    if (points.length < 3) {
      toast.error("Dibujá al menos 3 puntos sobre el mapa");
      return;
    }
    setSaving(true);
    const payload = {
      tenant_id: tenantId,
      name: name.trim(),
      shipping_cost: Math.max(0, Number(cost) || 0),
      polygon: points as unknown as never,
    };
    const { error } =
      editingId === "new"
        ? await supabase.from("shipping_zones").insert({ ...payload, sort_order: list.length })
        : await supabase.from("shipping_zones").update(payload).eq("id", editingId!);
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar la zona");
      return;
    }
    toast.success("Zona guardada");
    setEditingId(null);
    refresh();
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-display text-base font-bold">🗺️ Zonas de envío</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Dibujá en el mapa las zonas a las que hacés envíos y asigná un costo a cada una. Si la
          dirección del cliente cae fuera de todas las zonas activas, no va a poder elegir envío a
          domicilio.
        </p>
        {editingId === null && (
          <Button className="mt-3" onClick={startNew}>
            + Nueva zona
          </Button>
        )}
      </section>

      {editingId !== null && (
        <section className="space-y-3 rounded-2xl border border-brand bg-surface p-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="zone-name">Nombre</Label>
              <Input
                id="zone-name"
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="zone-cost">Costo de envío ($)</Label>
              <Input
                id="zone-cost"
                inputMode="numeric"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </div>
          </div>

          <ClientOnly fallback={<div className="h-72 rounded-xl bg-muted" />}>
            <ZoneMapEditor
              points={points}
              others={list
                .filter((z) => z.id !== editingId)
                .map((z) => ({ id: z.id, polygon: z.polygon, name: z.name, active: z.is_active }))}
              onChange={setPoints}
            />
          </ClientOnly>

          <p className="text-xs text-muted-foreground">
            Tocá el mapa para agregar puntos, arrastralos para moverlos y hacé clic derecho (o
            mantené presionado) sobre un punto para borrarlo. {points.length} punto
            {points.length === 1 ? "" : "s"}.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? "Guardando…" : "Guardar zona"}
            </Button>
            <Button variant="outline" onClick={() => setPoints([])} disabled={points.length === 0}>
              Limpiar puntos
            </Button>
            <Button
              variant="outline"
              onClick={() => setPoints((p) => p.slice(0, -1))}
              disabled={points.length === 0}
            >
              Deshacer punto
            </Button>
            <Button variant="ghost" onClick={() => setEditingId(null)}>
              Cancelar
            </Button>
          </div>
        </section>
      )}

      {list.length === 0 && editingId === null && (
        <p className="text-sm text-muted-foreground">
          Todavía no hay zonas cargadas. Sin zonas, el envío usa el costo general de la tienda.
        </p>
      )}

      <ul className="space-y-2">
        {list.map((z) => (
          <li
            key={z.id}
            className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-surface p-3 text-sm"
          >
            <div className="min-w-0">
              <p className="font-semibold">
                {z.name} {z.is_active ? "" : "· inactiva"}
              </p>
              <p className="text-xs text-muted-foreground">
                {z.shipping_cost > 0 ? money(z.shipping_cost) : "Envío sin cargo"} ·{" "}
                {z.polygon.length} puntos
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button size="sm" variant="outline" onClick={() => startEdit(z)}>
                Editar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await supabase
                    .from("shipping_zones")
                    .update({ is_active: !z.is_active })
                    .eq("id", z.id);
                  refresh();
                }}
              >
                {z.is_active ? "Off" : "On"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  if (!window.confirm(`¿Eliminar la zona "${z.name}"?`)) return;
                  const { error } = await supabase.from("shipping_zones").delete().eq("id", z.id);
                  if (error) toast.error("No se pudo eliminar la zona");
                  else {
                    if (editingId === z.id) setEditingId(null);
                    refresh();
                  }
                }}
              >
                🗑
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
