import { useQuery } from "@tanstack/react-query";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { DEFAULT_SETTINGS, settingsQuery } from "@/lib/settings";
import { useTenantId } from "@/lib/tenant";

function waLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

function prettyPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  return d ? `+${d}` : "";
}

/** Pie de página con los datos de contacto del comercio. */
export function StoreFooter() {
  const tenantId = useTenantId();
  const settings = useQuery(settingsQuery(tenantId)).data ?? DEFAULT_SETTINGS;

  const txt = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const address = txt(settings.store_address) || txt(settings.pickup_address);
  const email = txt(settings.store_email);
  const hours = txt(settings.store_hours);
  const phone = txt(settings.store_whatsapp);

  if (!address && !email && !hours && !phone) return null;

  return (
    <footer className="mt-8 border-t border-border bg-surface">
      <div className="mx-auto max-w-lg px-4 py-6">
        <h2 className="font-display text-base font-bold">Contacto</h2>
        <ul className="mt-3 space-y-3 text-sm">
          {address && (
            <li>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                target="_blank"
                rel="noreferrer"
                className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2 text-foreground"
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                <span className="min-w-0 whitespace-pre-line break-words underline-offset-2 hover:underline">
                  {address}
                </span>
              </a>
            </li>
          )}
          {phone && (
            <li>
              <a
                href={waLink(phone)}
                target="_blank"
                rel="noreferrer"
                className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2 text-foreground"
              >
                <Phone className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                <span className="min-w-0 break-words underline-offset-2 hover:underline">
                  {prettyPhone(phone)}
                </span>
              </a>
            </li>
          )}
          {email && (
            <li>
              <a
                href={`mailto:${email}`}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2 text-foreground"
              >
                <Mail className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                <span className="min-w-0 break-all underline-offset-2 hover:underline">{email}</span>
              </a>
            </li>
          )}
          {hours && (
            <li className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2 text-muted-foreground">
              <Clock className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
              <span className="min-w-0 whitespace-pre-line break-words">{hours}</span>
            </li>
          )}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {settings.store_name}
        </p>
      </div>
    </footer>
  );
}
