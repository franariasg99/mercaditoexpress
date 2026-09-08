import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { Header } from "@/components/market/Header";
import { ProductGrid } from "@/components/market/ProductGrid";
import { Input } from "@/components/ui/input";
import { productsQuery } from "@/lib/market";
import { useTenantId } from "@/lib/tenant";

export const Route = createFileRoute("/buscar")({
  head: () => ({
    meta: [
      { title: "Buscar productos — Mercadito Express" },
      {
        name: "description",
        content: "Encontrá cualquier producto del market: escribí el nombre y agregalo al carrito.",
      },
      { property: "og:title", content: "Buscar productos — Mercadito Express" },
      { property: "og:description", content: "Buscador del supermercado online Mercadito Express." },
    ],
  }),
  component: BuscarPage,
});

function BuscarPage() {
  const [q, setQ] = useState("");
  const tenantId = useTenantId();
  const { data: products } = useSuspenseQuery(productsQuery(tenantId));
  const term = q.trim().toLowerCase();
  const results = term
    ? products.filter((p) => p.is_active && p.name.toLowerCase().includes(term))
    : [];

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header subtitle="Buscador" />
      <div className="mx-auto max-w-lg px-4 pt-4">
        <h1 className="mb-3 font-display text-2xl font-extrabold">🔎 Buscar</h1>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar producto en la tienda"
            className="h-12 rounded-2xl pl-9"
          />
        </div>
        {term ? (
          <ProductGrid products={results} />
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Escribí qué estás buscando.
          </p>
        )}
      </div>
    </div>
  );
}