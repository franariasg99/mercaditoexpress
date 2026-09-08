ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS store_name text NOT NULL DEFAULT 'Mercadito Express',
  ADD COLUMN IF NOT EXISTS store_tagline text NOT NULL DEFAULT 'Tu super, rápido y cerca',
  ADD COLUMN IF NOT EXISTS store_logo_url text,
  ADD COLUMN IF NOT EXISTS delivery_mode text NOT NULL DEFAULT 'ambos',
  ADD COLUMN IF NOT EXISTS pickup_address text NOT NULL DEFAULT '';

ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_delivery_mode_check;
ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_delivery_mode_check CHECK (delivery_mode IN ('envio','retiro','ambos'));