import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const statusSchema = z.enum([
  "pending",
  "pending_payment",
  "pending_approval",
  "active",
  "suspended",
  "trial",
  "subscription_active",
  "subscription_expired",
]);

export const listTenants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listAllTenants } = await import("./platform.server");
    return listAllTenants(context.userId);
  });

export const setTenantStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ tenant_id: z.string().uuid(), status: statusSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { updateTenantStatus } = await import("./platform.server");
    return updateTenantStatus(context.userId, data.tenant_id, data.status);
  });

export const createTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().trim().min(3).max(60),
        slug: z
          .string()
          .trim()
          .min(3)
          .max(40)
          .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
        contact_email: z.string().trim().email().max(255),
        contact_phone: z.string().trim().max(30).nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { registerTenant } = await import("./platform.server");
    const email = (context.claims["email"] as string | undefined) ?? null;
    return registerTenant(context.userId, email, data);
  });

export const deleteTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ tenant_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { deleteTenantCompletely } = await import("./platform.server");
    return deleteTenantCompletely(context.userId, data.tenant_id);
  });

export const getMyTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { myTenant } = await import("./platform.server");
    return myTenant(context.userId);
  });

export const savePlatformConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        monthly_subscription_price: z.number().min(0).max(100000000),
        whatsapp_contact_number: z.string().trim().min(6).max(25),
        payment_alias: z.string().trim().min(3).max(60),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { savePlatformSettings } = await import("./platform.server");
    return savePlatformSettings(context.userId, data);
  });

export const notifyPaymentSent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { markPaymentSent } = await import("./platform.server");
    return markPaymentSent(context.userId);
  });
