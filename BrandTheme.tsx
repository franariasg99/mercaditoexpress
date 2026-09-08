import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { DEFAULT_SETTINGS, settingsQuery } from "@/lib/settings";
import { useTenantId } from "@/lib/tenant";

/** Returns "#ffffff" or a very dark tone depending on the background luminance. */
export function readableOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#ffffff";
  const v = parseInt(m[1]!, 16);
  const ch = [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  const lum = 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
  return lum > 0.5 ? "#141422" : "#ffffff";
}

export function BrandTheme() {
  const tenantId = useTenantId();
  const color = useQuery(settingsQuery(tenantId)).data?.brand_color ?? DEFAULT_SETTINGS.brand_color;

  useEffect(() => {
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) return;
    const root = document.documentElement;
    const fg = readableOn(color);
    root.style.setProperty("--brand", color);
    root.style.setProperty("--brand-foreground", fg);
    root.style.setProperty("--primary", color);
    root.style.setProperty("--primary-foreground", fg);
    root.style.setProperty("--ring", color);
  }, [color]);

  return null;
}
