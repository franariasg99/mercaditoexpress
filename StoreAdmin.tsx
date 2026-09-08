import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_SETTINGS,
  settingsQuery,
  type DeliveryMode,
  type LogoShape,
} from "@/lib/settings";
import { useAdminTenant } from "@/hooks/useAuth";
import logoFallback from "@/assets/mercadito-logo.png";
import { ImageCropper } from "@/components/admin/ImageCropper";
import { readableOn } from "@/components/BrandTheme";

const COLOR_PRESETS = [
  "#3f3fb0",
  "#0f766e",
  "#b91c1c",
  "#c2410c",
  "#a16207",
  "#15803d",
  "#0369a1",
  "#7e22ce",
  "#be185d",
  "#1f2937",
];

const DELIVERY_OPTIONS: { v: DeliveryMode; label: string; hint: string }[] = [
  { v: "envio", label: "🚚 Solo envío a domicilio", hint: "El cliente solo puede pedir envío." },
  { v: "retiro", label: "🏪 Solo retiro en el local", hint: "No se pide dirección de entrega." },
  { v: "ambos", label: "🚚🏪 Envío y retiro", hint: "El cliente elige en el checkout." },
];

export function StoreAdmin() {
  const qc = useQueryClient();
  const { tenantId, tenant } = useAdminTenant();
  const settings = useQuery(settingsQuery(tenantId)).data ?? DEFAULT_SETTINGS;
  const [alias, setAlias] = useState(settings.payment_alias);
  const [waPhone, setWaPhone] = useState(settings.store_whatsapp);
  const [closedMessage, setClosedMessage] = useState(settings.closed_message);
  const [minOrder, setMinOrder] = useState(String(settings.min_order));
  const [deliveryFee, setDeliveryFee] = useState(String(settings.delivery_fee));
  const [freeShipMin, setFreeShipMin] = useState(String(settings.free_shipping_min));
  const [freeShipNA, setFreeShipNA] = useState(!settings.free_shipping_min);
  const [saving, setSaving] = useState(false);

  const [storeName, setStoreName] = useState(settings.store_name);
  const [tagline, setTagline] = useState(settings.store_tagline);
  const [logoUrl, setLogoUrl] = useState(settings.store_logo_url ?? "");
  const [logoShape, setLogoShape] = useState<LogoShape>(settings.store_logo_shape);
  const [brandColor, setBrandColor] = useState(settings.brand_color);
  const [savingBrand, setSavingBrand] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<DeliveryMode>(settings.delivery_mode);
  const [pickupAddress, setPickupAddress] = useState(settings.pickup_address);
  const [savingDelivery, setSavingDelivery] = useState(false);

  const [storeAddress, setStoreAddress] = useState(settings.store_address);
  const [storeEmail, setStoreEmail] = useState(settings.store_email);
  const [storeHours, setStoreHours] = useState(settings.store_hours);
  const [savingContact, setSavingContact] = useState(false);

  useEffect(() => {
    setAlias(settings.payment_alias);
    setWaPhone(settings.store_whatsapp);
    setClosedMessage(settings.closed_message);
    setMinOrder(String(settings.min_order));
    setDeliveryFee(String(settings.delivery_fee));
    setFreeShipMin(String(settings.free_shipping_min));
    setFreeShipNA(!settings.free_shipping_min);
    setStoreName(settings.store_name);
    setTagline(settings.store_tagline);
    setLogoUrl(settings.store_logo_url ?? "");
    setLogoShape(settings.store_logo_shape);
    setBrandColor(settings.brand_color);
    setMode(settings.delivery_mode);
    setPickupAddress(settings.pickup_address);
    setStoreAddress(settings.store_address);
    setStoreEmail(settings.store_email);
    setStoreHours(settings.store_hours);
  }, [settings]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["app-settings"] });

  async function setOpen(open: boolean) {
    const { error } = await supabase.from("app_settings").update({ store_open: open }).eq("tenant_id", tenantId ?? "");
    if (error) toast.error("No se pudo cambiar el estado de la tienda");
    else {
      toast.success(open ? "Tienda abierta" : "Tienda cerrada");
      void refresh();
    }
  }

  function pickLogo(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Elegí un archivo de imagen");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("La imagen no puede superar 8 MB");
      return;
    }
    setCropFile(file);
  }

  async function uploadLogo(blob: Blob) {
    setUploading(true);
    const path = `${tenantId ?? "sin-tienda"}/logo-${crypto.randomUUID()}.png`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, blob, { contentType: "image/png", upsert: false });
    if (error) {
      setUploading(false);
      toast.error("No se pudo subir el logo");
      return;
    }
    const { data, error: signErr } = await supabase.storage
      .from("product-images")
      .createSignedUrl(path, 60 * 60 * 24 * 3650);
    setUploading(false);
    if (signErr || !data?.signedUrl) {
      toast.error("No se pudo obtener el enlace del logo");
      return;
    }
    setLogoUrl(data.signedUrl);
    setCropFile(null);
    toast.success("Logo cargado (acordate de guardar)");
  }

  async function saveBrand() {
    const clean = storeName.trim();
    if (clean.length < 2) {
      toast.error("El nombre del negocio es muy corto");
      return;
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(brandColor)) {
      toast.error("Elegí un color válido");
      return;
    }
    setSavingBrand(true);
    const { error } = await supabase
      .from("app_settings")
      .update({
        store_name: clean,
        store_tagline: tagline.trim(),
        store_logo_url: logoUrl.trim() ? logoUrl.trim() : null,
        store_logo_shape: logoShape,
        brand_color: brandColor,
      })
      .eq("tenant_id", tenantId ?? "");
    setSavingBrand(false);
    if (error) toast.error("No se pudo guardar");
    else {
      toast.success("Identidad del negocio actualizada");
      void refresh();
    }
  }

  async function saveDelivery() {
    if (mode !== "envio" && pickupAddress.trim().length < 5) {
      toast.error("Cargá la dirección del local para el retiro");
      return;
    }
    setSavingDelivery(true);
    const { error } = await supabase
      .from("app_settings")
      .update({ delivery_mode: mode, pickup_address: pickupAddress.trim() })
      .eq("tenant_id", tenantId ?? "");
    setSavingDelivery(false);
    if (error) toast.error("No se pudo guardar");
    else {
      toast.success("Modalidad de entrega actualizada");
      void refresh();
    }
  }

  async function saveContact() {
    const email = storeEmail.trim();
    if (email !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Cargá un email válido");
      return;
    }
    setSavingContact(true);
    const { error } = await supabase
      .from("app_settings")
      .update({
        store_address: storeAddress.trim(),
        store_email: email,
        store_hours: storeHours.trim(),
      })
      .eq("tenant_id", tenantId ?? "");
    setSavingContact(false);
    if (error) toast.error("No se pudo guardar");
    else {
      toast.success("Datos de contacto actualizados");
      void refresh();
    }
  }

  async function setCash(enabled: boolean) {
    const { error } = await supabase
      .from("app_settings")
      .update({ cash_enabled: enabled })
      .eq("tenant_id", tenantId ?? "");
    if (error) toast.error("No se pudo guardar");
    else {
      toast.success(enabled ? "Pago en efectivo habilitado" : "Pago en efectivo deshabilitado");
      void refresh();
    }
  }

  async function save() {
    const digits = waPhone.replace(/\D/g, "");
    if (digits.length < 8) {
      toast.error("Cargá un número de WhatsApp válido (con código de país)");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .update({
        payment_alias: alias.trim(),
        store_whatsapp: digits,
        closed_message: closedMessage.trim(),
        min_order: Number(minOrder) || 0,
        delivery_fee: Number(deliveryFee) || 0,
        free_shipping_min: freeShipNA ? 0 : Number(freeShipMin) || 0,
        service_fee_pct: 0,
        first_order_discount_pct: 0,
      })
      .eq("tenant_id", tenantId ?? "");
    setSaving(false);
    if (error) toast.error("No se pudo guardar");
    else {
      toast.success("Configuración guardada");
      void refresh();
    }
  }

  const storeUrl = tenant
    ? `${typeof window === "undefined" ? "https://mercaditoexpress.com.ar" : window.location.origin}/${tenant.slug}`
    : "";

  return (
    <div className="space-y-4">
      {tenant && (
        <section className="space-y-2 rounded-2xl border border-border bg-surface p-4">
          <h2 className="font-display text-base font-bold">🔗 Link de tu tienda</h2>
          <p className="break-all rounded-lg bg-muted px-3 py-2 text-sm">{storeUrl}</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                void navigator.clipboard.writeText(storeUrl);
                toast.success("Link copiado");
              }}
            >
              Copiar link
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() =>
                window.open(
                  `https://wa.me/?text=${encodeURIComponent(`Comprá en ${settings.store_name}: ${storeUrl}`)}`,
                  "_blank",
                )
              }
            >
              Compartir
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Compartí este link con tus clientes: es exclusivo de tu comercio.
          </p>
        </section>
      )}

      <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-display text-base font-bold">🏬 Configuración general</h2>
        <div>
          <Label htmlFor="store-name">Nombre del negocio</Label>
          <Input
            id="store-name"
            value={storeName}
            maxLength={40}
            onChange={(e) => setStoreName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="store-tagline">Frase debajo del nombre</Label>
          <Input
            id="store-tagline"
            value={tagline}
            maxLength={60}
            onChange={(e) => setTagline(e.target.value)}
          />
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) pickLogo(f);
          }}
        />
        {cropFile && (
          <ImageCropper
            file={cropFile}
            shape={logoShape}
            onShapeChange={setLogoShape}
            busy={uploading}
            onCancel={() => setCropFile(null)}
            onDone={(blob) => void uploadLogo(blob)}
          />
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? "Subiendo…" : logoUrl ? "Reemplazar logo" : "Subir logo"}
          </Button>
          {logoUrl && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setLogoUrl("")}>
              Usar logo por defecto
            </Button>
          )}
        </div>

        <div>
          <Label>Color principal</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                onClick={() => setBrandColor(c)}
                style={{ backgroundColor: c }}
                className={`size-9 rounded-full border-2 transition ${
                  brandColor.toLowerCase() === c ? "border-foreground scale-110" : "border-border"
                }`}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="color"
              aria-label="Color personalizado"
              value={/^#[0-9a-fA-F]{6}$/.test(brandColor) ? brandColor : "#3f3fb0"}
              onChange={(e) => setBrandColor(e.target.value)}
              className="h-9 w-12 cursor-pointer rounded-md border border-border bg-background p-1"
            />
            <Input
              value={brandColor}
              maxLength={7}
              onChange={(e) => setBrandColor(e.target.value)}
              placeholder="#3f3fb0"
            />
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-border p-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Vista previa</p>
          <div
            className="flex items-center gap-2 rounded-xl p-3"
            style={{
              backgroundColor: /^#[0-9a-fA-F]{6}$/.test(brandColor) ? brandColor : undefined,
              color: readableOn(brandColor),
            }}
          >
            <span
              className={`grid h-10 shrink-0 place-items-center overflow-hidden bg-background ${
                logoShape === "rect" ? "w-[71px] rounded-lg" : "w-10"
              } ${logoShape === "circle" ? "rounded-full" : logoShape === "square" ? "rounded-xl" : ""}`}
            >
              <img
                src={logoUrl.trim() ? logoUrl.trim() : logoFallback}
                alt="Logo"
                className="size-full object-cover"
              />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-lg font-extrabold leading-none">
                {storeName.trim() || "Mi negocio"}
              </span>
              <span className="block truncate text-xs opacity-80">{tagline}</span>
            </span>
          </div>
        </div>

        <Button onClick={() => void saveBrand()} disabled={savingBrand} className="w-full">
          {savingBrand ? "Guardando…" : "Guardar identidad"}
        </Button>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-display text-base font-bold">🚚 Modalidad de entrega</h2>
        <div className="space-y-2">
          {DELIVERY_OPTIONS.map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => setMode(o.v)}
              className={`w-full rounded-xl border p-3 text-left text-sm transition ${
                mode === o.v ? "border-brand bg-brand/10" : "border-border bg-background"
              }`}
            >
              <span className="block font-semibold">{o.label}</span>
              <span className="block text-xs text-muted-foreground">{o.hint}</span>
            </button>
          ))}
        </div>
        {mode !== "envio" && (
          <div>
            <Label htmlFor="pickup">Dirección / datos del local</Label>
            <Textarea
              id="pickup"
              value={pickupAddress}
              maxLength={300}
              onChange={(e) => setPickupAddress(e.target.value)}
              placeholder="Av. San Martín 1234, Mendoza · Lun a Sáb de 9 a 21 h"
            />
          </div>
        )}
        <Button onClick={() => void saveDelivery()} disabled={savingDelivery} className="w-full">
          {savingDelivery ? "Guardando…" : "Guardar modalidad"}
        </Button>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-display text-base font-bold">📍 Dirección y contacto</h2>
        <p className="text-xs text-muted-foreground">
          Se muestra en el pie de página de tu tienda (sección “Contacto”) y, si tenés retiro en el
          local, también en el checkout.
        </p>
        <div>
          <Label htmlFor="store-address">Dirección del local</Label>
          <Textarea
            id="store-address"
            value={storeAddress}
            maxLength={200}
            onChange={(e) => setStoreAddress(e.target.value)}
            placeholder="Av. San Martín 1234, Ciudad, Mendoza"
          />
        </div>
        <div>
          <Label htmlFor="store-email">Email (opcional)</Label>
          <Input
            id="store-email"
            inputMode="email"
            value={storeEmail}
            maxLength={80}
            onChange={(e) => setStoreEmail(e.target.value)}
            placeholder="contacto@mitienda.com"
          />
        </div>
        <div>
          <Label htmlFor="store-hours">Horarios de atención (opcional)</Label>
          <Textarea
            id="store-hours"
            value={storeHours}
            maxLength={200}
            onChange={(e) => setStoreHours(e.target.value)}
            placeholder="Lun a Sáb de 9 a 21 h · Dom cerrado"
          />
        </div>
        <Button onClick={() => void saveContact()} disabled={savingContact} className="w-full">
          {savingContact ? "Guardando…" : "Guardar contacto"}
        </Button>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-display text-base font-bold">Estado de la tienda</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {settings.store_open
            ? "🟢 ABIERTO · los clientes pueden hacer pedidos."
            : "🔴 CERRADO · pueden navegar, pero no finalizar pedidos."}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={settings.store_open ? "default" : "outline"}
            onClick={() => void setOpen(true)}
          >
            🟢 Abierto
          </Button>
          <Button
            type="button"
            variant={!settings.store_open ? "default" : "outline"}
            onClick={() => void setOpen(false)}
          >
            🔴 Cerrado
          </Button>
        </div>
        <div className="mt-3">
          <Label htmlFor="closed-msg">Mensaje cuando está cerrada</Label>
          <Textarea
            id="closed-msg"
            value={closedMessage}
            maxLength={200}
            onChange={(e) => setClosedMessage(e.target.value)}
          />
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-display text-base font-bold">Pagos y contacto</h2>
        <div>
          <Label htmlFor="alias">Alias de transferencia</Label>
          <Input id="alias" value={alias} maxLength={60} onChange={(e) => setAlias(e.target.value)} />
        </div>
        <div>
          <Label>Pago en efectivo</Label>
          <p className="mb-2 text-xs text-muted-foreground">
            Si lo activás, tus clientes pueden elegir pagar en efectivo al recibir o retirar.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={settings.cash_enabled ? "default" : "outline"}
              onClick={() => void setCash(true)}
            >
              💵 Habilitado
            </Button>
            <Button
              type="button"
              variant={!settings.cash_enabled ? "default" : "outline"}
              onClick={() => void setCash(false)}
            >
              🚫 Deshabilitado
            </Button>
          </div>
        </div>
        <div>
          <Label htmlFor="wa">WhatsApp del comercio</Label>
          <Input
            id="wa"
            inputMode="tel"
            maxLength={20}
            value={waPhone}
            onChange={(e) => setWaPhone(e.target.value)}
            placeholder="5492615585633"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Con código de país y sin espacios ni signos. Los pedidos de tus clientes se envían a
            este número.
          </p>
        </div>
        <div>
          <Label htmlFor="min">Compra mínima (opcional)</Label>
          <Input
            id="min"
            inputMode="numeric"
            value={minOrder}
            onChange={(e) => setMinOrder(e.target.value)}
            placeholder="0"
          />
          <p className="mt-1 text-xs text-muted-foreground">Dejalo en 0 para no exigir un mínimo.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="ship">Costo de envío</Label>
            <Input
              id="ship"
              inputMode="numeric"
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <Label htmlFor="freeship">Envío gratis desde</Label>
            <div className="flex gap-1">
              <select
                aria-label="Modo de envío gratis"
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={freeShipNA ? "na" : "monto"}
                onChange={(e) => {
                  const na = e.target.value === "na";
                  setFreeShipNA(na);
                  if (na) setFreeShipMin("0");
                }}
              >
                <option value="na">No aplica</option>
                <option value="monto">Desde $</option>
              </select>
              <Input
                id="freeship"
                inputMode="numeric"
                value={freeShipNA ? "" : freeShipMin}
                onChange={(e) => setFreeShipMin(e.target.value)}
                placeholder="0"
                disabled={freeShipNA}
              />
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          El costo de envío se suma solo en pedidos a domicilio.
        </p>
        <Button onClick={() => void save()} disabled={saving} className="w-full">
          {saving ? "Guardando…" : "Guardar configuración"}
        </Button>
      </section>
    </div>
  );
}
