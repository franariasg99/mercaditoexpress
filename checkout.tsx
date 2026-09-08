import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Header } from "@/components/market/Header";
import { ProductImage } from "@/components/market/ProductImage";
import { AliasBox } from "@/components/market/AliasBox";
import { LocationPicker, type LatLng } from "@/components/market/LocationPicker";
import {
  AddressAutocomplete,
  type SelectedAddress,
} from "@/components/market/AddressAutocomplete";
import { ClientOnly } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/lib/cart";
import { money } from "@/lib/format";
import { cartTotals, priceLine } from "@/lib/pricing";
import { DEFAULT_SETTINGS, settingsQuery } from "@/lib/settings";
import { useTenantId } from "@/lib/tenant";
import {
  deliveryDatesQuery,
  formatDeliveryDate,
  slotLabel,
  slotMatchesZone,
  type DeliveryDate,
  slotUsageQuery,
} from "@/lib/delivery";
import { placeOrder } from "@/lib/store.functions";
import { findZoneFor, shippingZonesQuery } from "@/lib/zones";
import type { DeliveryMethod } from "@/lib/orders";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Finalizar compra — Mercadito Express" },
      {
        name: "description",
        content:
          "Elegí fecha y horario de entrega, pagá por transferencia y confirmá tu pedido en Mercadito Express.",
      },
      { property: "og:title", content: "Finalizar compra — Mercadito Express" },
      { property: "og:description", content: "Checkout de Mercadito Express." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CheckoutPage,
});


const schema = z.object({
  customer_name: z.string().trim().min(3, "Ingresá tu nombre y apellido").max(80),
  phone: z
    .string()
    .trim()
    .min(8, "Ingresá tu número de WhatsApp")
    .max(30)
    .regex(/^[0-9+\s()-]+$/, "El WhatsApp solo puede tener números"),
  notes: z.string().trim().max(300).optional(),
  address_reference: z.string().trim().max(200).optional(),
  delivery_method: z.enum(["envio", "retiro"]),
  address: z.string().trim().max(200).optional(),
});

function CheckoutPage() {
  const { lines, clear } = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();
  const tenantId = useTenantId();
  const settings = useQuery(settingsQuery(tenantId)).data ?? DEFAULT_SETTINGS;
  const dates = useQuery(deliveryDatesQuery(tenantId));
  const usage = useQuery(slotUsageQuery(tenantId));
  const zonesQ = useQuery(shippingZonesQuery(tenantId));

  const eligible = useQuery({
    queryKey: ["first-order-eligible", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_order_discount_used")
        .eq("id", user!.id)
        .maybeSingle();
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true });
      return !profile?.first_order_discount_used && (count ?? 0) === 0;
    },
  });

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<SelectedAddress | null>(null);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [payMethod, setPayMethod] = useState<"transferencia" | "efectivo">("transferencia");
  const [delivery, setDelivery] = useState<DeliveryMethod>(
    settings.delivery_mode === "retiro" ? "retiro" : "envio",
  );
  const [slotId, setSlotId] = useState<string | null>(null);
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [showMap, setShowMap] = useState(false);
  const address = selectedAddress?.address ?? "";
  const [saving, setSaving] = useState(false);
  const submitted = useRef(false);

  const mode = settings.delivery_mode;
  useEffect(() => {
    if (mode === "retiro" && delivery !== "retiro") setDelivery("retiro");
    if (mode === "envio" && delivery !== "envio") setDelivery("envio");
  }, [mode, delivery]);

  const activeZones = (zonesQ.data ?? []).filter((z) => z.is_active && z.polygon.length >= 3);
  const zonesEnabled = activeZones.length > 0;
  const zone = findZoneFor(coords, activeZones);
  const outOfZone = delivery === "envio" && zonesEnabled && Boolean(coords) && !zone;

  const firstOrderPct = eligible.data ? settings.first_order_discount_pct : 0;
  const totals = cartTotals(lines, {
    serviceFeePct: settings.service_fee_pct,
    minOrder: settings.min_order,
    firstOrderPct,
    tip: 0,
    deliveryFee: settings.delivery_fee,
    zoneFee: zone ? zone.shipping_cost : null,
    freeShippingMin: settings.free_shipping_min,
    isDelivery: delivery === "envio",
  });

  // Los horarios pueden estar limitados a una o más zonas de entrega.
  const slotsFor = (d: DeliveryDate) =>
    d.delivery_slots.filter(
      (s) => s.is_active && (delivery !== "envio" || slotMatchesZone(s, zone?.id ?? null)),
    );
  const availableDates = (dates.data ?? []).filter((d) => d.is_active && slotsFor(d).length > 0);

  const visibleSlotIds = availableDates.flatMap((d) => slotsFor(d).map((s) => s.id)).join(",");
  useEffect(() => {
    if (slotId && !visibleSlotIds.split(",").includes(slotId)) setSlotId(null);
  }, [visibleSlotIds, slotId]);

  useEffect(() => {
    if (delivery === "retiro") setSlotId(null);
  }, [delivery]);

  function slotFull(id: string, max: number | null): boolean {
    if (max == null) return false;
    return (usage.data?.[id] ?? 0) >= max;
  }

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (submitted.current || saving) return;
    if (!settings.store_open) {
      toast.error(settings.closed_message);
      return;
    }
    if (lines.length === 0) {
      toast.error("Tu carrito está vacío");
      return;
    }
    const parsed = schema.safeParse({
      customer_name: name,
      phone,
      notes,
      address_reference: reference,
      delivery_method: delivery,
      address,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Revisá los datos");
      return;
    }
    if (parsed.data.delivery_method === "envio" && (parsed.data.address ?? "").length < 5) {
      toast.error("Buscá y elegí tu dirección de entrega");
      return;
    }
    if (parsed.data.delivery_method === "envio" && zonesEnabled && !zone) {
      toast.error("Lo sentimos, todavía no realizamos envíos a esta ubicación.");
      return;
    }
    if (!totals.meetsMinimum) {
      toast.error(`El monto mínimo de compra es de ${money(settings.min_order)}.`);
      return;
    }
    if (delivery === "envio" && availableDates.length > 0 && !slotId) {
      toast.error("Elegí cuándo querés recibir tu pedido");
      return;
    }

    submitted.current = true;
    setSaving(true);
    try {
      if (!tenantId) {
        throw new Error("No pudimos identificar la tienda, recargá la página");
      }
      const res = await placeOrder({
        data: {
          tenant_id: tenantId,
          items: lines.map((l) => ({ product_id: l.id, qty: l.qty })),
          customer_name: parsed.data.customer_name,
          phone: parsed.data.phone,
          delivery_method: parsed.data.delivery_method,
          address: parsed.data.address?.trim() ? parsed.data.address : null,
          address_reference: reference.trim() ? reference.trim() : null,
          notes: parsed.data.notes?.trim() ? parsed.data.notes : null,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
          delivery_slot_id: slotId,
          payment_method: settings.cash_enabled ? payMethod : "transferencia",
          tip: 0,
          location_confirmed: delivery === "envio" ? Boolean(coords) : false,
        },
      });
      try {
        localStorage.setItem(`me-order-${res.id}`, res.token);
      } catch {
        /* ignore */
      }
      clear();
      toast.success("¡Pedido generado!");
      navigate({ to: "/pedido/$id", params: { id: res.id }, replace: true });
    } catch (err) {
      submitted.current = false;
      setSaving(false);
      toast.error(err instanceof Error ? err.message : "No se pudo crear el pedido");
    }
  }

  if (lines.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header subtitle="Finalizar compra" />
        <div className="mx-auto max-w-lg px-4 pt-10 text-center">
          <p className="mb-4 text-sm text-muted-foreground">Tu carrito está vacío.</p>
          <Button asChild>
            <Link to="/">Ir al catálogo</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <Header subtitle="Finalizar compra" />
      <div className="mx-auto max-w-lg space-y-4 px-4 pt-4">
        <h1 className="font-display text-2xl font-extrabold">Finalizar compra</h1>

        {!settings.store_open && (
          <p className="rounded-2xl border border-border bg-accent/40 p-3 text-sm font-medium">
            🔴 {settings.closed_message}
          </p>
        )}

        {firstOrderPct > 0 && (
          <p className="rounded-2xl border border-border bg-accent/40 p-3 text-sm font-medium">
            🎉 ¡Tenés {firstOrderPct}% OFF en tu primer pedido por registrarte!
          </p>
        )}
        {!user && (
          <div className="rounded-2xl border border-border bg-surface p-3 text-sm">
            <p className="font-medium">
              ¿Querés registrarte y obtener {settings.first_order_discount_pct}% OFF en tu primer
              pedido?
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              También podés comprar como invitado, sin crear cuenta.
            </p>
            <Button asChild variant="secondary" size="sm" className="mt-2">
              <Link to="/auth">Crear cuenta</Link>
            </Button>
          </div>
        )}

        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="mb-3 font-display text-base font-bold">Resumen del pedido</h2>
          <ul className="space-y-2 text-sm">
            {lines.map((l) => {
              const r = priceLine(l, l.qty);
              return (
                <li key={l.id} className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted p-1">
                    <ProductImage
                      src={l.image_url}
                      alt={l.name}
                      emoji={l.emoji}
                      emojiClassName="text-lg"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{l.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {l.qty} × {money(r.unitEffective)}
                      {r.badge ? ` · ${r.badge}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 font-medium">{money(r.total)}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
            <Row label="Subtotal original" value={money(totals.subtotalOriginal)} muted />
            {totals.promoDiscount > 0 && (
              <Row label="Promociones" value={`-${money(totals.promoDiscount)}`} accent />
            )}
            <Row label="Subtotal" value={money(totals.subtotalAfterPromos)} muted />
            {totals.firstOrderDiscount > 0 && (
              <Row
                label={`Descuento primer pedido ${firstOrderPct}%`}
                value={`-${money(totals.firstOrderDiscount)}`}
                accent
              />
            )}
            <Row label="Subtotal final" value={money(totals.subtotalFinal)} muted />
            {delivery === "envio" && (settings.delivery_fee > 0 || zone != null) && (
              totals.shipping > 0 ? (
                <Row label="Envío" value={money(totals.shipping)} muted />
              ) : (
                <div className="flex justify-between font-semibold text-success">
                  <span>ENVÍO GRATIS</span>
                  <span>$0</span>
                </div>
              )
            )}
            {totals.serviceFee > 0 && (
              <Row
                label={`Tarifa de servicio (${settings.service_fee_pct}%)`}
                value={money(totals.serviceFee)}
                muted
              />
            )}
            <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
              <span>Total</span>
              <span>{money(totals.total)}</span>
            </div>
          </div>
          {!totals.meetsMinimum && (
            <p className="mt-3 rounded-xl bg-accent/40 p-3 text-xs font-medium">
              El monto mínimo de compra es de {money(settings.min_order)}. Te faltan{" "}
              {money(totals.missingForMinimum)} para alcanzar el mínimo de compra.
            </p>
          )}
        </section>

        {settings.cash_enabled && (
          <section className="space-y-2 rounded-2xl border border-border bg-surface p-4">
            <h2 className="font-display text-base font-bold">Método de pago</h2>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { v: "transferencia", label: "💳 Transferencia" },
                  { v: "efectivo", label: "💵 Efectivo" },
                ] as const
              ).map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setPayMethod(o.v)}
                  className={`rounded-xl border p-3 text-sm font-semibold transition ${
                    payMethod === o.v ? "border-brand bg-brand/10" : "border-border bg-background"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {payMethod === "efectivo" && (
              <p className="text-xs text-muted-foreground">
                Abonás en efectivo al recibir tu pedido
                {delivery === "retiro" ? " en el local." : " en tu domicilio."}
              </p>
            )}
          </section>
        )}

        {(!settings.cash_enabled || payMethod === "transferencia") && (
          <AliasBox alias={settings.payment_alias} />
        )}

        <form onSubmit={submit} className="space-y-4">
          <section className="space-y-4 rounded-2xl border border-border bg-surface p-4">
            <div>
              <Label htmlFor="name">Nombre y apellido</Label>
              <Input
                id="name"
                value={name}
                maxLength={80}
                autoComplete="name"
                onChange={(e) => setName(e.target.value)}
                placeholder="Juan Pérez"
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Tu WhatsApp</Label>
              <Input
                id="phone"
                value={phone}
                maxLength={30}
                inputMode="tel"
                autoComplete="tel"
                onChange={(e) => setPhone(e.target.value)}
                placeholder="261 555 5555"
                required
              />
            </div>

            <div>
              <Label>Método de entrega</Label>
              {mode === "ambos" ? (
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {(
                    [
                      { v: "envio", label: "🚚 Envío a domicilio" },
                      { v: "retiro", label: "🏪 Retiro en el local" },
                    ] as const
                  ).map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setDelivery(o.v)}
                      className={`rounded-xl border p-3 text-sm font-medium transition ${
                        delivery === o.v
                          ? "border-brand bg-brand text-brand-foreground"
                          : "border-border bg-background text-foreground"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-1 rounded-xl border border-border bg-background p-3 text-sm font-medium">
                  {mode === "retiro" ? "🏪 Retiro en el local" : "🚚 Envío a domicilio"}
                </p>
              )}
              {delivery === "retiro" &&
                (((settings.pickup_address ?? "").trim() || (settings.store_address ?? "").trim())) !== "" && (
                  <div className="mt-2 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground">Retirás tu pedido en:</p>
                    <p className="mt-1 whitespace-pre-line">
                      📍 {((settings.pickup_address ?? "").trim() || (settings.store_address ?? "").trim())}
                    </p>
                    {(settings.store_hours ?? "").trim() !== "" && (
                      <p className="mt-1 whitespace-pre-line">🕐 {settings.store_hours}</p>
                    )}
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        ((settings.pickup_address ?? "").trim() || (settings.store_address ?? "").trim()),
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block font-semibold text-brand underline-offset-2 hover:underline"
                    >
                      Ver en Google Maps
                    </a>
                  </div>
                )}
            </div>
          </section>

          {delivery === "envio" && (
            <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
              <h2 className="font-display text-base font-bold">📍 Dirección de entrega</h2>
              <AddressAutocomplete
                selected={selectedAddress}
                onSelect={(a) => {
                  setSelectedAddress(a);
                  setCoords({ lat: a.lat, lng: a.lng });
                }}
                onClear={() => {
                  setSelectedAddress(null);
                  setCoords(null);
                  setShowMap(false);
                }}
              />
              {zonesEnabled && coords && zone && (
                <p className="rounded-xl border border-success/40 bg-success/10 p-3 text-sm font-semibold text-success">
                  ¡Sí, realizamos envíos a tu zona!
                  <span className="mt-0.5 block text-xs font-medium text-muted-foreground">
                    {zone.name} ·{" "}
                    {zone.shipping_cost > 0 ? `Envío ${money(zone.shipping_cost)}` : "Envío sin cargo"}
                  </span>
                </p>
              )}
              {outOfZone && (
                <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
                  Lo sentimos, todavía no realizamos envíos a esta ubicación.
                </p>
              )}
              <div>
                <Label htmlFor="reference">Referencia (opcional)</Label>
                <Input
                  id="reference"
                  value={reference}
                  maxLength={200}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Casa con portón negro"
                />
              </div>
              {selectedAddress && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowMap((v) => !v)}
                    className="text-xs font-medium text-brand underline"
                  >
                    {showMap ? "Ocultar mapa" : "Ajustar ubicación en el mapa (opcional)"}
                  </button>
                  {showMap && (
                    <ClientOnly fallback={<div className="h-56 rounded-xl bg-muted" />}>
                      <LocationPicker
                        value={coords}
                        confirmed={Boolean(coords)}
                        onPick={(c) => setCoords(c)}
                        onConfirm={() => toast.success("Ubicación actualizada")}
                      />
                    </ClientOnly>
                  )}
                </>
              )}
            </section>
          )}

          {delivery === "envio" && availableDates.length > 0 && (
            <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
              <h2 className="font-display text-base font-bold">🗓️ Elegí cuándo recibir tu pedido</h2>
              {availableDates.map((d) => (
                <div key={d.id}>
                  <p className="text-sm font-semibold">{formatDeliveryDate(d.date)}</p>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    {slotsFor(d).map((s) => {
                        const full = slotFull(s.id, s.max_orders);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            disabled={full}
                            onClick={() => setSlotId(s.id)}
                            className={`rounded-xl border p-2 text-xs font-medium transition disabled:opacity-50 ${
                              slotId === s.id
                                ? "border-brand bg-brand text-brand-foreground"
                                : "border-border bg-background"
                            }`}
                          >
                            {slotLabel(s)}
                            {full ? " · Completo" : ""}
                          </button>
                        );
                      })}
                  </div>
                </div>
              ))}
            </section>
          )}

          <section className="rounded-2xl border border-border bg-surface p-4">
            <Label htmlFor="notes">Indicaciones adicionales (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              maxLength={300}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tocar timbre, dejar en portería…"
            />
          </section>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={saving || !settings.store_open || !totals.meetsMinimum || outOfZone}
          >
            {saving
              ? "Generando pedido…"
              : !settings.store_open
                ? "Compras no disponibles"
                : outOfZone
                  ? "Fuera de la zona de envío"
                : `Confirmar pedido · ${money(totals.total)}`}
          </Button>
        </form>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  accent,
}: {
  label: string;
  value: string;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${accent ? "font-medium text-brand" : muted ? "text-muted-foreground" : ""}`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}