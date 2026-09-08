ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_id_check;
ALTER TABLE public.app_settings ALTER COLUMN id TYPE integer;
CREATE SEQUENCE IF NOT EXISTS public.app_settings_id_seq OWNED BY public.app_settings.id;
SELECT setval('public.app_settings_id_seq', GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.app_settings), 1));
ALTER TABLE public.app_settings ALTER COLUMN id SET DEFAULT nextval('public.app_settings_id_seq');
GRANT USAGE, SELECT ON SEQUENCE public.app_settings_id_seq TO authenticated, service_role;