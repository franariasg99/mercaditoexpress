import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Storefront } from "@/components/market/Storefront";
import { Button } from "@/components/ui/button";
import { useIsSuperAdmin } from "@/hooks/useAuth";
import { TENANT_OPERATIVE, TENANT_STATUS_LABEL, useTenant } from "@/lib/tenant";

export const Route = createFileRoute("/$slug")({
  head: () => ({
    meta: [
      { title: "Tienda online — Comprá con envío rápido" },
      {
        name: "description",
        content:
          "Catálogo, ofertas y carrito del comercio: elegí tus productos y hacé el pedido desde el celular.",
      },
      { property: "og:title", content: "Tienda online del comercio" },
      {
        property: "og:description",
        content: "Catálogo, ofertas y pedidos online con entrega o retiro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TenantStorePage,
});

function TenantStorePage() {
  const { slug } = Route.useParams();
  const { tenant, loading, setSlug, slug: activeSlug } = useTenant();
  const { isSuperAdmin, checking } = useIsSuperAdmin();

  useEffect(() => {
    if (slug && slug !== activeSlug) setSlug(slug);
  }, [slug, activeSlug, setSlug]);

  if (loading || checking || activeSlug !== slug) {
    return (
      <div className="min-h-screen bg-background p-6 text-sm text-muted-foreground">
        Cargando tienda…
      </div>
    );
  }

  if (!tenant || tenant.slug !== slug) {
    return (
      <div className="min-h-screen bg-background px-4 pt-16 text-center">
        <h1 className="font-display text-xl font-bold">No encontramos esta tienda</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Verificá el enlace o volvé al inicio de la plataforma.
        </p>
        <Button asChild className="mt-4">
          <Link to="/">Ir al inicio</Link>
        </Button>
      </div>
    );
  }

  if (!TENANT_OPERATIVE.includes(tenant.status) && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background px-4 pt-16 text-center">
        <h1 className="font-display text-xl font-bold">{tenant.name} no está disponible</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Estado del comercio: {TENANT_STATUS_LABEL[tenant.status]}.
        </p>
        <Button asChild className="mt-4">
          <Link to="/">Ir al inicio</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      {isSuperAdmin && !TENANT_OPERATIVE.includes(tenant.status) && (
        <div className="bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-900">
          Vista de administración global · {tenant.name} está{" "}
          {TENANT_STATUS_LABEL[tenant.status].toLowerCase()}
        </div>
      )}
      <Storefront title={`${tenant.name}, tienda online`} />
    </>
  );
}
