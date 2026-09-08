import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Header } from "@/components/market/Header";
import { ProductImage } from "@/components/market/ProductImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ICON_LIBRARY } from "@/lib/icon-library";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useAdminTenant } from "@/hooks/useAuth";
import { categoriesQuery, productsQuery, type Category, type Product } from "@/lib/market";
import { money } from "@/lib/format";
import { OrdersAdmin } from "@/components/admin/OrdersAdmin";
import { DeliveryAdmin } from "@/components/admin/DeliveryAdmin";
import { StoreAdmin } from "@/components/admin/StoreAdmin";
import { ZonesAdmin } from "@/components/admin/ZonesAdmin";
import { ImageCropper } from "@/components/admin/ImageCropper";
import type { LogoShape } from "@/lib/settings";
import { CategoriesAdmin } from "@/components/admin/CategoriesAdmin";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Panel de productos — Mercadito Express" },
      { name: "description", content: "Administrá productos, precios, ofertas y stock del market." },
      { property: "og:title", content: "Panel de productos — Mercadito Express" },
      { property: "og:description", content: "Gestión de catálogo de Mercadito Express." },
    ],
  }),
  component: AdminPage,
});

const productSchema = z.object({
  name: z.string().trim().min(2, "Nombre muy corto").max(80),
  description: z.string().trim().max(500).nullable(),
  category_id: z.string().uuid("Elegí una categoría"),
  unit: z.string().trim().min(1).max(20),
  emoji: z.string().trim().min(1).max(8),
  image_url: z.string().trim().url("URL de imagen inválida").max(500).nullable(),
  images: z.array(z.string().trim().url("URL de imagen inválida").max(500)).max(4),
  price: z.number().positive("Precio inválido"),
  sale_price: z.number().nonnegative().nullable(),
  stock: z.number().int().min(0),
  promo_type: z.enum(["none", "percent", "price", "nxm", "second_unit"]),
  promo_percent: z.number().min(1).max(100).nullable(),
  promo_buy_qty: z.number().int().min(2).max(20).nullable(),
  promo_pay_qty: z.number().int().min(1).max(19).nullable(),
});

const NXM_PRESETS = [
  { label: "2x1", buy: 2, pay: 1 },
  { label: "3x1", buy: 3, pay: 1 },
  { label: "3x2", buy: 3, pay: 2 },
  { label: "4x3", buy: 4, pay: 3 },
  { label: "5x4", buy: 5, pay: 4 },
];

type Tab = "productos" | "secciones" | "pedidos" | "entregas" | "zonas" | "tienda";
const TABS: { id: Tab; label: string }[] = [
  { id: "productos", label: "🛒 Productos" },
  { id: "secciones", label: "📦 Secciones" },
  { id: "pedidos", label: "📋 Pedidos" },
  { id: "entregas", label: "🗓️ Entregas" },
  { id: "zonas", label: "🗺️ Zonas de envío" },
  { id: "tienda", label: "⚙️ Tienda" },
];

function AdminPage() {
  const { user } = useAuth();
  const { tenant, tenantId, isOperative, checking } = useAdminTenant();
  const isAdmin = Boolean(user && tenantId);
  const queryClient = useQueryClient();
  const categories = useQuery(categoriesQuery(tenantId));
  const products = useQuery(productsQuery(tenantId));
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<Tab>("productos");
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  if (checking) {
    return (
      <div className="min-h-screen bg-background p-6 text-sm text-muted-foreground">Cargando…</div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header subtitle="Panel" />
        <div className="mx-auto max-w-lg px-4 pt-10 text-center">
          <h1 className="font-display text-xl font-bold">Acceso restringido</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta sección es solo para el administrador del market. Si tenés un comercio, podés
            registrarlo y esperar la aprobación de la plataforma.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link to="/">Volver al catálogo</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/registrar-comercio">Registrar mi comercio</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isOperative) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header subtitle="Panel" />
        <div className="mx-auto max-w-lg px-4 pt-10 text-center">
          <h1 className="font-display text-xl font-bold">
            {tenant?.status === "suspended" ? "Cuenta suspendida" : "Cuenta pendiente de aprobación"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {tenant?.status === "suspended"
              ? "Tu comercio fue deshabilitado por la administración de la plataforma. Tus datos se conservan."
              : "Tu comercio ya está registrado. Vas a poder administrarlo apenas la plataforma apruebe la cuenta."}
          </p>
          <Button asChild className="mt-4">
            <Link to="/">Volver al catálogo</Link>
          </Button>
        </div>
      </div>
    );
  }

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["products"] });

  const term = search.trim().toLowerCase();
  const visible = (products.data ?? []).filter((p) =>
    term ? p.name.toLowerCase().includes(term) : true,
  );
  const cats: Category[] = categories.data ?? [];

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header subtitle="Panel de administración" />
      <div className="mx-auto max-w-lg px-4 pt-4">
        <h1 className="mb-3 font-display text-2xl font-extrabold">🧑‍💼 Administración</h1>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium ${
                tab === t.id
                  ? "border-transparent bg-brand text-brand-foreground"
                  : "border-border bg-surface text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "secciones" && <CategoriesAdmin />}
        {tab === "pedidos" && <OrdersAdmin />}
        {tab === "entregas" && <DeliveryAdmin />}
        {tab === "zonas" && <ZonesAdmin />}
        {tab === "tienda" && <StoreAdmin />}

        {tab === "productos" && (
          <>
            <div className="mb-3 flex items-center gap-2">
              <Input
                placeholder="Buscar producto"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setCreating(true);
                }}
              >
                ➕
              </Button>
            </div>

            {(creating || editing) && (
              <ProductForm
                key={editing?.id ?? "new"}
                product={editing}
                categories={cats}
                onDone={() => {
                  setEditing(null);
                  setCreating(false);
                  void refresh();
                }}
                onCancel={() => {
                  setEditing(null);
                  setCreating(false);
                }}
              />
            )}

            <div className="mt-4 space-y-3">
              {cats.map((c) => {
                const items = visible.filter((p) => p.category_id === c.id);
                const isOpen = term ? items.length > 0 : !collapsed[c.id];
                return (
                  <section key={c.id} className="rounded-2xl border border-border bg-surface">
                    <button
                      type="button"
                      onClick={() => setCollapsed((s) => ({ ...s, [c.id]: !collapsed[c.id] }))}
                      className="flex w-full items-center justify-between gap-2 p-3 text-left"
                    >
                      <span className="font-display text-sm font-bold uppercase tracking-wide">
                        {c.emoji} {c.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {items.length} · {isOpen ? "▲" : "▼"}
                      </span>
                    </button>
                    {isOpen && (
                      <ul className="space-y-2 border-t border-border p-3">
                        {items.length === 0 && (
                          <li className="text-xs text-muted-foreground">Sin productos todavía.</li>
                        )}
                        {items.map((p) => (
                          <li
                            key={p.id}
                            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-background p-2"
                          >
                            <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted p-0.5">
                              <ProductImage
                                src={p.image_url}
                                alt={p.name}
                                emoji={p.emoji}
                                emojiClassName="text-xl"
                              />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{p.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {money(p.price)}
                                {p.sale_price ? ` · oferta ${money(p.sale_price)}` : ""} · stock{" "}
                                {p.stock}
                                {p.promo_type && p.promo_type !== "none" ? " · promo" : ""}
                                {p.is_active ? "" : " · inactivo"}
                              </p>
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setCreating(false);
                                  setEditing(p);
                                }}
                              >
                                Editar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  const { error } = await supabase
                                    .from("products")
                                    .update({ is_active: !p.is_active })
                                    .eq("id", p.id);
                                  if (error) toast.error("No se pudo actualizar");
                                  else void refresh();
                                }}
                              >
                                {p.is_active ? "Ocultar" : "Mostrar"}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={async () => {
                                  if (
                                    !window.confirm(
                                      `¿Eliminar "${p.name}"? Esta acción no se puede deshacer.`,
                                    )
                                  )
                                    return;
                                  const { error } = await supabase
                                    .from("products")
                                    .delete()
                                    .eq("id", p.id);
                                  if (error) {
                                    toast.error(
                                      "No se pudo eliminar. Si el producto tiene pedidos, ocultalo en vez de borrarlo.",
                                    );
                                  } else {
                                    toast.success("Producto eliminado");
                                    void refresh();
                                  }
                                }}
                              >
                                Eliminar
                              </Button>
                            </div>

                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ProductForm({
  product,
  categories,
  onDone,
  onCancel,
}: {
  product: Product | null;
  categories: { id: string; name: string; emoji: string }[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const { tenantId } = useAdminTenant();
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [categoryId, setCategoryId] = useState(product?.category_id ?? "");
  const [unit, setUnit] = useState(product?.unit ?? "unidad");
  const [emoji, setEmoji] = useState(product?.emoji ?? "🛒");
  const [photos, setPhotos] = useState<string[]>(() => {
    const list = [product?.image_url ?? "", ...(product?.images ?? [])]
      .map((u) => (typeof u === "string" ? u.trim() : ""))
      .filter((u) => u !== "");
    return Array.from(new Set(list)).slice(0, 4);
  });
  const [newUrl, setNewUrl] = useState("");
  const [price, setPrice] = useState(String(product?.price ?? ""));
  const [salePrice, setSalePrice] = useState(product?.sale_price ? String(product.sale_price) : "");
  const [stock, setStock] = useState(String(product?.stock ?? "0"));
  const [promoType, setPromoType] = useState<string>(product?.promo_type ?? "none");
  const [promoPercent, setPromoPercent] = useState(
    product?.promo_percent ? String(product.promo_percent) : "",
  );
  const [buyQty, setBuyQty] = useState(product?.promo_buy_qty ?? 2);
  const [payQty, setPayQty] = useState(product?.promo_pay_qty ?? 1);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [photoShape, setPhotoShape] = useState<LogoShape>("square");
  const fileRef = useRef<HTMLInputElement>(null);

  function pickPhoto(file: File): void {
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

  async function uploadPhoto(blob: Blob): Promise<void> {
    setUploading(true);
    const path = `${tenantId ?? "sin-tienda"}/${crypto.randomUUID()}.png`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, blob, { contentType: "image/png", upsert: false });
    if (error) {
      setUploading(false);
      toast.error("No se pudo subir la foto");
      return;
    }
    const { data, error: signErr } = await supabase.storage
      .from("product-images")
      .createSignedUrl(path, 60 * 60 * 24 * 3650);
    setUploading(false);
    if (signErr || !data?.signedUrl) {
      toast.error("No se pudo obtener el enlace de la foto");
      return;
    }
    setPhotos((prev) => (prev.length >= 4 ? prev : [...prev, data.signedUrl]));
    setCropFile(null);
    toast.success("Foto cargada");
  }

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const parsed = productSchema.safeParse({
      name,
      description: description.trim() ? description.trim() : null,
      category_id: categoryId,
      unit,
      emoji,
      image_url: photos[0] ?? null,
      images: photos,
      price: Number(price),
      sale_price: salePrice ? Number(salePrice) : null,
      stock: Number(stock),
      promo_type: promoType,
      promo_percent:
        promoType === "percent" || promoType === "second_unit" ? Number(promoPercent) : null,
      promo_buy_qty: promoType === "nxm" ? buyQty : null,
      promo_pay_qty: promoType === "nxm" ? payQty : null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }
    if (promoType === "price" && !(Number(salePrice) > 0)) {
      toast.error("Cargá el precio promocional");
      return;
    }
    setSaving(true);
    const { error } = product
      ? await supabase.from("products").update(parsed.data).eq("id", product.id)
      : await supabase.from("products").insert({ ...parsed.data, tenant_id: tenantId ?? "" });
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar el producto");
      return;
    }
    toast.success(product ? "Producto actualizado" : "Producto creado");
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <div>
        <Label htmlFor="p-name">Nombre</Label>
        <Input id="p-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="p-desc">Descripción (opcional)</Label>
        <Textarea
          id="p-desc"
          value={description}
          maxLength={500}
          rows={3}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ej: Bebida gaseosa sabor cola. Botella retornable de 2,25 L."
        />
      </div>
      <div>
        <Label>Categoría</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger>
            <SelectValue placeholder="Elegí una sección" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="p-image">Fotos del producto (hasta 4)</Label>
        <div className="mt-1 flex flex-wrap gap-2">
          {photos.map((url, i) => (
            <div key={url} className="relative">
              <span className="grid size-16 place-items-center overflow-hidden rounded-xl border border-border bg-muted p-1">
                <ProductImage
                  src={url}
                  alt={`${name || "Producto"} ${i + 1}`}
                  emoji={emoji}
                  emojiClassName="text-xl"
                />
              </span>
              {i === 0 && (
                <span className="absolute -top-1 left-0 rounded-full bg-brand px-1.5 text-[10px] font-semibold text-brand-foreground">
                  Principal
                </span>
              )}
              <button
                type="button"
                aria-label="Quitar foto"
                onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground"
              >
                ×
              </button>
            </div>
          ))}
          {photos.length === 0 && (
            <span className="grid size-16 place-items-center overflow-hidden rounded-xl border border-border bg-muted text-xl">
              {emoji}
            </span>
          )}
        </div>
        {photos.length < 4 && (
          <div className="mt-2 flex gap-2">
            <Input
              id="p-image"
              value={newUrl}
              maxLength={500}
              inputMode="url"
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://… (opcional)"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!newUrl.trim()}
              onClick={() => {
                const u = newUrl.trim();
                if (!u) return;
                setPhotos((prev) => (prev.includes(u) ? prev : [...prev, u].slice(0, 4)));
                setNewUrl("");
              }}
            >
              Agregar
            </Button>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) pickPhoto(f);
          }}
        />
        {cropFile && (
          <ImageCropper
            title="Encuadrá la foto del producto"
            file={cropFile}
            shape={photoShape}
            onShapeChange={setPhotoShape}
            busy={uploading}
            onCancel={() => setCropFile(null)}
            onDone={(blob) => void uploadPhoto(blob)}
          />
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={uploading || photos.length >= 4}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? "Subiendo…" : photos.length ? "Agregar otra foto" : "Seleccionar foto"}
          </Button>
          {photos.length > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setPhotos([])}>
              Quitar todas
            </Button>
          )}
          <span className="text-xs text-muted-foreground">{photos.length}/4</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="p-unit">Unidad</Label>
          <Input id="p-unit" value={unit} maxLength={20} onChange={(e) => setUnit(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="p-emoji">Emoji</Label>
          <Input
            id="p-emoji"
            value={emoji}
            maxLength={8}
            placeholder="😀"
            onChange={(e) => setEmoji(e.target.value)}
          />
          <p className="mt-1 text-[10px] text-muted-foreground">
            Usá el teclado de emojis de tu celular o elegí uno abajo.
          </p>
          <div className="mt-1 max-h-28 overflow-y-auto rounded-xl border border-border bg-background p-2">
            {ICON_LIBRARY.map((g) => (
              <div key={g.group} className="mb-1">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {g.group}
                </p>
                <div className="flex flex-wrap gap-1">
                  {g.icons.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setEmoji(ic)}
                      className={`grid size-8 place-items-center rounded-lg border text-base ${
                        emoji === ic ? "border-brand bg-brand/10" : "border-border"
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="p-price">Precio</Label>
          <Input
            id="p-price"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="p-sale">Precio oferta</Label>
          <Input
            id="p-sale"
            inputMode="decimal"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            placeholder="opcional"
          />
        </div>
        <div>
          <Label htmlFor="p-stock">Stock</Label>
          <Input
            id="p-stock"
            inputMode="numeric"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-border bg-background p-3">
        <Label>🏷️ Promoción</Label>
        <Select value={promoType} onValueChange={setPromoType}>
          <SelectTrigger>
            <SelectValue placeholder="Sin promoción" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin promoción</SelectItem>
            <SelectItem value="percent">Descuento porcentual</SelectItem>
            <SelectItem value="price">Precio promocional</SelectItem>
            <SelectItem value="nxm">Promoción por cantidad (2x1, 3x2…)</SelectItem>
            <SelectItem value="second_unit">Segunda unidad con descuento</SelectItem>
          </SelectContent>
        </Select>

        {(promoType === "percent" || promoType === "second_unit") && (
          <div>
            <Label htmlFor="p-promo-pct">
              {promoType === "percent" ? "% de descuento" : "% de descuento en la 2ª unidad"}
            </Label>
            <Input
              id="p-promo-pct"
              inputMode="numeric"
              value={promoPercent}
              onChange={(e) => setPromoPercent(e.target.value)}
              placeholder="Ej: 50"
            />
          </div>
        )}

        {promoType === "nxm" && (
          <div className="flex flex-wrap gap-2">
            {NXM_PRESETS.map((n) => (
              <button
                key={n.label}
                type="button"
                onClick={() => {
                  setBuyQty(n.buy);
                  setPayQty(n.pay);
                }}
                className={`rounded-full border px-3 py-1 text-sm font-medium ${
                  buyQty === n.buy && payQty === n.pay
                    ? "border-transparent bg-brand text-brand-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                {n.label}
              </button>
            ))}
          </div>
        )}

        {promoType === "price" && (
          <p className="text-xs text-muted-foreground">
            Se usa el campo “Precio oferta” de arriba.
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving} className="flex-1">
          {saving ? "Guardando…" : "Guardar"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}