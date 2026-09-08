import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/market/Header";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Cambiar contraseña — Mercadito Express" },
      { name: "description", content: "Definí una nueva contraseña para tu cuenta de Mercadito Express." },
      { property: "og:title", content: "Cambiar contraseña — Mercadito Express" },
      { property: "og:description", content: "Restablecé el acceso a tu cuenta de Mercadito Express." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (password !== confirm) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Contraseña actualizada");
    navigate({ to: "/cuenta", replace: true });
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header subtitle="Tu cuenta" />
      <div className="mx-auto max-w-lg px-4 pt-6">
        <h1 className="mb-1 font-display text-2xl font-extrabold">Nueva contraseña</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {ready
            ? "Elegí una contraseña nueva para ingresar a tu cuenta."
            : "Abrí esta página desde el enlace que te enviamos por email."}
        </p>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-surface p-4">
          <div>
            <Label htmlFor="new-password">Contraseña nueva</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="confirm-password">Repetir contraseña</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !ready}>
            Guardar contraseña
          </Button>
        </form>
      </div>
    </div>
  );
}
