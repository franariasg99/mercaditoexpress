-- 1. Configuración global de la tienda
CREATE TABLE public.app_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  payment_alias text NOT NULL DEFAULT 'Fran.ariasg99',
  store_open boolean NOT NULL DEFAULT true,
  closed_message text NOT NULL DEFAULT 'En este momento no estamos tomando pedidos. Volvé más tarde.',
  min_order numeric NOT NULL DEFAULT 25000,
  service_fee_pct numeric NOT NULL DEFAULT 3.5,
  first_order_discount_pct numeric NOT NULL DEFAULT 5,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app settings public read" ON public.app_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "app settings admin write" ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER app_settings_updated_at BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.app_settings (id) VALUES (1);

-- 2. Promociones por producto
ALTER TABLE public.products
  ADD COLUMN promo_type text NOT NULL DEFAULT 'none'
    CHECK (promo_type IN ('none','percent','price','nxm','second_unit')),
  ADD COLUMN promo_percent numeric,
  ADD COLUMN promo_buy_qty integer,
  ADD COLUMN promo_pay_qty integer,
  ADD COLUMN sold_count integer NOT NULL DEFAULT 0;

-- 3. Fechas y horarios de entrega
CREATE TABLE public.delivery_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.delivery_dates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_dates TO authenticated;
GRANT ALL ON public.delivery_dates TO service_role;
ALTER TABLE public.delivery_dates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery dates public read" ON public.delivery_dates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "delivery dates admin write" ON public.delivery_dates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER delivery_dates_updated_at BEFORE UPDATE ON public.delivery_dates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.delivery_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date_id uuid NOT NULL REFERENCES public.delivery_dates(id) ON DELETE CASCADE,
  start_time text NOT NULL,
  end_time text NOT NULL,
  max_orders integer,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.delivery_slots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_slots TO authenticated;
GRANT ALL ON public.delivery_slots TO service_role;
ALTER TABLE public.delivery_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery slots public read" ON public.delivery_slots FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "delivery slots admin write" ON public.delivery_slots FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER delivery_slots_updated_at BEFORE UPDATE ON public.delivery_slots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Pedidos: totales detallados, entrega, ubicación e invitados
ALTER TABLE public.orders
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN subtotal_original numeric NOT NULL DEFAULT 0,
  ADD COLUMN discount_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN first_order_discount numeric NOT NULL DEFAULT 0,
  ADD COLUMN subtotal_final numeric NOT NULL DEFAULT 0,
  ADD COLUMN service_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN tip numeric NOT NULL DEFAULT 0,
  ADD COLUMN delivery_slot_id uuid REFERENCES public.delivery_slots(id) ON DELETE SET NULL,
  ADD COLUMN delivery_date date,
  ADD COLUMN delivery_time text,
  ADD COLUMN address_reference text,
  ADD COLUMN latitude numeric,
  ADD COLUMN longitude numeric,
  ADD COLUMN is_guest boolean NOT NULL DEFAULT false,
  ADD COLUMN guest_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE INDEX orders_delivery_slot_idx ON public.orders (delivery_slot_id);

-- 5. Beneficio de primer pedido
ALTER TABLE public.profiles
  ADD COLUMN first_order_discount_used boolean NOT NULL DEFAULT false,
  ADD COLUMN first_order_discount_order_id uuid;