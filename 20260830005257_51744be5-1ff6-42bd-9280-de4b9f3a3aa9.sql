ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS brand_color text NOT NULL DEFAULT '#3f3fb0';

ALTER TABLE public.app_settings
  ADD CONSTRAINT app_settings_brand_color_hex CHECK (brand_color ~* '^#[0-9a-f]{6}$');