revoke execute on function public.can_use_tenant_folder(text) from anon, public;
grant execute on function public.can_use_tenant_folder(text) to authenticated, service_role;