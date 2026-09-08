import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Header } from "@/components/market/Header";
import { ProductGrid } from "@/components/market/ProductGrid";
import { productsQuery } from "@/lib/market";
import { useTenantId } from "@/lib/tenant";
import { hasActivePromo } from "@/lib/pricing";

export const Route = createFileRoute("/ofertas")({
  head: () => ({
    meta: [
      { title: "Ofertas del día — Mercadito Express" },
      {
        name: "description",
        content: "Todas las promociones vigentes del market: precios rebajados en cada sección.",
      },
      { property: "og:title", content: "Ofertas del día — Mercadito Express" },
      { property: "og:description", content: "Promociones y precios rebajados en Mercadito Express." },
    ],
  }),
  component: OfertasPage,
});

function OfertasPage() {
  const tenantId = useTenantId();
  const { data: products } = useSuspenseQuery(productsQuery(tenantId));
  const offers = products.filter((p) => p.is_active && hasActivePromo(p));

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header subtitle="Promociones" />
      <div className="mx-auto max-w-lg px-4 pt-4">
        <h1 className="mb-1 font-display text-2xl font-extrabold">🏷️ Ofertas</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          Productos con descuento o promoción activa. Se actualizan solos según lo que configure el
          administrador.
        </p>
        {offers.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
            No hay promociones activas en este momento.
          </p>
        ) : (
          <ProductGrid products={offers} />
        )}
      </div>
    </div>
  );
}