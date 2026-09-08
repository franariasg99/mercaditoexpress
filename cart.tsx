import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartLine = {
  id: string;
  name: string;
  emoji: string;
  image_url?: string | null;
  unit: string;
  /** Precio de lista (sin promociones). */
  price: number;
  sale_price?: number | null;
  promo_type?: string | null;
  promo_percent?: number | null;
  promo_buy_qty?: number | null;
  promo_pay_qty?: number | null;
  stock: number;
  qty: number;
};

type CartCtx = {
  lines: CartLine[];
  count: number;
  add: (line: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "nido-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw) as CartLine[]);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* ignore */
    }
  }, [lines]);

  const value = useMemo<CartCtx>(() => {
    const clamp = (qty: number, stock: number) => Math.max(0, Math.min(qty, stock));
    return {
      lines,
      count: lines.reduce((a, l) => a + l.qty, 0),
      add: (line, qty = 1) =>
        setLines((prev) => {
          const found = prev.find((l) => l.id === line.id);
          if (found) {
            return prev.map((l) =>
              l.id === line.id ? { ...l, ...line, qty: clamp(l.qty + qty, line.stock) } : l,
            );
          }
          return [...prev, { ...line, qty: clamp(qty, line.stock) }];
        }),
      setQty: (id, qty) =>
        setLines((prev) =>
          prev
            .map((l) => (l.id === id ? { ...l, qty: clamp(qty, l.stock) } : l))
            .filter((l) => l.qty > 0),
        ),
      remove: (id) => setLines((prev) => prev.filter((l) => l.id !== id)),
      clear: () => setLines([]),
    };
  }, [lines]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}