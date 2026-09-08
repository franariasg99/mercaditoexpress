CREATE POLICY "tenant orders delete" ON public.orders FOR DELETE TO authenticated USING (is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "tenant order items delete" ON public.order_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND is_tenant_admin(auth.uid(), o.tenant_id)));

GRANT DELETE ON public.orders TO authenticated;
GRANT DELETE ON public.order_items TO authenticated;