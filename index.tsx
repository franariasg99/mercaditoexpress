import { createFileRoute } from "@tanstack/react-router";
import { Storefront } from "@/components/market/Storefront";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mercadito Express — Supermercado online con envío rápido" },
      {
        name: "description",
        content:
          "Comprá verdulería, carnicería, bebidas, almacén y limpieza en Mercadito Express. Ofertas del día y entrega rápida.",
      },
      { property: "og:title", content: "Mercadito Express — Supermercado online" },
      {
        property: "og:description",
        content: "Todo el super a un toque: ofertas, secciones y carrito en tu celular.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <Storefront />;
}
