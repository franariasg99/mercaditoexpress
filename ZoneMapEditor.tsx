import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { ZonePoint } from "@/lib/geo";

const DEFAULT_CENTER: ZonePoint = { lat: -32.8908, lng: -68.8272 };

type OtherZone = { id: string; polygon: ZonePoint[]; name: string; active: boolean };

/**
 * Mapa para dibujar y editar el polígono de una zona de envío.
 * Tocar el mapa agrega un punto; arrastrar un punto lo mueve.
 */
export function ZoneMapEditor({
  points,
  others,
  onChange,
}: {
  points: ZonePoint[];
  others: OtherZone[];
  onChange: (p: ZonePoint[]) => void;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const pointsRef = useRef(points);
  const changeRef = useRef(onChange);
  pointsRef.current = points;
  changeRef.current = onChange;

  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let disposed = false;
    let map: any = null;
    let ro: ResizeObserver | null = null;

    void (async () => {
      try {
        const L = (await import("leaflet")).default;
        const box = boxRef.current;
        if (disposed || !box || mapRef.current) return;
        // Si el nodo quedó marcado por una instancia previa, lo liberamos.
        if ((box as any)._leaflet_id) delete (box as any)._leaflet_id;

        const first = pointsRef.current[0] ?? others.find((o) => o.polygon[0])?.polygon[0];
        const start = first ?? DEFAULT_CENTER;
        map = L.map(box, { attributionControl: false }).setView(
          [start.lat, start.lng],
          first ? 14 : 12,
        );
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
        map.on("click", (e: any) => {
          changeRef.current([...pointsRef.current, { lat: e.latlng.lat, lng: e.latlng.lng }]);
        });

        leafletRef.current = L;
        mapRef.current = map;
        layerRef.current = L.layerGroup().addTo(map);
        map.invalidateSize();
        setTimeout(() => map?.invalidateSize(), 150);
        setTimeout(() => map?.invalidateSize(), 600);
        if (typeof ResizeObserver !== "undefined") {
          ro = new ResizeObserver(() => map?.invalidateSize());
          ro.observe(box);
        }
        draw();

        // Sin zonas cargadas: centramos en la ubicación real del comercio.
        if (!first && typeof navigator !== "undefined" && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (disposed || pointsRef.current.length > 0) return;
              map?.setView([pos.coords.latitude, pos.coords.longitude], 14);
            },
            () => {},
            { timeout: 8000 },
          );
        }
      } catch (err) {
        console.error("[ZoneMapEditor] no se pudo iniciar el mapa", err);
        if (!disposed) setFailed(true);
      }
    })();

    return () => {
      disposed = true;
      ro?.disconnect();
      try {
        map?.remove();
      } catch {
        /* ignore */
      }
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function draw() {
    const L = leafletRef.current;
    const group = layerRef.current;
    if (!L || !group) return;
    group.clearLayers();

    for (const o of others) {
      if (o.polygon.length < 3) continue;
      L.polygon(
        o.polygon.map((p) => [p.lat, p.lng]),
        { color: "#64748b", weight: 1, dashArray: "4", fillOpacity: o.active ? 0.08 : 0.03 },
      ).addTo(group);
    }

    const pts = pointsRef.current;
    if (pts.length >= 2) {
      const coords = pts.map((p) => [p.lat, p.lng]);
      if (pts.length >= 3) {
        L.polygon(coords, { color: "#2563eb", weight: 2, fillOpacity: 0.2 }).addTo(group);
      } else {
        L.polyline(coords, { color: "#2563eb", weight: 2 }).addTo(group);
      }
    }

    pts.forEach((p, i) => {
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:14px;height:14px;border-radius:9999px;background:#2563eb;border:2px solid #fff;box-shadow:0 0 0 1px #2563eb"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      const m = L.marker([p.lat, p.lng], { draggable: true, icon }).addTo(group);
      m.on("drag", (e: any) => {
        const ll = e.target.getLatLng();
        const next = [...pointsRef.current];
        next[i] = { lat: ll.lat, lng: ll.lng };
        pointsRef.current = next;
      });
      m.on("dragend", () => changeRef.current([...pointsRef.current]));
      m.on("contextmenu", () =>
        changeRef.current(pointsRef.current.filter((_, idx) => idx !== i)),
      );
    });
  }

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, others]);

  return (
    <div className="relative">
      <div
        ref={boxRef}
        className="z-0 h-72 w-full overflow-hidden rounded-xl border border-border bg-muted"
        aria-label="Mapa para dibujar la zona de envío"
      />
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-muted p-4 text-center text-xs text-muted-foreground">
          No se pudo cargar el mapa. Revisá tu conexión y volvé a abrir esta pestaña.
        </div>
      )}
    </div>
  );
}
