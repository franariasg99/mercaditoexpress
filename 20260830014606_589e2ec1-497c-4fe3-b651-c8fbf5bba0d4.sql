ALTER TYPE public.tenant_status ADD VALUE IF NOT EXISTS 'pending_payment';
ALTER TYPE public.tenant_status ADD VALUE IF NOT EXISTS 'pending_approval';

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id integer PRIMARY KEY DEFAULT 1,
  monthly_subscription_price numeric NOT NULL DEFAULT 25000,
  whatsapp_contact_number text NOT NULL DEFAULT '5492615585633',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_settings_singleton CHECK (id = 1)
);

GRANT SELECT ON public.platform_settings TO authenticated;
GRANT SELECT ON public.platform_settings TO anon;
GRANT ALL ON public.platform_settings TO service_role;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform settings public read" ON public.platform_settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "platform settings super admin write" ON public.platform_settings
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER platform_settings_updated_at BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.platform_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;