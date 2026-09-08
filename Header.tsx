import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import logo from "@/assets/mercadito-logo.png";
import { DEFAULT_SETTINGS, settingsQuery } from "@/lib/settings";
import { useTenantId } from "@/lib/tenant";

export function Header({ subtitle }: { subtitle?: string | undefined }) {
  const tenantId = useTenantId();
  const settings = useQuery(settingsQuery(tenantId)).data ?? DEFAULT_SETTINGS;
  return (
    <header className="sticky top-0 z-30 bg-brand px-4 pb-3 pt-4 text-brand-foreground shadow-sm">
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <span
            className={`grid h-10 shrink-0 place-items-center overflow-hidden bg-brand-foreground ${
              settings.store_logo_shape === "rect" ? "w-[71px] rounded-lg" : "w-10"
            } ${
              settings.store_logo_shape === "circle"
                ? "rounded-full"
                : settings.store_logo_shape === "square"
                  ? "rounded-xl"
                  : ""
            }`}
          >
            <img
              src={settings.store_logo_url ?? logo}
              alt={settings.store_name}
              width={40}
              height={40}
              className="size-full object-cover"
            />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-extrabold leading-none">
              {settings.store_name}
            </span>
            <span className="block truncate text-xs opacity-80">
              {subtitle ?? settings.store_tagline}
            </span>
          </span>
        </Link>
      </div>
    </header>
  );
}
