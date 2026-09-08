import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { money } from "@/lib/format";
import { type Product } from "@/lib/market";
import { useCart } from "@/lib/cart";
import { ProductImage } from "./ProductImage";
import { PriceTag, PromoBadge, promoQty } from "./PriceTag";
import { priceLine } from "@/lib/pricing";
import { toast } from "sonner";

export function productPhotos(product: Pick<Product, "image_url" | "images">): string[] {
  const list = [product.image_url ?? "", ...(product.images ?? [])]
    .map((u) => (typeof u === "string" ? u.trim() : ""))
    .filter((u) => u !== "");
  return Array.from(new Set(list)).slice(0, 4);
}

export function ProductCard({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [photoIdx, setPhotoIdx] = useState(0);
  const { add } = useCart();
  const photos = productPhotos(product);
  const mainPhoto = photos[photoIdx] ?? photos[0] ?? null;
  const out = product.stock <= 0;
  const line = priceLine(product, qty);

  function confirm() {
    if (qty > product.stock) {
      toast.error(`No hay stock suficiente de ${product.name} (quedan ${product.stock})`);
      return;
    }
    add(
      {
        id: product.id,
        name: product.name,
        emoji: product.emoji,
        image_url: product.image_url,
        unit: product.unit,
        price: product.price,
        sale_price: product.sale_price,
        promo_type: product.promo_type,
        promo_percent: product.promo_percent,
        promo_buy_qty: product.promo_buy_qty,
        promo_pay_qty: product.promo_pay_qty,
        stock: product.stock,
      },
      qty,
    );
    toast.success(`${product.name} agregado`, { description: `${qty} × ${product.unit}` });
    setOpen(false);
    setQty(1);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex w-full flex-col rounded-2xl border border-border bg-card p-3 text-left shadow-sm transition active:scale-[0.98]"
        >
          <div className="relative mb-2 grid aspect-square w-full place-items-center overflow-hidden rounded-xl bg-muted p-2">
            <ProductImage src={photos[0] ?? null} alt={product.name} emoji={product.emoji} />
            {photos.length > 1 && (
              <span className="absolute bottom-1 right-1 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {photos.length} fotos
              </span>
            )}
            <PromoBadge product={product} />
            {out && (
              <span className="absolute inset-0 grid place-items-center rounded-xl bg-background/70 text-xs font-semibold text-muted-foreground">
                Sin stock
              </span>
            )}
          </div>
          <p className="line-clamp-2 min-h-10 text-sm font-medium leading-tight">{product.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{product.unit}</p>
          <PriceTag product={product} />
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-md rounded-2xl p-4 sm:p-6">
        <DialogHeader className="sr-only">
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>
            {product.unit} · Stock disponible: {product.stock}
          </DialogDescription>
        </DialogHeader>

        <div className="relative mx-auto aspect-square w-full max-w-[320px] overflow-hidden rounded-2xl bg-muted p-4">
          <ProductImage
            src={mainPhoto}
            alt={product.name}
            emoji={product.emoji}
            emojiClassName="text-7xl"
            className="object-contain"
          />
        </div>

        {photos.length > 1 && (
          <div className="mx-auto flex max-w-[320px] flex-wrap justify-center gap-2">
            {photos.map((url, i) => (
              <button
                key={url}
                type="button"
                aria-label={`Ver foto ${i + 1}`}
                onClick={() => setPhotoIdx(i)}
                className={`grid size-16 place-items-center overflow-hidden rounded-xl border-2 bg-muted p-1 transition ${
                  i === photoIdx ? "border-brand" : "border-border"
                }`}
              >
                <ProductImage src={url} alt={`${product.name} ${i + 1}`} emoji={product.emoji} />
              </button>
            ))}
          </div>
        )}

        <div>
          <h2 className="font-display text-xl font-bold">{product.name}</h2>
          <p className="text-sm text-muted-foreground">
            {product.unit} · Stock disponible: {product.stock}
          </p>
        </div>

        {product.description && product.description.trim() !== "" && (
          <p className="whitespace-pre-line text-sm leading-snug text-muted-foreground">
            {product.description}
          </p>
        )}

        <PriceTag product={product} size="lg" />
        {promoQty(product) > 1 && (
          <p className="rounded-xl bg-accent/40 p-2 text-xs font-medium">
            Llevá {promoQty(product)} y ahorrás{" "}
            {money(priceLine(product, promoQty(product)).discount)}
          </p>
        )}

        <div className="flex items-center justify-between rounded-xl bg-muted p-2">
          <Button
            size="icon"
            variant="secondary"
            aria-label="Restar"
            disabled={qty <= 1}
            onClick={() => setQty((q) => Math.max(1, q - 1))}
          >
            <Minus className="size-4" />
          </Button>
          <span className="text-lg font-semibold">{qty}</span>
          <Button
            size="icon"
            variant="secondary"
            aria-label="Sumar"
            disabled={qty >= product.stock}
            onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
          >
            <Plus className="size-4" />
          </Button>
        </div>

        <Button className="w-full" disabled={out} onClick={confirm}>
          {out ? "Sin stock" : `Agregar · ${money(line.total)}`}
        </Button>
        {line.discount > 0 && (
          <p className="-mt-2 text-center text-xs font-semibold text-brand">
            Ahorrás {money(line.discount)}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}