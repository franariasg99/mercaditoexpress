import { Link } from "@tanstack/react-router";
import { Home, Search, ShoppingBag, User, Tag } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useNewOrdersCount } from "@/hooks/useNewOrders";

const items = [
  { to: "/", label: "Inicio", icon: Home, exact: true },
  { to: "/buscar", label: "Buscar", icon: Search, exact: false },
  { to: "/ofertas", label: "Ofertas", icon: Tag, exact: false },
  { to: "/carrito", label: "Carrito", icon: ShoppingBag, exact: false },
  { to: "/cuenta", label: "Cuenta", icon: User, exact: false },
] as const;

export function BottomNav() {
  const { count } = useCart();
  const { count: newOrders } = useNewOrdersCount();


  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-lg">
        {items.map(({ to, label, icon: Icon, exact }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              activeOptions={{ exact }}
              className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground"
              activeProps={{ className: "!text-brand font-semibold" }}
            >
              <span className="relative">
                <Icon className="size-5" />
                {to === "/carrito" && count > 0 && (
                  <span className="absolute -right-2 -top-1 grid size-4 place-items-center rounded-full bg-offer text-[9px] font-bold text-offer-foreground">
                    {count}
                  </span>
                )}
                {to === "/cuenta" && newOrders > 0 && (
                  <span className="absolute -right-2 -top-1 grid min-w-4 place-items-center rounded-full bg-offer px-1 text-[9px] font-bold text-offer-foreground">
                    {newOrders > 9 ? "9+" : newOrders}
                  </span>
                )}
              </span>

              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}