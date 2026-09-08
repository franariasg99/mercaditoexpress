-- 1. Estados de comercio
CREATE TYPE public.tenant_status AS ENUM (
  'pending', 'active', 'suspended', 'trial', 'subscription_active', 'subscription_expired'
);

-- 2. Comercios
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  contact_email text,
  contact_phone text,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.tenant_status NOT NULL DEFAULT 'pending',
  notes text,
  activated_at timestamptz,
  suspended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tenants TO anon;
GRANT SELECT, INSERT, UPDATE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Miembros (administradores) de cada comercio
CREATE TABLE public.tenant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'BUSINESS_ADMIN',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);
GRANT SELECT ON public.tenant_members TO authenticated;
GRANT ALL ON public.tenant_members TO service_role;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

-- 4. Super admins de la plataforma
CREATE TABLE public.platform_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'SUPER_ADMIN',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_admins TO authenticated;
GRANT ALL ON public.platform_admins TO service_role;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- 5. Funciones de autorización
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id IS NOT NULL AND (
    public.is_super_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.tenant_members m
      WHERE m.user_id = _user_id AND m.tenant_id = _tenant_id
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.my_tenant_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.tenant_id FROM public.tenant_members m
  WHERE m.user_id = _user_id
  ORDER BY m.created_at LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.tenant_is_public(_tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = _tenant_id
      AND t.status IN ('active', 'trial', 'subscription_active')
  )
$$;

-- 6. Comercio inicial con todos los datos actuales
INSERT INTO public.tenants (slug, name, contact_email, owner_user_id, status, activated_at)
SELECT 'mercadito-express',
       COALESCE((SELECT store_name FROM public.app_settings WHERE id = 1), 'Mercadito Express'),
       'fran.ariasg99@gmail.com',
       (SELECT id FROM auth.users WHERE lower(email) = 'fran.ariasg99@gmail.com'),
       'active', now();

INSERT INTO public.platform_admins (user_id)
SELECT id FROM auth.users WHERE lower(email) = 'fran.ariasg99@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO public.tenant_members (tenant_id, user_id, role)
SELECT (SELECT id FROM public.tenants WHERE slug = 'mercadito-express'), u.id, 'BUSINESS_ADMIN'
FROM auth.users u
WHERE u.id IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
   OR lower(u.email) = 'fran.ariasg99@gmail.com'
ON CONFLICT DO NOTHING;

-- 7. tenant_id en todas las tablas de datos
ALTER TABLE public.categories ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.products ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.orders ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.order_items ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.delivery_dates ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.delivery_slots ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.app_settings ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

UPDATE public.categories SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'mercadito-express');
UPDATE public.products SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'mercadito-express');
UPDATE public.orders SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'mercadito-express');
UPDATE public.order_items SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'mercadito-express');
UPDATE public.delivery_dates SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'mercadito-express');
UPDATE public.delivery_slots SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'mercadito-express');
UPDATE public.app_settings SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'mercadito-express');

ALTER TABLE public.categories ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.orders ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.order_items ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.delivery_dates ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.delivery_slots ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.app_settings ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX idx_categories_tenant ON public.categories(tenant_id);
CREATE INDEX idx_products_tenant ON public.products(tenant_id);
CREATE INDEX idx_orders_tenant ON public.orders(tenant_id);
CREATE INDEX idx_order_items_tenant ON public.order_items(tenant_id);
CREATE INDEX idx_delivery_dates_tenant ON public.delivery_dates(tenant_id);
CREATE INDEX idx_delivery_slots_tenant ON public.delivery_slots(tenant_id);

-- categorias: slug unico por comercio
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_slug_key;
CREATE UNIQUE INDEX categories_tenant_slug_key ON public.categories(tenant_id, slug);

-- app_settings: una fila por comercio
CREATE SEQUENCE IF NOT EXISTS public.app_settings_id_seq AS integer OWNED BY public.app_settings.id;
SELECT setval('public.app_settings_id_seq', GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.app_settings), 1));
ALTER TABLE public.app_settings ALTER COLUMN id SET DEFAULT nextval('public.app_settings_id_seq');
ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_tenant_key UNIQUE (tenant_id);

-- 8. Configuracion automatica al crear un comercio
CREATE OR REPLACE FUNCTION public.create_tenant_defaults()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.app_settings (tenant_id, store_name)
  VALUES (NEW.id, NEW.name)
  ON CONFLICT (tenant_id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER tenants_defaults AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.create_tenant_defaults();

-- 9. Politicas: comercios
CREATE POLICY "tenants public read active" ON public.tenants
  FOR SELECT TO anon, authenticated
  USING (status IN ('active', 'trial', 'subscription_active'));
CREATE POLICY "tenants member read" ON public.tenants
  FOR SELECT TO authenticated
  USING (public.is_tenant_admin(auth.uid(), id) OR owner_user_id = auth.uid());
CREATE POLICY "tenants super admin all" ON public.tenants
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "tenant members self read" ON public.tenant_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "tenant members super admin write" ON public.tenant_members
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "platform admins self read" ON public.platform_admins
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

-- 10. Politicas por comercio en los datos existentes
DROP POLICY IF EXISTS "categories public read" ON public.categories;
DROP POLICY IF EXISTS "categories admin write" ON public.categories;
CREATE POLICY "categories public read" ON public.categories
  FOR SELECT TO anon, authenticated USING (public.tenant_is_public(tenant_id));
CREATE POLICY "categories tenant write" ON public.categories
  FOR ALL TO authenticated
  USING (public.is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "products public read" ON public.products;
DROP POLICY IF EXISTS "products admin write" ON public.products;
CREATE POLICY "products public read" ON public.products
  FOR SELECT TO anon, authenticated USING (public.tenant_is_public(tenant_id));
CREATE POLICY "products tenant write" ON public.products
  FOR ALL TO authenticated
  USING (public.is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "app settings public read" ON public.app_settings;
DROP POLICY IF EXISTS "app settings admin write" ON public.app_settings;
CREATE POLICY "app settings public read" ON public.app_settings
  FOR SELECT TO anon, authenticated USING (public.tenant_is_public(tenant_id));
CREATE POLICY "app settings tenant write" ON public.app_settings
  FOR ALL TO authenticated
  USING (public.is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "delivery dates public read" ON public.delivery_dates;
DROP POLICY IF EXISTS "delivery dates admin write" ON public.delivery_dates;
CREATE POLICY "delivery dates public read" ON public.delivery_dates
  FOR SELECT TO anon, authenticated USING (public.tenant_is_public(tenant_id));
CREATE POLICY "delivery dates tenant write" ON public.delivery_dates
  FOR ALL TO authenticated
  USING (public.is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "delivery slots public read" ON public.delivery_slots;
DROP POLICY IF EXISTS "delivery slots admin write" ON public.delivery_slots;
CREATE POLICY "delivery slots public read" ON public.delivery_slots
  FOR SELECT TO anon, authenticated USING (public.tenant_is_public(tenant_id));
CREATE POLICY "delivery slots tenant write" ON public.delivery_slots
  FOR ALL TO authenticated
  USING (public.is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "own orders select" ON public.orders;
DROP POLICY IF EXISTS "admin orders update" ON public.orders;
CREATE POLICY "own orders select" ON public.orders
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_tenant_admin(auth.uid(), tenant_id));
CREATE POLICY "tenant orders update" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "own order items select" ON public.order_items;
CREATE POLICY "own order items select" ON public.order_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (o.user_id = auth.uid() OR public.is_tenant_admin(auth.uid(), o.tenant_id))
  ));