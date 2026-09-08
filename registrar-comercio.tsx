import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/market/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import {
  myTenantQuery,
  TENANT_STATUS_LABEL,
  TENANT_OPERATIVE,
  type TenantStatus,
} from "@/lib/tenant";
import {
  platformSettingsQuery,
  DEFAULT_PLATFORM_SETTINGS,
  waLink,
  billingDay,
  nextBillingDate,
  formatDateAR,
} from "@/lib/platform-settings";
import { money } from "@/lib/format";
import { createTenant, notifyPaymentSent } from "@/lib/platform.functions";

export const Route = createFileRoute("/registrar-comercio")({
  head: () => ({
    meta: [
      { title: "Registrá tu comercio — Plataforma Mercadito" },
      {
        name: "description",
        content:
          "Sumá tu comercio a la plataforma: cargá tus datos y esperá la aprobación para empezar a vender online.",
      },
      { property: "og:title", content: "Registrá tu comercio en la plataforma" },
      {
        property: "og:description",
        content: "Creá tu tienda online propia con productos, pedidos y panel de administración.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RegisterBusinessPage,
});

const slugify = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

function RegisterBusinessPage() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const mine = useQuery(myTenantQuery(user?.id));
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [touchedSlug, setTouchedSlug] = useState(false);

  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
  }, [user, email]);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const cleanSlug = slugify(touchedSlug ? slug : name);
    if (name.trim().length < 3) {
      toast.error("El nombre del comercio es muy corto");
      return;
    }
    if (cleanSlug.length < 3) {
      toast.error("El identificador de la tienda es muy corto");
      return;
    }
    setSaving(true);
    try {
      await createTenant({
        data: {
          name: name.trim(),
          slug: cleanSlug,
          contact_email: email.trim(),
          contact_phone: phone.trim() ? phone.trim() : null,
        },
      });
      toast.success("¡Solicitud enviada! Te avisamos cuando esté aprobada.");
      await qc.invalidateQueries({ queryKey: ["my-tenant"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo registrar el comercio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header subtitle="Sumá tu comercio" />
      <div className="mx-auto max-w-lg px-4 pt-6">
        <h1 className="mb-1 font-display text-2xl font-extrabold">Registrar mi comercio</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Cargá los datos de tu negocio. La plataforma revisa la solicitud y, una vez aprobada, vas
          a poder administrar tu propia tienda.
        </p>

        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : !user ? (
          <div className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-sm text-muted-foreground">
              Necesitás una cuenta para registrar tu comercio.
            </p>
            <Button asChild className="mt-3">
              <Link to="/auth">Ingresar o crear cuenta</Link>
            </Button>
          </div>
        ) : mine.data ? (
          <TenantStatusPanel tenant={mine.data} email={user.email ?? email} />
        ) : (

          <form
            onSubmit={submit}
            className="space-y-4 rounded-2xl border border-border bg-surface p-4"
          >
            <div>
              <Label htmlFor="nombre">Nombre del comercio</Label>
              <Input
                id="nombre"
                value={name}
                maxLength={60}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!touchedSlug) setSlug(slugify(e.target.value));
                }}
                placeholder="Almacén Don José"
                required
              />
            </div>
            <div>
              <Label htmlFor="slug">Identificador de la tienda</Label>
              <Input
                id="slug"
                value={slug}
                maxLength={40}
                onChange={(e) => {
                  setTouchedSlug(true);
                  setSlug(slugify(e.target.value));
                }}
                placeholder="almacen-don-jose"
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Tus clientes van a entrar por <code>/{slug || "tu-tienda"}</code>
              </p>
            </div>
            <div>
              <Label htmlFor="email">Email de contacto</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="tel">WhatsApp / teléfono</Label>
              <Input
                id="tel"
                value={phone}
                maxLength={30}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="5492615585633"
              />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Enviando…" : "Enviar solicitud"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function TenantStatusPanel({
  tenant,
  email,
}: {
  tenant: { id: string; slug: string; name: string; status: TenantStatus; created_at?: string };
  email: string;
}) {
  const qc = useQueryClient();
  const cfg = useQuery(platformSettingsQuery());
  const [sending, setSending] = useState(false);
  const settings = cfg.data ?? DEFAULT_PLATFORM_SETTINGS;
  const operative = TENANT_OPERATIVE.includes(tenant.status);
  const created = tenant.created_at ?? new Date().toISOString();

  const message = [
    "Hola, me registré en la plataforma y quiero enviar el comprobante de pago para completar el alta de mi página web.",
    "",
    `Comercio: ${tenant.name}`,
    `Email: ${email}`,
    `ID: ${tenant.id}`,
    `Valor mensual: $${settings.monthly_subscription_price}`,
    `Alias de transferencia: ${settings.payment_alias}`,
  ].join("\n");

  async function sendProof(): Promise<void> {
    window.open(waLink(settings.whatsapp_contact_number, message), "_blank", "noopener");
    if (operative) return;
    setSending(true);
    try {
      await notifyPaymentSent({ data: undefined });
      await qc.invalidateQueries({ queryKey: ["my-tenant"] });
      toast.success("Avisamos que enviaste el comprobante. Queda en revisión.");
    } catch {
      /* el aviso por WhatsApp ya se abrió */
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-display text-lg font-bold">{tenant.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Estado: <strong>{TENANT_STATUS_LABEL[tenant.status]}</strong>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Dirección de tu tienda: <code>/{tenant.slug}</code>
        </p>
        {operative && (
          <Button asChild className="mt-3">
            <Link to="/admin">Ir a mi panel</Link>
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <h3 className="font-display text-base font-bold">📅 Recordatorio de pago mensual</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Tu comercio se registró el día {billingDay(created)} del mes, así que todos los
          meses ese día vence el valor mensual vigente ({money(settings.monthly_subscription_price)}
          ). Transferí al alias <strong>{settings.payment_alias}</strong> y enviá el comprobante por
          WhatsApp.
        </p>
        <p className="mt-2 text-sm">
          Próximo pago: <strong>{formatDateAR(nextBillingDate(created))}</strong>
        </p>
        {operative && (
          <Button
            variant="outline"
            className="mt-3 w-full"
            onClick={() => void sendProof()}
            disabled={sending}
          >
            Enviar comprobante por WhatsApp
          </Button>
        )}
      </div>

      {!operative && (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <h3 className="font-display text-base font-bold">Activación de tu página web</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Tu comercio quedó registrado, pero todavía falta confirmar el pago para darlo de alta.
            Realizá el pago del valor mensual y envianos el comprobante por WhatsApp. Cuando lo
            verifiquemos manualmente, habilitamos tu cuenta y publicamos tu página.
          </p>
          <dl className="mt-3 space-y-1 text-sm">
            <div>
              <dt className="inline font-medium">Valor mensual: </dt>
              <dd className="inline">{money(settings.monthly_subscription_price)}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Alias para transferir: </dt>
              <dd className="inline font-semibold">{settings.payment_alias}</dd>{" "}
              <button
                type="button"
                className="text-xs font-medium underline"
                onClick={() => {
                  void navigator.clipboard.writeText(settings.payment_alias);
                  toast.success("Alias copiado");
                }}
              >
                Copiar
              </button>
            </div>
            <div>
              <dt className="inline font-medium">WhatsApp de contacto: </dt>
              <dd className="inline">{settings.whatsapp_contact_number}</dd>
            </div>
          </dl>
          <Button className="mt-4 w-full" disabled={sending} onClick={() => void sendProof()}>
            Enviar comprobante por WhatsApp
          </Button>
        </div>
      )}
    </div>
  );
}
