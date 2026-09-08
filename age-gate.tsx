import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const ALCOHOL_SLUG = "bebidas-con-alcohol";
const KEY = "me-age-18";

/** Declaración de mayoría de edad, válida durante la sesión del navegador. */
export function useAgeGate() {
  const [confirmed, setConfirmed] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setConfirmed(sessionStorage.getItem(KEY) === "1");
    } catch {
      setConfirmed(false);
    }
  }, []);

  const confirm = useCallback(() => {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setConfirmed(true);
  }, []);

  return { confirmed, confirm };
}

export function AgeGate({ onConfirm }: { onConfirm: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-lg px-4 pt-10">
      <div className="rounded-2xl border border-border bg-surface p-6 text-center">
        <span className="text-4xl" aria-hidden>
          🔞
        </span>
        <h1 className="mt-2 font-display text-xl font-extrabold">Verificación de edad</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta sección contiene bebidas con alcohol. Debes ser mayor de 18 años para ingresar.
        </p>
        <div className="mt-4 space-y-2">
          <Button className="w-full" size="lg" onClick={onConfirm}>
            Soy mayor de 18 años
          </Button>
          <Button
            variant="outline"
            className="w-full"
            size="lg"
            onClick={() => navigate({ to: "/" })}
          >
            Soy menor de 18 años
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Venta exclusiva para mayores de 18 años. Al recibir el pedido puede solicitarse
          documento que acredite la edad.
        </p>
      </div>
    </div>
  );
}