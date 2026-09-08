import { queryOptions, useQuery } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Slug del comercio original: la app sigue funcionando igual que siempre en "/". */
export const DEFAULT_TENANT_SLUG = "mercadito-express";
const STORAGE_KEY = "mercadito:tenant-slug";

export type TenantStatus =
  | "pending"
  | "pending_payment"
  | "pending_approval"
  | "active"
  | "suspended"
  | "trial"
  | "subscription_active"
  | "subscription_expired";

export const TENANT_STATUS_LABEL: Record<TenantStatus, string> = {
  pending: "Pendiente de aprobación",
  pending_payment: "Pendiente de pago",
  pending_approval: "Comprobante enviado — en revisión",
  active: "Activo",
  suspended: "Suspendido",
  trial: "Período de prueba",
  subscription_active: "Suscripción activa",
  subscription_expired: "Suscripción vencida",
};

export const TENANT_OPERATIVE: TenantStatus[] = ["active", "trial", "subscription_active"];

export type TenantInfo = {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
  created_at?: string;
};

async function fetchTenantBySlug(slug: string): Promise<TenantInfo | null> {
  const { data } = await supabase
    .from("tenants")
    .select("id, slug, name, status")
    .eq("slug", slug)
    .maybeSingle();
  return (data as TenantInfo | null) ?? null;
}

export const tenantQuery = (slug: string) =>
  queryOptions({
    queryKey: ["tenant", slug],
    queryFn: async (): Promise<TenantInfo | null> => {
      const found = await fetchTenantBySlug(slug);
      if (found) return found;
      if (slug !== DEFAULT_TENANT_SLUG) return fetchTenantBySlug(DEFAULT_TENANT_SLUG);
      return null;
    },
    staleTime: 60_000,
  });

export function slugFromPath(pathname: string): string | null {
  const m = /^\/t\/([a-z0-9-]+)/i.exec(pathname);
  return m ? (m[1] as string).toLowerCase() : null;
}

export function readStoredTenantSlug(): string {
  if (typeof window === "undefined") return DEFAULT_TENANT_SLUG;
  const fromUrl = slugFromPath(window.location.pathname);
  if (fromUrl) return fromUrl;
  try {
    return window.localStorage.getItem(STORAGE_KEY) || DEFAULT_TENANT_SLUG;
  } catch {
    return DEFAULT_TENANT_SLUG;
  }
}

export function storeTenantSlug(slug: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, slug);
  } catch {
    /* ignore */
  }
}

type TenantContextValue = {
  slug: string;
  tenant: TenantInfo | null;
  tenantId: string | null;
  loading: boolean;
  setSlug: (slug: string) => void;
};

const TenantContext = createContext<TenantContextValue>({
  slug: DEFAULT_TENANT_SLUG,
  tenant: null,
  tenantId: null,
  loading: true,
  setSlug: () => {},
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const [slug, setSlugState] = useState(DEFAULT_TENANT_SLUG);

  useEffect(() => {
    const stored = readStoredTenantSlug();
    if (stored !== slug) setSlugState(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, isLoading } = useQuery(tenantQuery(slug));

  return (
    <TenantContext.Provider
      value={{
        slug,
        tenant: data ?? null,
        tenantId: data?.id ?? null,
        loading: isLoading,
        setSlug: (next: string) => {
          storeTenantSlug(next);
          setSlugState(next);
        },
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantContextValue {
  return useContext(TenantContext);
}

/** Id del comercio de la vidriera que está mirando el cliente. */
export function useTenantId(): string | null {
  return useContext(TenantContext).tenantId;
}

/* ---------- Comercio administrado por el usuario logueado ---------- */

export const myTenantQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["my-tenant", userId ?? null],
    queryFn: async (): Promise<TenantInfo | null> => {
      if (!userId) return null;
      const { data: member } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();
      if (!member) return null;
      const { data } = await supabase
        .from("tenants")
        .select("id, slug, name, status, created_at")
        .eq("id", member.tenant_id)
        .maybeSingle();
      return (data as TenantInfo | null) ?? null;
    },
  });

export const superAdminQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["super-admin", userId ?? null],
    queryFn: async (): Promise<boolean> => {
      if (!userId) return false;
      const { data } = await supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      return Boolean(data);
    },
  });
