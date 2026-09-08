CREATE OR REPLACE FUNCTION public.consume_stock(_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  it jsonb;
  updated integer;
BEGIN
  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    UPDATE public.products
      SET stock = stock - (it->>'qty')::int,
          sold_count = sold_count + (it->>'qty')::int
      WHERE id = (it->>'id')::uuid
        AND is_active = true
        AND stock >= (it->>'qty')::int;
    GET DIAGNOSTICS updated = ROW_COUNT;
    IF updated = 0 THEN
      RAISE EXCEPTION 'STOCK_INSUFICIENTE:%', it->>'id';
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_stock(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_stock(jsonb) TO service_role;