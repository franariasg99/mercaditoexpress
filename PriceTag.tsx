import { money } from "@/lib/format";
import { priceLine, type Promotable } from "@/lib/pricing";

/** Precio de un producto con su promoción, sin depender de la cantidad del carrito. */
export function PriceTag({ product, size = "sm" }: { product: Promotable; size?: "sm" | "lg" }) {
  const single = priceLine(product, 1);
  const isQtyPromo = single.percentOff == null && single.badge != null;
  const pair = isQtyPromo ? priceLine(product, promoQty(product)) : null;
  const big = size === "lg" ? "text-2xl" : "text-base";
  const small = size === "lg" ? "text-sm" : "text-xs";

  return (
    <div className="mt-1">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className={`${big} font-bold text-brand`}>{money(single.unitDisplay)}</span>
        {single.percentOff != null && (
          <span className={`${small} text-muted-foreground line-through`}>
            {money(product.price)}
          </span>
        )}
      </div>
      {pair && (
        <p className={`${small} text-muted-foreground`}>
          <span className="line-through">{money(pair.original)}</span>{" "}
          <span className="font-semibold text-foreground">
            {money(pair.total)} por {promoQty(product)}
          </span>{" "}
          · {money(pair.unitEffective)} c/u
        </p>
      )}
    </div>
  );
}

export function promoQty(product: Promotable): number {
  if (product.promo_type === "nxm") return Math.max(2, product.promo_buy_qty ?? 2);
  if (product.promo_type === "second_unit") return 2;
  return 1;
}

export function PromoBadge({ product }: { product: Promotable }) {
  const badge = priceLine(product, promoQty(product)).badge;
  if (!badge) return null;
  return (
    <span className="absolute left-1 top-1 rounded-full bg-offer px-2 py-0.5 text-[10px] font-bold text-offer-foreground">
      {badge}
    </span>
  );
}