import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Category = {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  sort_order: number;
};

export type Product = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  unit: string;
  emoji: string;
  image_url: string | null;
  images: string[] | null;
  price: number;
  sale_price: number | null;
  stock: number;
  is_active: boolean;
  promo_type: string;
  promo_percent: number | null;
  promo_buy_qty: number | null;
  promo_pay_qty: number | null;
  sold_count: number;
};

export const priceOf = (p: Pick<Product, "price" | "sale_price">) =>
  p.sale_price != null && p.sale_price > 0 ? p.sale_price : p.price;

export const categoriesQuery = (tenantId: string | null) =>
  queryOptions({
    queryKey: ["categories", tenantId],
    queryFn: async (): Promise<Category[]> => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("categories")
        .select("id, slug, name, emoji, sort_order")
        .eq("tenant_id", tenantId)
        .order("sort_order");
      if (error) throw error;
      return data as Category[];
    },
  });

export const productsQuery = (tenantId: string | null) =>
  queryOptions({
    queryKey: ["products", tenantId],
    queryFn: async (): Promise<Product[]> => {
      if (!tenantId) return [];
      const { data, error } = await supabase
      .from("products")
      .select(
        "id, category_id, name, description, unit, emoji, image_url, images, price, sale_price, stock, is_active, promo_type, promo_percent, promo_buy_qty, promo_pay_qty, sold_count",
      )
      .eq("tenant_id", tenantId)
      .order("name");
      if (error) throw error;
      return data as unknown as Product[];
    },
  });