import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const itemSchema = z.object({ product_id: z.string().uuid(), qty: z.number().int().min(1).max(99) });

const placeOrderSchema = z.object({
  tenant_id: z.string().uuid(),
  items: z.array(itemSchema).min(1).max(100),
  customer_name: z.string().trim().min(3).max(80),
  phone: z.string().trim().min(8).max(30),
  delivery_method: z.enum(["envio", "retiro"]),
  address: z.string().trim().max(200).nullable(),
  address_reference: z.string().trim().max(200).nullable(),
  notes: z.string().trim().max(300).nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  delivery_slot_id: z.string().uuid().nullable(),
  payment_method: z.enum(["transferencia", "efectivo"]).default("transferencia"),
  tip: z.number().min(0).max(1000000),
  location_confirmed: z.boolean(),
});

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => placeOrderSchema.parse(input))
  .handler(async ({ data }) => {
    const { createOrder } = await import("./order.server");
    return createOrder(data, getRequestHeader("authorization") ?? null);
  });

export const getOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), token: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { fetchOrder } = await import("./order.server");
    return fetchOrder(data.id, data.token);
  });

export const getSlotUsage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ tenant_id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { fetchSlotUsage } = await import("./order.server");
    return fetchSlotUsage(data.tenant_id);
  });