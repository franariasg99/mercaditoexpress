import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { Header } from "@/components/market/Header";
import { ProductGrid } from "@/components/market/ProductGrid";
import { categoriesQuery, productsQuery } from "@/lib/market";
import { useTenantId } from "@/lib/tenant";

export const Route = createFileRoute("/c/$slug")({
  head: ({ params }) => {
    const title = `Sección ${params.slug.replace(/-/g, " ")} — Mercadito Express`;
    const description = `Comprá productos de ${params.slug.replace(/-/g, " ")} en Mercadito Express con entrega rápida.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const tenantId = useTenantId();
  const { data: categories } = useSuspenseQuery(categoriesQuery(tenantId));
  const { data: products } = useSuspenseQuery(productsQuery(tenantId));
  const category = categories.find((c) => c.slug === slug);

  const items =
    slug === "promociones"
      ? products.filter((p) => p.is_active && p.sale_price != null && p.sale_price > 0)
      : products.filter((p) => p.is_active && p.category_id === category?.id);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header subtitle={category?.name} />
      <div className="mx-auto max-w-lg px-4 pt-4">
        <Link to="/" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-brand">
          <ChevronLeft className="size-4" /> Volver
        </Link>
        <h1 className="mb-4 font-display text-2xl font-extrabold">
          {category?.emoji} {category?.name ?? "Sección"}
        </h1>
        <ProductGrid products={items} />
      </div>
    </div>
  );
}