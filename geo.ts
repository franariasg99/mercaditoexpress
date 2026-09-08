/** Utilidades geográficas puras (sin dependencias de cliente ni servidor). */
export type ZonePoint = { lat: number; lng: number };

export type ShippingZone = {
  id: string;
  name: string;
  shipping_cost: number;
  is_active: boolean;
  sort_order: number;
  polygon: ZonePoint[];
};

function parsePolygon(raw: unknown): ZonePoint[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => {
      const o = p as Record<string, unknown>;
      const lat = Number(o?.["lat"]);
      const lng = Number(o?.["lng"]);
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    })
    .filter((p): p is ZonePoint => p !== null);
}

export function toZone(row: Record<string, unknown>): ShippingZone {
  return {
    id: String(row["id"]),
    name: String(row["name"] ?? "Zona"),
    shipping_cost: Number(row["shipping_cost"] ?? 0),
    is_active: Boolean(row["is_active"]),
    sort_order: Number(row["sort_order"] ?? 0),
    polygon: parsePolygon(row["polygon"]),
  };
}


/**
 * Ray casting: determina si un punto geográfico cae dentro del polígono.
 * La validación es puramente por coordenadas, no por nombres de calles ni barrios.
 */
export function pointInPolygon(point: ZonePoint, polygon: ZonePoint[]): boolean {
  if (polygon.length < 3) return false;
  const { lat: y, lng: x } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    const intersects =
      a.lat > y !== b.lat > y &&
      x < ((b.lng - a.lng) * (y - a.lat)) / (b.lat - a.lat || Number.EPSILON) + a.lng;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** Primera zona activa que contiene el punto, o null si está fuera de cobertura. */
export function findZoneFor(point: ZonePoint | null, zones: ShippingZone[]): ShippingZone | null {
  if (!point) return null;
  for (const z of zones) {
    if (!z.is_active) continue;
    if (pointInPolygon(point, z.polygon)) return z;
  }
  return null;
}
