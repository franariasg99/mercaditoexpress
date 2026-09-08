import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Muestra el alias de transferencia configurado por el administrador. */
export function AliasBox({ alias }: { alias: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(alias);
      setCopied(true);
      toast.success("Alias copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar el alias");
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-display text-base font-bold">💳 Pago por transferencia</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Transferí el total a este alias y confirmá el pedido. El administrador verifica el pago.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate rounded-xl bg-muted px-3 py-2 font-mono text-sm font-semibold">
          {alias}
        </span>
        <Button type="button" variant="secondary" onClick={copy}>
          {copied ? <Check className="mr-1 size-4" /> : <Copy className="mr-1 size-4" />}
          Copiar alias
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        El pedido queda como <strong>Pago pendiente</strong> hasta que el administrador confirme la
        transferencia.
      </p>
    </div>
  );
}