import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Header } from "@/components/market/Header";
import { ProductGrid } from "@/components/market/ProductGrid";
import { categoriesQuery, productsQuery } from "@/lib/market";
import { StoreFooter } from "@/components/market/StoreFooter";
import { useTenantId } from "@/lib/tenant";

/** Vidriera principal del comercio activo (se usa en "/" y en "/t/$slug"). */
export function Storefront({ title }: { title?: string }) {
  const tenantId = useTenantId();
  const { data: categories } = useSuspenseQuery(categoriesQuery(tenantId));
  const { data: products } = useSuspenseQuery(productsQuery(tenantId));
  const active = products.filter((p) => p.is_active);
  const offers = active.filter((p) => p.sale_price != null && p.sale_price > 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <div className="mx-auto max-w-lg px-4">
        <Link
          to="/buscar"
          className="-mt-2 mb-4 flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted-foreground shadow-sm"
        >
          <Search className="size-4" />
          Buscar producto en la tienda
        </Link>

        <h1 className="sr-only">{title ?? "Mercadito Express, supermercado online"}</h1>

        <section className="mb-6">
          <h2 className="mb-3 font-display text-lg font-bold">Categorías</h2>
          <div className="grid grid-cols-4 gap-2">
            {categories.map((c) => (
              <Link
                key={c.id}
                to="/c/$slug"
                params={{ slug: c.slug }}
                className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-surface p-2 text-center"
              >
                <span className="text-2xl" aria-hidden>
                  {c.emoji}
                </span>
                <span className="text-[10px] font-medium leading-tight">{c.name}</span>
              </Link>
            ))}
          </div>
        </section>

        {offers.length > 0 && (
          <section className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">🏷️ Ofertas</h2>
              <Link to="/ofertas" className="text-sm font-semibold text-brand">
                Ver todas
              </Link>
            </div>
            <ProductGrid products={offers.slice(0, 6)} />
          </section>
        )}

        {categories
          .filter((c) => c.slug !== "promociones")
          .map((c) => {
            const items = active.filter((p) => p.category_id === c.id).slice(0, 4);
            if (items.length === 0) return null;
            return (
              <section key={c.id} className="mb-6">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold">
                    {c.emoji} {c.name}
                  </h2>
                  <Link
                    to="/c/$slug"
                    params={{ slug: c.slug }}
                    className="text-sm font-semibold text-brand"
                  >
                    Ver más
                  </Link>
                </div>
                <ProductGrid products={items} />
              </section>
            );
          })}
      </div>
      <StoreFooter />
    </div>
  );
}
