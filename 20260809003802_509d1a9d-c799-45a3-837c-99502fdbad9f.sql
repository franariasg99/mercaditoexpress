CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1001;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_number integer NOT NULL DEFAULT nextval('public.order_number_seq'),
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS delivery_method text NOT NULL DEFAULT 'envio',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS payment_reference text;

ALTER SEQUENCE public.order_number_seq OWNED BY public.orders.order_number;

ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'recibido';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_order_number_key') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_delivery_method_check') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_delivery_method_check CHECK (delivery_method IN ('envio','retiro'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_status_check') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check CHECK (payment_status IN ('pendiente','aprobado','rechazado'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_status_check') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status IN ('recibido','pago_confirmado','preparando','enviado','entregado','cancelado'));
  END IF;
END $$;

UPDATE public.orders SET status = 'recibido' WHERE status NOT IN ('recibido','pago_confirmado','preparando','enviado','entregado','cancelado');

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS image_url text;