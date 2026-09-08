ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS delivery_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_shipping_min numeric NOT NULL DEFAULT 0;