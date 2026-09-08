GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_tenant_id(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_is_public(uuid) TO anon, authenticated;