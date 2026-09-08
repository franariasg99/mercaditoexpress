ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS store_address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS store_email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS store_hours text NOT NULL DEFAULT '';