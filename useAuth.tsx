import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { myTenantQuery, superAdminQuery, TENANT_OPERATIVE } from "@/lib/tenant";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const user: User | null = session?.user ?? null;
  return { session, user, loading };
}

export function useIsAdmin(userId: string | undefined) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setIsAdmin(false);
      setChecking(false);
      return;
    }
    setChecking(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setIsAdmin(Boolean(data));
        setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  return { isAdmin, checking };
}
/* ---------- Multi-comercio ---------- */

export function useAdminTenant() {
  const { user, loading } = useAuth();
  const q = useQuery(myTenantQuery(user?.id));
  const tenant = q.data ?? null;
  return {
    tenant,
    tenantId: tenant?.id ?? null,
    isOperative: Boolean(tenant && TENANT_OPERATIVE.includes(tenant.status)),
    checking: loading || q.isLoading,
  };
}

export function useIsSuperAdmin() {
  const { user, loading } = useAuth();
  const q = useQuery(superAdminQuery(user?.id));
  return { isSuperAdmin: q.data ?? false, checking: loading || q.isLoading };
}
