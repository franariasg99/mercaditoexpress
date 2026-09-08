import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Building2, LogOut, Package, Settings, Store } from "lucide-react";
import { Header } from "@/components/market/Header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useAdminTenant, useIsAdmin, useIsSuperAdmin } from "@/hooks/useAuth";
import { useNewOrdersCount } from "@/hooks/useNewOrders";
import { money } from "@/lib/format";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, orderCode } from "@/lib/orders";


export const Route = createFileRoute("/cuenta")({
  head: () => ({
    meta: [
      { title: "Mi cuenta y pedidos — Mercadito Express" },
      { name: "description", content: "Consultá tus pedidos, tus datos de entrega y cerrá sesión." },
      { property: "og:title", content: "Mi cuenta — Mercadito Express" },
      { property: "og:description", content: "Cuenta de cliente de Mercadito Express." },
    ],
  }),
  component: CuentaPage,
});

function CuentaPage() {
  const { user, loading } = useAuth();
  const { isAdmin } = useIsAdmin(user?.id);
  const { tenant } = useAdminTenant();
  const { isSuperAdmin } = useIsSuperAdmin();
  const { count: newOrders } = useNewOrdersCount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();


  const orders = useQuery({
    queryKey: ["orders", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_number, created_at, status, payment_status, total, order_items(name, quantity, unit_price)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header subtitle="Mi cuenta" />
      <div className="mx-auto max-w-lg px-4 pt-4">
        <h1 className="mb-4 font-display text-2xl font-extrabold">👤 Mi cuenta</h1>

        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : !user ? (
          <div className="rounded-2xl border border-border bg-surface p-6 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              Ingresá para ver tus pedidos y comprar.
            </p>
            <Button asChild>
              <Link to="/auth">Ingresar o crear cuenta</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {newOrders > 0 && (
              <Link
                to="/admin"
                className="flex items-center gap-3 rounded-2xl border border-offer/40 bg-offer/10 p-4"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-offer text-offer-foreground">
                  <Bell className="size-5" />
                </span>
                <span className="text-sm">
                  <span className="block font-semibold">
                    {newOrders === 1
                      ? "Tenés 1 pedido nuevo"
                      : `Tenés ${newOrders} pedidos nuevos`}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Tocá para verlos en el panel de administración
                  </span>
                </span>
              </Link>
            )}

            <div className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-xs text-muted-foreground">Sesión iniciada como</p>
              <p className="truncate font-semibold">{user.email}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(isAdmin || tenant) && (
                  <Button asChild variant="secondary" size="sm">
                    <Link to="/admin">
                      <Settings className="mr-1 size-4" /> Panel de administración
                    </Link>
                  </Button>
                )}
                {isSuperAdmin && (
                  <Button asChild variant="secondary" size="sm">
                    <Link to="/plataforma">
                      <Building2 className="mr-1 size-4" /> Administración de la plataforma
                    </Link>
                  </Button>
                )}
                {!tenant && (
                  <Button asChild variant="outline" size="sm">
                    <Link to="/registrar-comercio">
                      <Store className="mr-1 size-4" /> Registrar mi comercio
                    </Link>
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={signOut}>
                  <LogOut className="mr-1 size-4" /> Cerrar sesión
                </Button>
              </div>
            </div>

            <section>
              <h2 className="mb-2 font-display text-lg font-bold">📋 Mis pedidos</h2>
              {orders.isLoading ? (
                <p className="text-sm text-muted-foreground">Cargando pedidos…</p>
              ) : (orders.data?.length ?? 0) === 0 ? (
                <p className="rounded-2xl border border-border bg-surface p-4 text-sm text-muted-foreground">
                  Todavía no hiciste pedidos.
                </p>
              ) : (
                <ul className="space-y-3">
                  {orders.data?.map((o) => (
                    <li key={o.id} className="rounded-2xl border border-border bg-surface p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-sm font-semibold">
                          <Package className="size-4" />
                          {orderCode(o.order_number)} ·{" "}
                          {new Date(o.created_at).toLocaleDateString("es-AR")}
                        </span>
                        <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                          {ORDER_STATUS_LABEL[o.status] ?? o.status}
                        </span>
                      </div>
                      <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                        {o.order_items.map((it, i) => (
                          <li key={i}>
                            {it.quantity} × {it.name} — {money(Number(it.unit_price))}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-xs text-muted-foreground">
                          {PAYMENT_STATUS_LABEL[o.payment_status] ?? o.payment_status}
                        </span>
                        <span className="font-bold">{money(Number(o.total))}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}