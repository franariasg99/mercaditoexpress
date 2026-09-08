CREATE TABLE public.shipping_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Zona',
  shipping_cost numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  polygon jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.shipping_zones TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipping_zones TO authenticated;
GRANT ALL ON public.shipping_zones TO service_role;

ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shipping zones public read" ON public.shipping_zones
  FOR SELECT TO anon, authenticated
  USING (tenant_is_public(tenant_id));

CREATE POLICY "shipping zones tenant write" ON public.shipping_zones
  FOR ALL TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_admin(auth.uid(), tenant_id));

CREATE TRIGGER shipping_zones_updated_at BEFORE UPDATE ON public.shipping_zones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX shipping_zones_tenant_idx ON public.shipping_zones(tenant_id);

ALTER TABLE public.orders
  ADD COLUMN shipping_zone_id uuid REFERENCES public.shipping_zones(id) ON DELETE SET NULL,
  ADD COLUMN shipping_zone_name text;