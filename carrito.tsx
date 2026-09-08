import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Header } from "@/components/market/Header";
import { ProductImage } from "@/components/market/ProductImage";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { money } from "@/lib/format";
import { cartTotals, priceLine } from "@/lib/pricing";
import { DEFAULT_SETTINGS, settingsQuery } from "@/lib/settings";
import { useTenantId } from "@/lib/tenant";

export const Route = createFileRoute("/carrito")({
  head: () => ({
    meta: [
      { title: "Tu carrito — Mercadito Express" },
      { name: "description", content: "Revisá tus productos, cambiá cantidades y generá el pedido." },
      { property: "og:title", content: "Tu carrito — Mercadito Express" },
      { property: "og:description", content: "Carrito de compras del supermercado Mercadito Express." },
    ],
  }),
  component: CarritoPage,
});

function CarritoPage() {
  const { lines, setQty, remove, clear } = useCart();
  const tenantId = useTenantId();
  const settings = useQuery(settingsQuery(tenantId)).data ?? DEFAULT_SETTINGS;
  const totals = cartTotals(lines, {
    serviceFeePct: settings.service_fee_pct,
    minOrder: settings.min_order,
  });

  return (
    <div className="min-h-screen bg-background pb-40">
      <Header subtitle="Tu carrito" />
      <div className="mx-auto max-w-lg px-4 pt-4">
        <h1 className="mb-4 font-display text-2xl font-extrabold">🛍️ Carrito</h1>

        {!settings.store_open && (
          <p className="mb-4 rounded-2xl border border-border bg-accent/40 p-3 text-sm font-medium">
            🔴 {settings.closed_message}
          </p>
        )}

        {lines.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center">
            <p className="mb-4 text-sm text-muted-foreground">Todavía no agregaste productos.</p>
            <Button asChild>
              <Link to="/">Ir al catálogo</Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {lines.map((l) => {
                const r = priceLine(l, l.qty);
                return (
                <li
                  key={l.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-surface p-3"
                >
                  <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted p-1">
                    <ProductImage
                      src={l.image_url}
                      alt={l.name}
                      emoji={l.emoji}
                      emojiClassName="text-2xl"
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{l.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {money(r.unitEffective)} c/u · {l.unit}
                    </p>
                    {r.badge && (
                      <span className="mt-0.5 inline-block rounded-full bg-offer px-2 py-0.5 text-[10px] font-bold text-offer-foreground">
                        {r.badge}
                      </span>
                    )}
                    <div className="mt-1 flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="size-7"
                        aria-label="Restar"
                        onClick={() => setQty(l.id, l.qty - 1)}
                      >
                        <Minus className="size-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-semibold">{l.qty}</span>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="size-7"
                        aria-label="Sumar"
                        disabled={l.qty >= l.stock}
                        onClick={() => setQty(l.id, l.qty + 1)}
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-sm font-bold">{money(r.total)}</span>
                    {r.discount > 0 && (
                      <span className="-mt-2 text-[10px] font-semibold text-brand">
                        Ahorrás {money(r.discount)}
                      </span>
                    )}
                    <button
                      type="button"
                      aria-label={`Quitar ${l.name}`}
                      onClick={() => remove(l.id)}
                      className="text-muted-foreground"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
                );
              })}
            </ul>

            <button
              type="button"
              onClick={clear}
              className="mt-4 text-sm font-medium text-muted-foreground underline"
            >
              Vaciar carrito
            </button>

            <div className="mt-4 space-y-1 rounded-2xl border border-border bg-surface p-4 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal original</span>
                <span>{money(totals.subtotalOriginal)}</span>
              </div>
              {totals.promoDiscount > 0 && (
                <div className="flex justify-between font-medium text-brand">
                  <span>Promociones y descuentos</span>
                  <span>-{money(totals.promoDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold">
                <span>Subtotal</span>
                <span>{money(totals.subtotalAfterPromos)}</span>
              </div>
              <p className="pt-1 text-xs text-muted-foreground">
                Los totales finales se calculan en el checkout.
              </p>
            </div>

            {!totals.meetsMinimum && (
              <p className="mt-3 rounded-2xl border border-border bg-accent/40 p-3 text-sm font-medium">
                El monto mínimo de compra es de {money(settings.min_order)}. Te faltan{" "}
                {money(totals.missingForMinimum)} para alcanzarlo.
              </p>
            )}

            <div className="fixed inset-x-0 bottom-14 z-30 border-t border-border bg-surface p-4">
              <div className="mx-auto flex max-w-lg items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Subtotal</p>
                  <p className="truncate font-display text-xl font-extrabold">
                    {money(totals.subtotalAfterPromos)}
                  </p>
                </div>
                {totals.meetsMinimum && settings.store_open ? (
                  <Button asChild size="lg">
                    <Link to="/checkout">Finalizar pedido</Link>
                  </Button>
                ) : (
                  <Button size="lg" disabled>
                    Finalizar pedido
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}