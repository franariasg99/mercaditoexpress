import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/market/Header";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Ingresar o crear cuenta — Mercadito Express" },
      { name: "description", content: "Entrá a tu cuenta para hacer pedidos y ver tu historial." },
      { property: "og:title", content: "Ingresar — Mercadito Express" },
      { property: "og:description", content: "Acceso de clientes de Mercadito Express." },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
  fullName: z.string().trim().max(80).optional(),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/cuenta", replace: true });
    });
  }, [navigate]);

  async function sendReset(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const parsedEmail = z.string().trim().email().safeParse(email);
    if (!parsedEmail.success) {
      toast.error("Email inválido");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsedEmail.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Te enviamos un email para cambiar tu contraseña");
    setMode("login");
  }


  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password, fullName });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }
    setLoading(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      navigate({ to: "/cuenta", replace: true });
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName },
        },
      });
      setLoading(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      if (data.session) navigate({ to: "/cuenta", replace: true });
      else toast.success("Revisá tu email para confirmar la cuenta");
    }
  }

  async function google(): Promise<void> {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("No se pudo iniciar sesión con Google");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/cuenta", replace: true });
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header subtitle="Tu cuenta" />
      <div className="mx-auto max-w-lg px-4 pt-6">
        <h1 className="mb-1 font-display text-2xl font-extrabold">
          {mode === "login" ? "Ingresar" : mode === "signup" ? "Crear cuenta" : "Recuperar contraseña"}
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {mode === "forgot"
            ? "Ingresá tu email y te enviamos un enlace para crear una contraseña nueva."
            : "Necesitás una cuenta para generar pedidos."}
        </p>

        <form
          onSubmit={mode === "forgot" ? sendReset : submit}
          className="space-y-4 rounded-2xl border border-border bg-surface p-4"
        >
          {mode === "signup" && (
            <div>
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={fullName}
                maxLength={80}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tu nombre"
              />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vos@email.com"
              required
            />
          </div>
          {mode !== "forgot" && (
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {mode === "login" ? "Ingresar" : mode === "signup" ? "Crear cuenta" : "Enviar enlace"}
          </Button>
          {mode !== "forgot" && (
            <Button type="button" variant="outline" className="w-full" onClick={google}>
              Continuar con Google
            </Button>
          )}
        </form>

        {mode === "login" && (
          <button
            type="button"
            className="mt-4 w-full text-sm font-semibold text-muted-foreground"
            onClick={() => setMode("forgot")}
          >
            Olvidé mi contraseña
          </button>
        )}

        <button
          type="button"
          className="mt-3 w-full text-sm font-semibold text-brand"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "No tengo cuenta, quiero registrarme" : "Ya tengo cuenta, ingresar"}
        </button>

      </div>
    </div>
  );
}