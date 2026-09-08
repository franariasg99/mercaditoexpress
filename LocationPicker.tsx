import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export type LatLng = { lat: number; lng: number };

/** Centro por defecto: Mendoza, Argentina. */
const DEFAULT_CENTER: LatLng = { lat: -32.8908, lng: -68.8272 };

export function googleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/**
 * Mapa interactivo para que el cliente marque y confirme su ubicación exacta.
 * La dirección escrita no alcanza: hasta que no confirma acá, la ubicación no es válida.
 */
export function LocationPicker({
  value,
  confirmed,
  onPick,
  onConfirm,
}: {
  value: LatLng | null;
  confirmed: boolean;
  onPick: (c: LatLng) => void;
  onConfirm: () => void;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);
  const markerRef = useRef<unknown>(null);
  const pickRef = useRef(onPick);
  const [ready, setReady] = useState(false);
  pickRef.current = onPick;

  useEffect(() => {
    let disposed = false;
    let map: { remove: () => void } | null = null;

    void (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (disposed || !boxRef.current || mapRef.current) return;

      const start = value ?? DEFAULT_CENTER;
      map = L.map(boxRef.current, { attributionControl: false }).setView(
        [start.lat, start.lng],
        value ? 17 : 13,
      );
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map as never);

      const icon = L.divIcon({
        className: "",
        html: '<div style="font-size:28px;line-height:28px;transform:translate(-50%,-100%)">📍</div>',
        iconSize: [28, 28],
      });
      const marker = L.marker([start.lat, start.lng], { draggable: true, icon }).addTo(map as never);
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        pickRef.current({ lat: p.lat, lng: p.lng });
      });
      (map as unknown as L.Map).on("click", (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        pickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

      mapRef.current = map;
      markerRef.current = marker;
      setReady(true);
      setTimeout(() => (map as unknown as L.Map).invalidateSize(), 150);
    })();

    return () => {
      disposed = true;
      map?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function locateMe() {
    if (!navigator.geolocation) {
      toast.error("Tu dispositivo no permite compartir la ubicación");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onPick(c);
        const map = mapRef.current as { setView: (a: [number, number], z: number) => void } | null;
        const marker = markerRef.current as { setLatLng: (a: [number, number]) => void } | null;
        map?.setView([c.lat, c.lng], 17);
        marker?.setLatLng([c.lat, c.lng]);
      },
      () => toast.error("No pudimos obtener tu ubicación"),
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Tocá el mapa o arrastrá el pin hasta la puerta de entrega y confirmá tu ubicación.
      </p>
      <div
        ref={boxRef}
        className="h-56 w-full overflow-hidden rounded-xl border border-border bg-muted"
        aria-label="Mapa para elegir la ubicación de entrega"
      />
      {!ready && <p className="text-xs text-muted-foreground">Cargando mapa…</p>}
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" onClick={locateMe}>
          <MapPin className="mr-1 size-4" /> Mi ubicación
        </Button>
        <Button type="button" variant={confirmed ? "outline" : "default"} onClick={onConfirm}>
          {confirmed ? "Ubicación confirmada ✓" : "Confirmar ubicación"}
        </Button>
      </div>
      {value && (
        <p className="text-xs text-muted-foreground">
          {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          {confirmed ? "" : " · falta confirmar"}
        </p>
      )}
    </div>
  );
}