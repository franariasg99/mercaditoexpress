import { ProductCard } from "./ProductCard";
import type { Product } from "@/lib/market";

export function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No hay productos acá.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}