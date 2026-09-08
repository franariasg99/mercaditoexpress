CREATE OR REPLACE FUNCTION public.tenant_is_public(_tenant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = _tenant_id
      AND t.status IN ('active', 'trial', 'subscription_active')
  ) OR public.is_super_admin(auth.uid())
$function$;