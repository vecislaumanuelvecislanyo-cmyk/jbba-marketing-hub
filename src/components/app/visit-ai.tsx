import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { summarizeVisit, type VisitSummary } from "@/lib/ai-visit";
import { db, errMsg, useInvalidate } from "@/lib/data";
import { useMe } from "@/lib/auth";
import { canWriteOperational } from "@/lib/rbac";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function VisitAiButton({ row, clientName }: { row: any; clientName: string }) {
  const me = useMe();
  const inv = useInvalidate();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<string>(row.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<VisitSummary | null>(null);
  if (!canWriteOperational(me.roles)) return null;

  async function run() {
    setBusy(true); setRes(null);
    try {
      setRes(await summarizeVisit({ data: { visitId: row.id, notes, objective: row.objective ?? "", client: clientName, location: row.location ?? "" } }));
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  }

  async function apply() {
    if (!res) return;
    const outcome = [res.summary, res.keyPoints.length ? "\nPontos-chave:\n- " + res.keyPoints.join("\n- ") : "", res.risks.length ? "\nRiscos:\n- " + res.risks.join("\n- ") : ""].join("");
    const { error } = await db("visits").update({ notes, outcome, next_steps: res.nextSteps.map((s) => `- ${s}`).join("\n") }).eq("id", row.id);
    if (error) return toast.error(errMsg(error));
    toast.success("Resumo validado e guardado na visita.");
    inv("visits"); setOpen(false);
  }

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)} title="Notas e resumo IA"><Sparkles /></Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Notas da visita e resumo IA</DialogTitle>
            <DialogDescription>Escreva livremente o que aconteceu. A IA sugere um resumo e próximos passos; só são guardados depois de validar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5"><Label>Notas livres</Label><Textarea rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: Reunião com o diretor, interessado no serviço…" /></div>
          {res && (
            <div className="space-y-3 rounded-lg border bg-muted/40 p-4 text-sm">
              <div className="text-xs font-semibold uppercase text-muted-foreground">Sugestão IA · rascunho</div>
              <p>{res.summary}</p>
              {res.keyPoints.length > 0 && <div><div className="font-medium">Pontos-chave</div><ul className="list-disc pl-5">{res.keyPoints.map((k, i) => <li key={i}>{k}</li>)}</ul></div>}
              {res.outcome && <div><div className="font-medium">Resultado</div><p>{res.outcome}</p></div>}
              <div><div className="font-medium">Próximos passos sugeridos</div><ul className="list-disc pl-5">{res.nextSteps.map((k, i) => <li key={i}>{k}</li>)}</ul></div>
              {res.risks.length > 0 && <div><div className="font-medium">Riscos</div><ul className="list-disc pl-5">{res.risks.map((k, i) => <li key={i}>{k}</li>)}</ul></div>}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={run} disabled={busy || notes.trim().length < 5}><Sparkles />{busy ? "A gerar…" : res ? "Gerar novamente" : "Gerar resumo"}</Button>
            {res && <Button onClick={apply}>Validar e guardar</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
