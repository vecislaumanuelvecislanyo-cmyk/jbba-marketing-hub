import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db, errMsg, useInvalidate, useLookup, type LookupKey, type Row } from "@/lib/data";
import { useMe } from "@/lib/auth";
import { isManager } from "@/lib/rbac";
import { cn } from "@/lib/utils";

export type FieldDef = {
  name: string;
  label: string;
  type: "text" | "email" | "textarea" | "number" | "date" | "datetime" | "select";
  options?: { value: string; label: string }[];
  lookup?: LookupKey;
  required?: boolean;
  /** Owner field: promotores are locked to their own employee record. */
  owner?: boolean;
  wide?: boolean;
  defaultValue?: string;
};

const NONE = "__none__";

function toInput(v: unknown, type: FieldDef["type"]) {
  if (v === null || v === undefined) return "";
  if (type === "datetime") {
    const d = new Date(String(v));
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
  }
  if (type === "date") return String(v).slice(0, 10);
  return String(v);
}

function buildSchema(fields: FieldDef[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    let s: z.ZodTypeAny;
    const base = z.string().trim();
    if (f.type === "email") s = base.max(255).refine((v) => !v || z.string().email().safeParse(v).success, "Email inválido");
    else if (f.type === "number") s = base.refine((v) => !v || (!isNaN(Number(v)) && Number(v) >= 0), "Número inválido (≥ 0)");
    else if (f.type === "textarea") s = base.max(2000, "Máximo 2000 caracteres");
    else s = base.max(255, "Máximo 255 caracteres");
    if (f.required) s = (s as z.ZodString).refine((v: string) => v.length > 0, "Campo obrigatório");
    shape[f.name] = s;
  }
  return z.object(shape);
}

export function EntityForm({
  open, onOpenChange, table, title, fields, row, validate, invalidate = [], onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  table: string;
  title: string;
  fields: FieldDef[];
  row?: Row | null;
  validate?: (v: Record<string, string>) => string | null;
  invalidate?: string[];
  onSaved?: () => void;
}) {
  const me = useMe();
  const manager = isManager(me.roles);
  const inv = useInvalidate();
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const v: Record<string, string> = {};
    for (const f of fields) {
      v[f.name] = row ? toInput(row[f.name], f.type) : f.defaultValue ?? "";
      if (!row && f.owner && !manager && me.employeeId) v[f.name] = me.employeeId;
    }
    setValues(v);
    setErrors({});
  }, [open, row]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: string, val: string) => setValues((p) => ({ ...p, [k]: val }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = buildSchema(fields).safeParse(values);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (errs[String(i.path[0])] = i.message));
      setErrors(errs);
      return;
    }
    const cross = validate?.(values);
    if (cross) { toast.error(cross); return; }
    if (!manager && fields.some((f) => f.owner) && !me.employeeId) {
      toast.error("A sua conta não está associada a um colaborador. Contacte o administrador.");
      return;
    }
    const payload: Row = {};
    for (const f of fields) {
      const v = values[f.name];
      if (v === "" || v === undefined) payload[f.name] = null;
      else if (f.type === "number") payload[f.name] = Number(v);
      else if (f.type === "datetime") payload[f.name] = new Date(v).toISOString();
      else payload[f.name] = v;
    }
    setSaving(true);
    const res = row ? await db(table).update(payload).eq("id", row.id) : await db(table).insert(payload);
    setSaving(false);
    if (res.error) { toast.error(errMsg(res.error)); return; }
    toast.success(row ? "Registo atualizado" : "Registo criado");
    inv(table, ...invalidate);
    onSaved?.();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{row ? `Editar ${title}` : `Novo registo: ${title}`}</DialogTitle>
          <DialogDescription>Os campos marcados com * são obrigatórios.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <FieldInput key={f.name} f={f} value={values[f.name] ?? ""} error={errors[f.name]} onChange={(v) => set(f.name, v)} locked={!!f.owner && !manager} />
          ))}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "A guardar…" : "Guardar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldInput({ f, value, onChange, error, locked }: { f: FieldDef; value: string; onChange: (v: string) => void; error?: string; locked: boolean }) {
  const lookup = useLookup(f.lookup ?? "employees", !!f.lookup);
  const options = f.lookup ? lookup.items : f.options;
  const id = `f-${f.name}`;
  return (
    <div className={cn("space-y-1.5", (f.wide || f.type === "textarea") && "sm:col-span-2")}>
      <Label htmlFor={id}>{f.label}{f.required && " *"}</Label>
      {f.type === "textarea" ? (
        <Textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} rows={3} />
      ) : options ? (
        <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)} disabled={locked}>
          <SelectTrigger id={id}><SelectValue placeholder="Selecionar…" /></SelectTrigger>
          <SelectContent>
            {!f.required && <SelectItem value={NONE}>— Nenhum —</SelectItem>}
            {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      ) : (
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)}
          type={f.type === "datetime" ? "datetime-local" : f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "email" ? "email" : "text"}
          step={f.type === "number" ? "any" : undefined} />
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
