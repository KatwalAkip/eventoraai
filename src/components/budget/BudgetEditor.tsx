import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney, safeAmount, savingsSuggestions, summarizeBudget } from "@/lib/budget";
import { ConfirmButton } from "@/components/common/ConfirmButton";

export interface BudgetLineView {
  id: string;
  name: string;
  allocated: number;
  spent: number;
}

interface Props {
  total: number;
  currency: string;
  contingencyPct: number;
  lines: BudgetLineView[];
  onChangeLine: (id: string, patch: { allocated?: number; spent?: number; name?: string }) => void;
  onAddLine: (name: string) => void;
  onDeleteLine: (id: string) => void;
  onChangeTotal: (total: number) => void;
  onChangeContingency: (pct: number) => void;
}

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warn" | "ok" }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-card">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone === "warn" ? "text-destructive" : ""}`} data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}>{value}</p>
    </div>
  );
}

/** Commit numeric edits on blur so typing doesn't trigger a save per keystroke. */
function AmountInput({ value, label, onCommit }: { value: number; label: string; onCommit: (n: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const invalid = draft !== null && draft.trim() !== "" && (!Number.isFinite(Number(draft)) || Number(draft) < 0);
  return (
    <div>
      <Input
        type="number"
        min="0"
        inputMode="decimal"
        aria-label={label}
        aria-invalid={invalid}
        value={draft ?? String(value)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== null && !invalid) onCommit(safeAmount(draft));
          setDraft(null);
        }}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="h-8 w-28 text-right"
      />
      {invalid && <span role="alert" className="text-xs text-destructive">Enter 0 or more</span>}
    </div>
  );
}

export function BudgetEditor(p: Props) {
  const [newName, setNewName] = useState("");
  const summary = useMemo(() => summarizeBudget(p.total, p.lines, p.contingencyPct), [p.total, p.lines, p.contingencyPct]);
  const tips = useMemo(() => savingsSuggestions(summary, p.lines), [summary, p.lines]);
  const money = (n: number) => formatMoney(n, p.currency);
  const chartData = p.lines.filter((l) => l.allocated > 0).map((l) => ({ name: l.name, value: Number(l.allocated) }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total budget" value={money(summary.total)} />
        <Stat label="Allocated" value={money(summary.allocated)} tone={summary.overAllocated ? "warn" : undefined} />
        <Stat label="Spent" value={money(summary.spent)} />
        <Stat label="Remaining" value={money(summary.remaining)} tone={summary.remaining < 0 ? "warn" : undefined} />
      </div>

      <div role="status" aria-live="polite">
        {summary.overAllocated || summary.overSpent || summary.overspentCategories.length > 0 ? (
          <div className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div>
              <strong>Budget warning: </strong>
              {summary.overAllocated && `Allocations exceed the total by ${money(summary.allocated - summary.total)}. `}
              {summary.overSpent && `Spending exceeds the total by ${money(summary.spent - summary.total)}. `}
              {summary.overspentCategories.length > 0 && `Over allocation: ${summary.overspentCategories.join(", ")}.`}
            </div>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-sm text-success"><CheckCircle2 className="size-4" aria-hidden /> Within budget — {money(summary.unallocated)} unallocated.</p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="overflow-x-auto rounded-xl border bg-card shadow-card lg:col-span-3">
          <table className="w-full text-sm">
            <caption className="sr-only">Budget categories</caption>
            <thead className="border-b text-left text-xs uppercase text-muted-foreground">
              <tr><th className="p-3">Category</th><th className="p-3 text-right">Allocated</th><th className="p-3 text-right">Spent</th><th className="p-3 text-right">Left</th><th className="p-3"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {p.lines.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No categories yet. Add one below.</td></tr>
              )}
              {p.lines.map((l) => {
                const left = Number(l.allocated) - Number(l.spent);
                return (
                  <tr key={l.id} className="border-b last:border-0">
                    <th scope="row" className="p-3 text-left font-medium">{l.name}</th>
                    <td className="p-3"><div className="flex justify-end"><AmountInput label={`${l.name} allocated`} value={Number(l.allocated)} onCommit={(n) => p.onChangeLine(l.id, { allocated: n })} /></div></td>
                    <td className="p-3"><div className="flex justify-end"><AmountInput label={`${l.name} spent`} value={Number(l.spent)} onCommit={(n) => p.onChangeLine(l.id, { spent: n })} /></div></td>
                    <td className={`p-3 text-right tabular-nums ${left < 0 ? "font-semibold text-destructive" : ""}`}>{left < 0 ? `Over ${money(-left)}` : money(left)}</td>
                    <td className="p-3 text-right">
                      <ConfirmButton label={`Delete ${l.name}`} title={`Delete ${l.name}?`} description="This removes the category and its amounts." onConfirm={() => p.onDeleteLine(l.id)}>
                        <Trash2 />
                      </ConfirmButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <form
            className="flex gap-2 border-t p-3"
            onSubmit={(e) => {
              e.preventDefault();
              const n = newName.trim();
              if (!n) return;
              p.onAddLine(n.slice(0, 60));
              setNewName("");
            }}
          >
            <Label htmlFor="new-cat" className="sr-only">New category name</Label>
            <Input id="new-cat" placeholder="New category, e.g. Favors" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-8" />
            <Button type="submit" size="sm" variant="outline"><Plus /> Add</Button>
          </form>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border bg-card p-4 shadow-card">
            <h3 className="text-base font-semibold">Allocation by category</h3>
            {chartData.length ? (
              <div className="h-64" role="img" aria-label={`Pie chart: ${chartData.map((d) => `${d.name} ${money(d.value)}`).join(", ")}`}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                      {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => money(v)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">Allocate amounts to see the chart.</p>
            )}
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-card">
            <h3 className="text-base font-semibold">Settings</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Total ({p.currency})</Label><AmountInput label="Total budget" value={summary.total} onCommit={p.onChangeTotal} /></div>
              <div className="space-y-1"><Label>Contingency %</Label><AmountInput label="Contingency percent" value={p.contingencyPct} onCommit={(n) => p.onChangeContingency(Math.min(50, n))} /></div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Reserve: {money(summary.contingencyReserve)} · Spendable after reserve: {money(summary.spendableAfterReserve)}</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-card">
            <h3 className="text-base font-semibold">Savings suggestions</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{tips.map((t) => <li key={t}>{t}</li>)}</ul>
            <p className="mt-2 text-xs text-muted-foreground">Estimates for planning only — not vendor quotes.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
