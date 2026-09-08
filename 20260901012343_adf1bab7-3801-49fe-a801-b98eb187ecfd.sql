create or replace function public.can_use_tenant_folder(_folder text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'admin')
      or public.is_super_admin(auth.uid())
      or exists (
        select 1 from public.tenant_members tm
        where tm.user_id = auth.uid()
          and tm.tenant_id::text = _folder
      );
$$;

drop policy if exists "product images admin insert" on storage.objects;
drop policy if exists "product images admin select" on storage.objects;
drop policy if exists "product images admin update" on storage.objects;
drop policy if exists "product images admin delete" on storage.objects;

create policy "product images tenant insert" on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and public.can_use_tenant_folder((storage.foldername(name))[1]));

create policy "product images tenant select" on storage.objects for select to authenticated
using (bucket_id = 'product-images' and public.can_use_tenant_folder((storage.foldername(name))[1]));

create policy "product images tenant update" on storage.objects for update to authenticated
using (bucket_id = 'product-images' and public.can_use_tenant_folder((storage.foldername(name))[1]))
with check (bucket_id = 'product-images' and public.can_use_tenant_folder((storage.foldername(name))[1]));

create policy "product images tenant delete" on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and public.can_use_tenant_folder((storage.foldername(name))[1]));