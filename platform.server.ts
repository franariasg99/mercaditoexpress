import type { SupabaseClient } from "@supabase/supabase-js";

export const TENANT_STATUSES = [
  "pending",
  "pending_payment",
  "pending_approval",
  "active",
  "suspended",
  "trial",
  "subscription_active",
  "subscription_expired",
] as const;
export type TenantStatusValue = (typeof TENANT_STATUSES)[number];

export type TenantRow = {
  id: string;
  slug: string;
  name: string;
  status: TenantStatusValue;
  contact_email: string | null;
  contact_phone: string | null;
  owner_user_id: string | null;
  owner_email: string | null;
  created_at: string;
  activated_at: string | null;
  suspended_at: string | null;
  last_sign_in_at: string | null;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function isSuperAdmin(userId: string): Promise<boolean> {
  const db = await admin();
  const { data } = await db
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

async function attachOwnerEmails(
  db: SupabaseClient,
  rows: Record<string, unknown>[],
): Promise<TenantRow[]> {
  const emails = new Map<string, string>();
  const lastSignIn = new Map<string, string>();

  // Usuarios vinculados a cada comercio (dueño + miembros)
  const tenantIds = rows.map((r) => String(r["id"]));
  const membersByTenant = new Map<string, string[]>();
  if (tenantIds.length) {
    const { data: members } = await db
      .from("tenant_members")
      .select("tenant_id, user_id")
      .in("tenant_id", tenantIds);
    for (const m of (members ?? []) as { tenant_id: string; user_id: string }[]) {
      const list = membersByTenant.get(m.tenant_id) ?? [];
      list.push(m.user_id);
      membersByTenant.set(m.tenant_id, list);
    }
  }

  const ids = [
    ...new Set([
      ...(rows.map((r) => r["owner_user_id"]).filter(Boolean) as string[]),
      ...[...membersByTenant.values()].flat(),
    ]),
  ];
  for (const id of ids) {
    const { data } = await db.auth.admin.getUserById(id);
    if (data?.user?.email) emails.set(id, data.user.email);
    const seen = (data?.user as { last_sign_in_at?: string | null } | undefined)?.last_sign_in_at;
    if (seen) lastSignIn.set(id, seen);
  }

  const lastFor = (tenantId: string, ownerId: string | null): string | null => {
    const candidates = [...(membersByTenant.get(tenantId) ?? []), ...(ownerId ? [ownerId] : [])]
      .map((uid) => lastSignIn.get(uid))
      .filter(Boolean) as string[];
    if (!candidates.length) return null;
    return candidates.sort().at(-1) ?? null;
  };

  return rows.map((r) => ({
    id: String(r["id"]),
    slug: String(r["slug"]),
    name: String(r["name"]),
    status: r["status"] as TenantStatusValue,
    contact_email: (r["contact_email"] as string | null) ?? null,
    contact_phone: (r["contact_phone"] as string | null) ?? null,
    owner_user_id: (r["owner_user_id"] as string | null) ?? null,
    owner_email:
      (r["owner_user_id"] ? emails.get(String(r["owner_user_id"])) : null) ??
      ((r["contact_email"] as string | null) ?? null),
    created_at: String(r["created_at"]),
    activated_at: (r["activated_at"] as string | null) ?? null,
    suspended_at: (r["suspended_at"] as string | null) ?? null,
    last_sign_in_at: lastFor(String(r["id"]), (r["owner_user_id"] as string | null) ?? null),
  }));
}

const SELECT =
  "id, slug, name, status, contact_email, contact_phone, owner_user_id, created_at, activated_at, suspended_at";

export async function listAllTenants(userId: string): Promise<TenantRow[]> {
  if (!(await isSuperAdmin(userId))) throw new Error("No autorizado");
  const db = await admin();
  const { data, error } = await db
    .from("tenants")
    .select(SELECT)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return attachOwnerEmails(
    db as unknown as SupabaseClient,
    (data ?? []) as unknown as Record<string, unknown>[],
  );
}

export async function updateTenantStatus(
  userId: string,
  tenantId: string,
  status: TenantStatusValue,
): Promise<{ ok: true }> {
  if (!(await isSuperAdmin(userId))) throw new Error("No autorizado");
  const db = await admin();
  const patch: {
    status: TenantStatusValue;
    activated_at?: string;
    suspended_at?: string | null;
  } = { status };
  if (["active", "trial", "subscription_active"].includes(status)) {
    patch.activated_at = new Date().toISOString();
    patch.suspended_at = null;
  }
  if (status === "suspended") patch.suspended_at = new Date().toISOString();
  const { error } = await db.from("tenants").update(patch).eq("id", tenantId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

/** Elimina un comercio y todos sus datos. Para volver debe hacer el alta de nuevo. */
export async function deleteTenantCompletely(
  userId: string,
  tenantId: string,
): Promise<{ ok: true }> {
  if (!(await isSuperAdmin(userId))) throw new Error("No autorizado");
  const db = await admin();

  const tables = [
    "order_items",
    "orders",
    "delivery_slots",
    "delivery_dates",
    "products",
    "categories",
    "app_settings",
    "tenant_members",
  ] as const;

  for (const table of tables) {
    const { error } = await db.from(table).delete().eq("tenant_id", tenantId);
    if (error) throw new Error(`${table}: ${error.message}`);
  }

  const { error } = await db.from("tenants").delete().eq("id", tenantId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export type RegisterTenantInput = {
  name: string;
  slug: string;
  contact_email: string;
  contact_phone: string | null;
};

export async function registerTenant(
  userId: string,
  userEmail: string | null,
  input: RegisterTenantInput,
): Promise<{ id: string; slug: string }> {
  const db = await admin();

  const { data: existingMember } = await db
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (existingMember) throw new Error("Tu cuenta ya está asociada a un comercio");

  const { data: taken } = await db
    .from("tenants")
    .select("id")
    .eq("slug", input.slug)
    .maybeSingle();
  if (taken) throw new Error("Ese identificador de tienda ya está en uso");

  const { data, error } = await db
    .from("tenants")
    .insert({
      name: input.name,
      slug: input.slug,
      contact_email: input.contact_email || userEmail,
      contact_phone: input.contact_phone,
      owner_user_id: userId,
      status: "pending_payment",
    })
    .select("id, slug")
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo registrar el comercio");

  await db.from("tenant_members").insert({
    tenant_id: data.id,
    user_id: userId,
    role: "BUSINESS_ADMIN",
  });

  return { id: data.id, slug: data.slug };
}

export type MyTenant = {
  id: string;
  slug: string;
  name: string;
  status: TenantStatusValue;
  created_at: string;
};

export async function myTenant(userId: string): Promise<MyTenant | null> {
  const db = await admin();
  const { data: member } = await db
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", userId)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!member) return null;
  const { data } = await db
    .from("tenants")
    .select("id, slug, name, status, created_at")
    .eq("id", member.tenant_id)
    .maybeSingle();
  return (data as MyTenant | null) ?? null;
}

/* ---------- Configuración comercial de la plataforma (Super Admin) ---------- */

export type PlatformSettingsRow = {
  monthly_subscription_price: number;
  whatsapp_contact_number: string;
  payment_alias: string;
};

export async function savePlatformSettings(
  userId: string,
  input: PlatformSettingsRow,
): Promise<{ ok: true }> {
  if (!(await isSuperAdmin(userId))) throw new Error("No autorizado");
  const db = await admin();
  const { error } = await db
    .from("platform_settings")
    .upsert({ id: 1, ...input }, { onConflict: "id" });
  if (error) throw new Error(error.message);
  return { ok: true };
}

/** El dueño del comercio avisa que envió el comprobante: pasa a revisión. */
export async function markPaymentSent(userId: string): Promise<{ ok: true }> {
  const db = await admin();
  const { data: member } = await db
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", userId)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!member) throw new Error("No tenés un comercio registrado");
  const { error } = await db
    .from("tenants")
    .update({ status: "pending_approval" })
    .eq("id", member.tenant_id)
    .in("status", ["pending", "pending_payment"]);
  if (error) throw new Error(error.message);
  return { ok: true };
}
