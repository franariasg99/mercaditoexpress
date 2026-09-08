import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/market/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { money } from "@/lib/format";
import { useAuth, useIsSuperAdmin } from "@/hooks/useAuth";
import { TENANT_STATUS_LABEL, type TenantStatus } from "@/lib/tenant";
import {
  listTenants,
  setTenantStatus,
  savePlatformConfig,
  deleteTenant,
} from "@/lib/platform.functions";
import {
  platformSettingsQuery,
  DEFAULT_PLATFORM_SETTINGS,
} from "@/lib/platform-settings";

export const Route = createFileRoute("/_authenticated/plataforma")({
  head: () => ({
    meta: [
      { title: "Administración de la plataforma — Super Admin" },
      {
        name: "description",
        content: "Panel global para aprobar, activar y suspender los comercios de la plataforma.",
      },
      { property: "og:title", content: "Administración de la plataforma" },
      {
        property: "og:description",
        content: "Gestión global de comercios, estados y permisos.",
      },
    ],
  }),
  component: PlatformAdminPage,
});

type Filter = "todos" | "pending" | "active" | "suspended";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "pending", label: "Pendientes" },
  { id: "active", label: "Activos" },
  { id: "suspended", label: "Suspendidos" },
];

const OPERATIVE: TenantStatus[] = ["active", "trial", "subscription_active"];
const PENDING: TenantStatus[] = ["pending", "pending_payment", "pending_approval"];

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

const fmtDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Nunca ingresó";

function PlatformAdminPage() {
  const { user } = useAuth();
  const { isSuperAdmin, checking } = useIsSuperAdmin();
  const [filter, setFilter] = useState<Filter>("todos");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const tenants = useQuery({
    queryKey: ["platform-tenants", user?.id],
    queryFn: () => listTenants({ data: undefined }),
    enabled: Boolean(user && isSuperAdmin),
  });

  async function removeTenant(id: string, name: string): Promise<void> {
    const ok = window.confirm(
      `¿Eliminar definitivamente "${name}"? Se borran su tienda, productos, pedidos y configuración. Para volver, deberá hacer el alta nuevamente.`,
    );
    if (!ok) return;
    setBusy(id);
    try {
      await deleteTenant({ data: { tenant_id: id } });
      toast.success("Comercio eliminado");
      await tenants.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar el comercio");
    } finally {
      setBusy(null);
    }
  }

  async function changeStatus(id: string, status: TenantStatus): Promise<void> {
    setBusy(id);
    try {
      await setTenantStatus({ data: { tenant_id: id, status } });
      toast.success("Estado actualizado");
      await tenants.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar el estado");
    } finally {
      setBusy(null);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-background p-6 text-sm text-muted-foreground">Cargando…</div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header subtitle="Plataforma" />
        <div className="mx-auto max-w-lg px-4 pt-10 text-center">
          <h1 className="font-display text-xl font-bold">Acceso restringido</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta sección es solo para la administración global de la plataforma.
          </p>
          <Button asChild className="mt-4">
            <Link to="/">Volver al catálogo</Link>
          </Button>
        </div>
      </div>
    );
  }

  const term = search.trim().toLowerCase();
  const rows = (tenants.data ?? []).filter((t) => {
    const byFilter =
      filter === "todos"
        ? true
        : filter === "active"
          ? OPERATIVE.includes(t.status as TenantStatus)
          : filter === "pending"
            ? PENDING.includes(t.status as TenantStatus)
            : t.status === filter;
    const byTerm = term
      ? `${t.name} ${t.slug} ${t.owner_email ?? ""}`.toLowerCase().includes(term)
      : true;
    return byFilter && byTerm;
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header subtitle="Administración de la plataforma" />
      <div className="mx-auto max-w-lg px-4 pt-4">
        <h1 className="mb-1 font-display text-2xl font-extrabold">🏢 Administración global</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          Comercios registrados en la plataforma y su estado.
        </p>

        <CommercialConfigCard />

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar comercio o email"
          className="mb-3"
        />

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium ${
                filter === f.id
                  ? "border-transparent bg-brand text-brand-foreground"
                  : "border-border bg-surface text-muted-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {tenants.isLoading && <p className="text-sm text-muted-foreground">Cargando comercios…</p>}
        {tenants.isError && (
          <p className="text-sm text-destructive">No se pudieron cargar los comercios.</p>
        )}
        {!tenants.isLoading && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">No hay comercios para este filtro.</p>
        )}

        <div className="space-y-3">
          {rows.map((t) => {
            const operative = OPERATIVE.includes(t.status as TenantStatus);
            return (
              <article key={t.id} className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-base font-bold">{t.name}</h2>
                    <p className="truncate text-xs text-muted-foreground">/{t.slug}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${
                      operative
                        ? "bg-emerald-100 text-emerald-800"
                        : t.status === "suspended"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {operative ? "🟢" : t.status === "suspended" ? "🔴" : "🟡"}{" "}
                    {TENANT_STATUS_LABEL[t.status as TenantStatus]}
                  </span>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <div>
                    <dt className="inline font-medium">Admin: </dt>
                    <dd className="inline break-all">{t.owner_email ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium">Teléfono: </dt>
                    <dd className="inline">{t.contact_phone ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium">Registro: </dt>
                    <dd className="inline">{fmt(t.created_at)}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium">Activación: </dt>
                    <dd className="inline">{fmt(t.activated_at)}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="inline font-medium">Última conexión: </dt>
                    <dd className="inline">{fmtDateTime(t.last_sign_in_at)}</dd>
                  </div>
                </dl>

                <div className="mt-3 flex flex-wrap gap-2">
                  {!operative && (
                    <Button
                      size="sm"
                      disabled={busy === t.id}
                      onClick={() => void changeStatus(t.id, "active")}
                    >
                      {PENDING.includes(t.status as TenantStatus)
                        ? "Aprobar y activar"
                        : "Reactivar"}
                    </Button>
                  )}
                  {operative && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === t.id}
                      onClick={() => void changeStatus(t.id, "suspended")}
                    >
                      Suspender
                    </Button>
                  )}
                  {PENDING.includes(t.status as TenantStatus) && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === t.id}
                      onClick={() => void changeStatus(t.id, "suspended")}
                    >
                      Rechazar
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" asChild>
                    <Link to="/$slug" params={{ slug: t.slug }}>
                      Ver tienda
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busy === t.id}
                    onClick={() => void removeTenant(t.id, t.name)}
                  >
                    Eliminar
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CommercialConfigCard() {
  const cfg = useQuery(platformSettingsQuery());
  const [price, setPrice] = useState("");
  const [phone, setPhone] = useState("");
  const [alias, setAlias] = useState("");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!cfg.data) return;
    setPrice(String(cfg.data.monthly_subscription_price));
    setPhone(cfg.data.whatsapp_contact_number);
    setAlias(cfg.data.payment_alias);
  }, [cfg.data]);

  const current = cfg.data ?? DEFAULT_PLATFORM_SETTINGS;

  async function save(): Promise<void> {
    const value = Number(price);
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Ingresá un valor mensual válido");
      return;
    }
    if (phone.replace(/\D/g, "").length < 6) {
      toast.error("Ingresá un número de WhatsApp válido");
      return;
    }
    if (alias.trim().length < 3) {
      toast.error("Ingresá el alias de transferencia");
      return;
    }
    setSaving(true);
    try {
      await savePlatformConfig({
        data: {
          monthly_subscription_price: value,
          whatsapp_contact_number: phone.trim(),
          payment_alias: alias.trim(),
        },
      });
      await cfg.refetch();
      toast.success("Configuración comercial actualizada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-4 rounded-2xl border border-border bg-surface p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="font-display text-base font-bold">💳 Configuración comercial</span>
        <span className="text-sm text-muted-foreground">{open ? "▲" : "▼"}</span>
      </button>
      {!open && (
        <p className="mt-1 text-xs text-muted-foreground">
          Valor mensual {money(current.monthly_subscription_price)} · Alias {current.payment_alias}{" "}
          · WhatsApp {current.whatsapp_contact_number}
        </p>
      )}
      {open && (
        <div className="mt-3 space-y-3">
          <div>
            <Label htmlFor="precio">Valor mensual de la suscripción</Label>
            <Input
              id="precio"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="alias">Alias para transferencias</Label>
            <Input id="alias" value={alias} onChange={(e) => setAlias(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="wa">Número de WhatsApp para altas y comprobantes</Label>
            <Input id="wa" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <Button className="w-full" disabled={saving} onClick={() => void save()}>
            {saving ? "Guardando…" : "Guardar configuración"}
          </Button>
        </div>
      )}
    </section>
  );
}
