
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin','user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CATEGORIES
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '🛒',
  sort_order int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "categories admin write" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- PRODUCTS
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  unit text NOT NULL DEFAULT 'un.',
  emoji text NOT NULL DEFAULT '🛍️',
  image_url text,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  sale_price numeric(10,2) CHECK (sale_price >= 0),
  stock int NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products public read" ON public.products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "products admin write" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ORDERS
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pendiente',
  total numeric(10,2) NOT NULL DEFAULT 0,
  address text,
  phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own orders select" ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own orders insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin orders update" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  name text NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  quantity int NOT NULL CHECK (quantity > 0)
);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own order items select" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "own order items insert" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

-- SEED CATEGORIES
INSERT INTO public.categories (slug, name, emoji, sort_order) VALUES
 ('promociones','Promociones','🏷️',1),
 ('verduleria','Verdulería','🥬',2),
 ('carniceria','Carnicería','🥩',3),
 ('snacks','Snacks','🍿',4),
 ('bebidas-con-alcohol','Bebidas con alcohol','🍺',5),
 ('bebidas-sin-alcohol','Bebidas sin alcohol','🥤',6),
 ('lacteos-y-quesos','Lácteos y quesos','🧀',7),
 ('congelados','Congelados','🧊',8),
 ('fiambres-y-embutidos','Fiambres y embutidos','🥓',9),
 ('almacen','Almacén','🥫',10),
 ('panaderia-y-galletitas','Panadería y galletitas','🥖',11),
 ('chocolates-y-golosinas','Chocolates y golosinas','🍫',12),
 ('higiene','Higiene','🧴',13),
 ('limpieza','Limpieza','🧹',14);

-- SEED PRODUCTS
INSERT INTO public.products (category_id, name, description, unit, emoji, price, sale_price, stock)
SELECT c.id, p.name, p.description, p.unit, p.emoji, p.price, p.sale_price, p.stock
FROM (VALUES
 ('verduleria','Tomate perita','Fresco, por kilo','kg','🍅',1800,NULL,40),
 ('verduleria','Papa negra','Bolsa de 2 kg','2 kg','🥔',2200,1890,35),
 ('verduleria','Banana Ecuador','Por kilo','kg','🍌',2400,NULL,50),
 ('verduleria','Lechuga mantecosa','Unidad','un.','🥬',1200,NULL,25),
 ('carniceria','Asado de tira','Por kilo','kg','🥩',11500,9990,20),
 ('carniceria','Milanesas de ternera','Por kilo','kg','🍖',12800,NULL,18),
 ('carniceria','Pollo entero','Por kilo','kg','🍗',5200,NULL,22),
 ('carniceria','Carne picada especial','Por kilo','kg','🥩',9800,NULL,15),
 ('snacks','Papas fritas clásicas','Paquete 130 g','130 g','🍟',2900,2490,60),
 ('snacks','Palitos salados','Paquete 100 g','100 g','🥨',1500,NULL,80),
 ('snacks','Maní salado','Paquete 200 g','200 g','🥜',2100,NULL,45),
 ('bebidas-con-alcohol','Cerveza rubia lata','473 ml','473 ml','🍺',1900,1590,120),
 ('bebidas-con-alcohol','Vino Malbec','Botella 750 ml','750 ml','🍷',6500,NULL,40),
 ('bebidas-con-alcohol','Fernet','Botella 750 ml','750 ml','🥃',14500,NULL,18),
 ('bebidas-sin-alcohol','Gaseosa cola','1.5 L','1.5 L','🥤',3200,2790,70),
 ('bebidas-sin-alcohol','Agua mineral sin gas','2 L','2 L','💧',1600,NULL,90),
 ('bebidas-sin-alcohol','Jugo de naranja','1 L','1 L','🧃',2400,NULL,50),
 ('lacteos-y-quesos','Leche entera','Sachet 1 L','1 L','🥛',1700,NULL,80),
 ('lacteos-y-quesos','Queso cremoso','Por kilo','kg','🧀',9200,8490,20),
 ('lacteos-y-quesos','Yogur bebible','1 L','1 L','🥛',3100,NULL,35),
 ('lacteos-y-quesos','Manteca','200 g','200 g','🧈',2800,NULL,30),
 ('congelados','Hamburguesas congeladas','Caja x4','x4','🍔',5400,4790,25),
 ('congelados','Papas bastón congeladas','1 kg','1 kg','🍟',4200,NULL,30),
 ('congelados','Helado crema','1 L','1 L','🍨',7800,NULL,15),
 ('fiambres-y-embutidos','Jamón cocido','Por kilo','kg','🍖',12500,NULL,12),
 ('fiambres-y-embutidos','Salame','Por kilo','kg','🥓',14900,13500,10),
 ('fiambres-y-embutidos','Chorizo fresco','Por kilo','kg','🌭',7900,NULL,20),
 ('almacen','Arroz largo fino','1 kg','1 kg','🍚',2300,NULL,60),
 ('almacen','Fideos guiseros','500 g','500 g','🍝',1800,1490,70),
 ('almacen','Aceite de girasol','900 ml','900 ml','🫒',4200,NULL,40),
 ('almacen','Azúcar','1 kg','1 kg','🍬',2100,NULL,55),
 ('almacen','Puré de tomate','520 g','520 g','🥫',1400,NULL,90),
 ('panaderia-y-galletitas','Pan francés','Por kilo','kg','🥖',3200,NULL,25),
 ('panaderia-y-galletitas','Galletitas dulces','Paquete 300 g','300 g','🍪',2600,2190,50),
 ('panaderia-y-galletitas','Facturas surtidas','Docena','doc.','🥐',7500,NULL,12),
 ('chocolates-y-golosinas','Chocolate con leche','100 g','100 g','🍫',3400,2990,45),
 ('chocolates-y-golosinas','Alfajor triple','Unidad','un.','🍪',1500,NULL,100),
 ('chocolates-y-golosinas','Caramelos surtidos','Bolsa 200 g','200 g','🍬',2200,NULL,60),
 ('higiene','Shampoo','400 ml','400 ml','🧴',5600,4990,30),
 ('higiene','Jabón de tocador','Pack x3','x3','🧼',2400,NULL,45),
 ('higiene','Papel higiénico','Pack x4','x4','🧻',4800,NULL,50),
 ('higiene','Pasta dental','90 g','90 g','🪥',2900,NULL,40),
 ('limpieza','Lavandina','1 L','1 L','🧴',1900,NULL,60),
 ('limpieza','Detergente','750 ml','750 ml','🫧',3600,3190,50),
 ('limpieza','Jabón en polvo','800 g','800 g','🧺',5900,NULL,30),
 ('limpieza','Trapo de piso','Unidad','un.','🧹',2100,NULL,35)
) AS p(cat,name,description,unit,emoji,price,sale_price,stock)
JOIN public.categories c ON c.slug = p.cat;
