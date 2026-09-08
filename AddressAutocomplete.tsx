import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPlaceDetails, searchAddresses } from "@/lib/places.functions";

export type SelectedAddress = { address: string; lat: number; lng: number };

type Suggestion = { placeId: string; primary: string; secondary: string };

/**
 * Buscador de direcciones con sugerencias reales de Google Places.
 * El cliente sólo escribe y toca una sugerencia: no necesita usar el mapa.
 */
export function AddressAutocomplete({
  selected,
  onSelect,
  onClear,
}: {
  selected: SelectedAddress | null;
  onSelect: (a: SelectedAddress) => void;
  onClear: () => void;
}) {
  const [text, setText] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [picking, setPicking] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const q = text.trim();
    if (selected || q.length < 3) {
      setItems([]);
      return;
    }
    const id = ++seq.current;
    setLoading(true);
    const t = setTimeout(() => {
      void searchAddresses({ data: { query: q } })
        .then((res) => {
          if (seq.current === id) setItems(res);
        })
        .catch(() => {
          if (seq.current === id) setItems([]);
        })
        .finally(() => {
          if (seq.current === id) setLoading(false);
        });
    }, 350);
    return () => clearTimeout(t);
  }, [text, selected]);

  async function pick(s: Suggestion): Promise<void> {
    setPicking(true);
    try {
      const detail = await getPlaceDetails({ data: { place_id: s.placeId } });
      onSelect(detail);
      setItems([]);
      setText("");
    } catch {
      toast.error("No pudimos ubicar esa dirección, probá con otra");
    } finally {
      setPicking(false);
    }
  }

  if (selected) {
    return (
      <div className="space-y-2">
        <Label>Dirección de entrega</Label>
        <div className="flex items-start gap-2 rounded-xl border border-brand bg-accent/40 p-3">
          <MapPin className="mt-0.5 size-4 shrink-0 text-brand" />
          <p className="min-w-0 flex-1 text-sm font-medium">{selected.address}</p>
          <button
            type="button"
            onClick={onClear}
            aria-label="Cambiar dirección"
            className="text-muted-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Revisá que la dirección sea correcta. Si no lo es, tocá la ✕ y buscá otra.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="address-search">Dirección de entrega</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="address-search"
          className="pl-9"
          value={text}
          maxLength={120}
          autoComplete="off"
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribí tu calle y número"
        />
        {(loading || picking) && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Empezá a escribir y tocá tu dirección en la lista. No hace falta usar el mapa.
      </p>
      {items.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
          {items.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                disabled={picking}
                onClick={() => void pick(s)}
                className="flex w-full items-start gap-2 p-3 text-left text-sm disabled:opacity-50"
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand" />
                <span className="min-w-0">
                  <span className="block font-medium">{s.primary}</span>
                  <span className="block text-xs text-muted-foreground">{s.secondary}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {!loading && text.trim().length >= 3 && items.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No encontramos esa dirección. Probá con calle y número, por ejemplo “San Martín 1234”.
        </p>
      )}
    </div>
  );
}