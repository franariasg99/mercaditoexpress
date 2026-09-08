import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Header } from "@/components/market/Header";
import { AliasBox } from "@/components/market/AliasBox";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/format";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, DELIVERY_LABEL, orderCode } from "@/lib/orders";
import { DEFAULT_SETTINGS, settingsQuery } from "@/lib/settings";
import { useTenantId } from "@/lib/tenant";
import { getOrder } from "@/lib/store.functions";
import { MessageCircle } from "lucide-react";
import { buildOrderMessage, whatsappUrl } from "@/lib/whatsapp";

export const Route = createFileRoute("/pedido/$id")({
  head: () => ({
    meta: [
      { title: "Estado de tu pedido — Mercadito Express" },
      { name: "description", content: "Seguí el estado de tu pedido de Mercadito Express." },
      { property: "og:title", content: "Estado de tu pedido — Mercadito Express" },
      { property: "og:description", content: "Seguimiento de pedidos de Mercadito Express." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrderPage,
});

function OrderPage() {
  const { id } = Route.useParams();
  const [token, setToken] = useState<string | null>(null);
  const tenantId = useTenantId();
  const settings = useQuery(settingsQuery(tenantId)).data ?? DEFAULT_SETTINGS;

  useEffect(() => {
    try {
      setToken(localStorage.getItem(`me-order-${id}`));
    } catch {
      setToken(null);
    }
  }, [id]);

  const order = useQuery({
    queryKey: ["order", id, token],
    enabled: Boolean(token),
    queryFn: () => getOrder({ data: { id, token: token! } }),
  });

  const o = order.data;

  const waLink = o
    ? whatsappUrl(
        buildOrderMessage({
          order_number: o.order_number,
          customer_name: o.customer_name ?? "",
          phone: o.phone ?? "",
          address: o.address,
          address_reference: o.address_reference,
          notes: o.notes,
          delivery_method: o.delivery_method,
          payment_status: o.payment_status,
          delivery_date: o.delivery_date,
          delivery_time: o.delivery_time,
          service_fee: o.service_fee,
          shipping: o.shipping_cost,
          tip: o.tip,
          payment_alias: settings.payment_alias,
          payment_method: o.payment_provider,
          total: o.total,
          items: o.items,
        }),
        settings.store_whatsapp,
      )
    : null;

  useEffect(() => {
    if (!o) return;
    const key = `me-wa-${o.id}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    const msg = buildOrderMessage({
      order_number: o.order_number,
      customer_name: o.customer_name ?? "",
      phone: o.phone ?? "",
      address: o.address,
      address_reference: o.address_reference,
      notes: o.notes,
      delivery_method: o.delivery_method,
      payment_status: o.payment_status,
      delivery_date: o.delivery_date,
      delivery_time: o.delivery_time,
      service_fee: o.service_fee,
      shipping: o.shipping_cost,
      tip: o.tip,
      payment_alias: settings.payment_alias,
      payment_method: o.payment_provider,
      total: o.total,
      items: o.items,
    });
    window.open(whatsappUrl(msg, settings.store_whatsapp), "_blank", "noopener");
  }, [o, settings.payment_alias, settings.store_whatsapp]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header subtitle="Tu pedido" />
      <div className="mx-auto max-w-lg space-y-4 px-4 pt-4">
        {!token || (order.isFetched && !o) ? (
          <div className="rounded-2xl border border-border bg-surface p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No encontramos este pedido en este dispositivo.
            </p>
            <Button asChild className="mt-3">
              <Link to="/">Volver al catálogo</Link>
            </Button>
          </div>
        ) : !o ? (
          <p className="text-sm text-muted-foreground">Cargando pedido…</p>
        ) : (
          <>
            <div className="rounded-2xl border border-border bg-surface p-4">
              <h1 className="font-display text-2xl font-extrabold">
                Pedido {orderCode(o.order_number)}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {DELIVERY_LABEL[o.delivery_method] ?? o.delivery_method}
                {o.delivery_date ? ` · ${o.delivery_date}` : ""}
                {o.delivery_time ? ` · ${o.delivery_time}` : ""}
              </p>
              <p className="mt-2 text-sm font-semibold">
                {PAYMENT_STATUS_LABEL[o.payment_status] ?? o.payment_status}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-4">
              <h2 className="mb-3 font-display text-base font-bold">Estado del pedido</h2>
              <ol className="space-y-2 text-sm">
                {ORDER_STATUSES.filter((s) => s !== "cancelado").map((s) => {
                  const idx = ORDER_STATUSES.indexOf(o.status as (typeof ORDER_STATUSES)[number]);
                  const done = ORDER_STATUSES.indexOf(s) <= idx;
                  return (
                    <li key={s} className="flex items-center gap-2">
                      <span
                        className={`size-2.5 rounded-full ${done ? "bg-brand" : "bg-muted-foreground/30"}`}
                      />
                      <span className={done ? "font-semibold" : "text-muted-foreground"}>
                        {ORDER_STATUS_LABEL[s]}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>

            {o.payment_provider === "efectivo" ? (
              <div className="rounded-2xl border border-border bg-surface p-4">
                <h2 className="font-display text-base font-bold">💵 Pago en efectivo</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Abonás en efectivo al recibir tu pedido{" "}
                  {o.delivery_method === "retiro" ? "en el local." : "en tu domicilio."}
                </p>
              </div>
            ) : (
              <AliasBox alias={settings.payment_alias} />
            )}

            {waLink && (
              <Button asChild className="w-full" size="lg">
                <a href={waLink} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="size-4" /> Enviar pedido por WhatsApp
                </a>
              </Button>
            )}

            <div className="rounded-2xl border border-border bg-surface p-4 text-sm">
              <h2 className="mb-3 font-display text-base font-bold">Detalle</h2>
              <ul className="space-y-1">
                {o.items.map((i, n) => (
                  <li key={n} className="flex justify-between gap-2">
                    <span className="min-w-0 truncate">
                      {i.quantity} × {i.name}
                    </span>
                    <span>{money(i.unit_price * i.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 space-y-1 border-t border-border pt-3">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{money(o.subtotal_final)}</span>
                </div>
                {o.service_fee > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tarifa de servicio</span>
                    <span>{money(o.service_fee)}</span>
                  </div>
                )}
                {o.shipping_cost > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Envío</span>
                    <span>{money(o.shipping_cost)}</span>
                  </div>
                )}
                {o.tip > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Propina</span>
                    <span>{money(o.tip)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span>{money(o.total)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}