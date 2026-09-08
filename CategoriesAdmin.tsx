import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { categoriesQuery, productsQuery, type Category } from "@/lib/market";
import { useAdminTenant } from "@/hooks/useAuth";
import { ICON_LIBRARY, slugify } from "@/lib/icon-library";

export function CategoriesAdmin() {
  const qc = useQueryClient();
  const { tenantId } = useAdminTenant();
  const categories = useQuery(categoriesQuery(tenantId)).data ?? [];
  const products = useQuery(productsQuery(tenantId)).data ?? [];
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["categories"] });
    void qc.invalidateQueries({ queryKey: ["products"] });
  };

  async function move(index: number, dir: -1 | 1) {
    const target = categories[index + dir];
    const current = categories[index];
    if (!target || !current) return;
    const a = await supabase
      .from("categories")
      .update({ sort_order: target.sort_order })
      .eq("id", current.id);
    const b = await supabase
      .from("categories")
      .update({ sort_order: current.sort_order })
      .eq("id", target.id);
    if (a.error || b.error) toast.error("No se pudo reordenar");
    else refresh();
  }

  async function remove(c: Category) {
    const count = products.filter((p) => p.category_id === c.id).length;
    const msg =
      count > 0
        ? `¿Eliminar la sección "${c.name}"? Se eliminarán también sus ${count} producto${count === 1 ? "" : "s"}. Esta acción no se puede deshacer.`
        : `¿Eliminar la sección "${c.name}"?`;
    if (!window.confirm(msg)) return;
    if (count > 0) {
      const { error: prodError } = await supabase.from("products").delete().eq("category_id", c.id);
      if (prodError) {
        toast.error("No se pudieron eliminar los productos de la sección");
        return;
      }
    }
    const { error } = await supabase.from("categories").delete().eq("id", c.id);
    if (error) toast.error("No se pudo eliminar la sección");
    else {
      toast.success("Sección eliminada");
      refresh();
    }
  }


  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold">📦 Secciones</h2>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setCreating(true);
          }}
        >
          ➕ Nueva sección
        </Button>
      </div>

      {(creating || editing) && (
        <CategoryForm
          key={editing?.id ?? "new"}
          category={editing}
          nextOrder={(categories.at(-1)?.sort_order ?? 0) + 10}
          onDone={() => {
            setEditing(null);
            setCreating(false);
            refresh();
          }}
          onCancel={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      )}

      <ul className="space-y-2">
        {categories.map((c, i) => (
          <li
            key={c.id}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-border bg-surface p-3"
          >
            <span className="text-2xl" aria-hidden>
              {c.emoji}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{c.name}</p>
              <p className="text-xs text-muted-foreground">
                {products.filter((p) => p.category_id === c.id).length} productos
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                aria-label="Subir"
                disabled={i === 0}
                onClick={() => void move(i, -1)}
              >
                ↑
              </Button>
              <Button
                size="sm"
                variant="outline"
                aria-label="Bajar"
                disabled={i === categories.length - 1}
                onClick={() => void move(i, 1)}
              >
                ↓
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setCreating(false);
                  setEditing(c);
                }}
              >
                Editar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void remove(c)}>
                🗑️
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CategoryForm({
  category,
  nextOrder,
  onDone,
  onCancel,
}: {
  category: Category | null;
  nextOrder: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { tenantId } = useAdminTenant();
  const [name, setName] = useState(category?.name ?? "");
  const [emoji, setEmoji] = useState(category?.emoji ?? "🛒");
  const [saving, setSaving] = useState(false);
  const [iconQuery, setIconQuery] = useState("");
  const groups = ICON_LIBRARY.map((g) => ({
    ...g,
    icons: g.icons.filter(
      (ic) =>
        !iconQuery.trim() ||
        g.group.toLowerCase().includes(iconQuery.trim().toLowerCase()) ||
        ic.includes(iconQuery.trim()),
    ),
  })).filter((g) => g.icons.length > 0);


  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = name.trim();
    if (clean.length < 2) {
      toast.error("El nombre es muy corto");
      return;
    }
    setSaving(true);
    const { error } = category
      ? await supabase.from("categories").update({ name: clean, emoji }).eq("id", category.id)
      : await supabase.from("categories").insert({
          tenant_id: tenantId ?? "",
          name: clean,
          emoji,
          slug: `${slugify(clean)}-${Math.random().toString(36).slice(2, 6)}`,
          sort_order: nextOrder,
        });
    setSaving(false);
    if (error) toast.error("No se pudo guardar la sección");
    else {
      toast.success(category ? "Sección actualizada" : "Sección creada");
      onDone();
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <div>
        <Label htmlFor="cat-name">Nombre de la sección</Label>
        <Input
          id="cat-name"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Bebidas sin alcohol"
        />
      </div>

      <div>
        <Label>Ícono</Label>
        <div className="mt-1 flex gap-2">
          <Input
            value={iconQuery}
            onChange={(e) => setIconQuery(e.target.value)}
            placeholder="Buscar rubro (ropa, mascotas…)"
            className="flex-1"
          />
          <Input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value.slice(0, 8))}
            maxLength={8}

            placeholder="😀"
            aria-label="Pegá cualquier emoji"
            className="w-20 text-center text-lg"
          />
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Podés pegar o escribir cualquier emoji con el teclado de tu celular.
        </p>
        <div className="mt-1 max-h-48 space-y-2 overflow-y-auto rounded-xl border border-border bg-background p-2">
          {groups.map((g) => (

            <div key={g.group}>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {g.group}
              </p>
              <div className="flex flex-wrap gap-1">
                {g.icons.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setEmoji(ic)}
                    className={`grid size-9 place-items-center rounded-lg border text-lg ${
                      emoji === ic ? "border-brand bg-brand/10" : "border-border"
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-border p-3">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">Vista previa</p>
        <div className="w-20 rounded-2xl border border-border bg-background p-2 text-center">
          <span className="block text-2xl" aria-hidden>
            {emoji}
          </span>
          <span className="block text-[10px] font-medium leading-tight">
            {name.trim() || "Sección"}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving} className="flex-1">
          {saving ? "Guardando…" : "Guardar sección"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
