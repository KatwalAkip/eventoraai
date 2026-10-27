import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { FileDown, Printer, RefreshCw, Share2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/common/ConfirmButton";
import { generatePlan } from "@/lib/ai.functions";
import { budgetQuery, eventQuery, planQuery, savePlan, savedIdeasQuery, tasksQuery, useInvalidate } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { PLAN_SECTIONS, type EventPlan, type PlanSection } from "@/lib/plan-schema";
import { allocateByPercent, formatMoney } from "@/lib/budget";
import { exportPlanPdf } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/events/$eventId/")({
  head: () => ({ meta: [{ title: "Event plan — Eventora AI" }, { name: "description", content: "Your personalized AI event plan." }, { property: "og:title", content: "Event plan — Eventora AI" }, { property: "og:description", content: "Personalized event plan." }] }),
  component: PlanPage,
});

const SECTION_LABEL: Record<PlanSection, string> = {
  themes: "Theme concepts",
  schedule: "Event schedule",
  budget: "Suggested budget split",
  vendors: "Venue & vendor requirements",
  ideas: "Decor, catering & entertainment ideas",
  guestManagement: "Guest management",
  milestones: "Preparation milestones",
  contingencies: "Contingency plans",
};

function sectionToText(plan: EventPlan, s: PlanSection): string {
  switch (s) {
    case "themes": return plan.themes.map((t) => `${t.name}: ${t.description}`).join("\n");
    case "schedule": return plan.schedule.map((x) => `${x.time} ${x.activity}`).join("\n");
    case "guestManagement": return plan.guestManagement.join("\n");
    case "contingencies": return plan.contingencies.map((c) => `${c.risk}: ${c.plan}`).join("\n");
    case "milestones": return plan.milestones.map((m) => `${m.weeksBefore}w: ${m.title}`).join("\n");
    default: return "";
  }
}
function textToSection(plan: EventPlan, s: PlanSection, text: string): EventPlan {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 20);
  const split = (l: string, sep: string | RegExp) => { const i = l.search(sep); return i < 0 ? [l, ""] : [l.slice(0, i).trim(), l.slice(i + 1).trim()]; };
  switch (s) {
    case "themes": return { ...plan, themes: lines.map((l, i) => { const [name, description] = split(l, ":"); return { name, description, why: plan.themes[i]?.why ?? "Edited by you" }; }) };
    case "schedule": return { ...plan, schedule: lines.map((l) => { const [time, activity] = split(l, " "); return { time, activity }; }) };
    case "guestManagement": return { ...plan, guestManagement: lines };
    case "contingencies": return { ...plan, contingencies: lines.map((l) => { const [risk, p] = split(l, ":"); return { risk, plan: p }; }) };
    case "milestones": return { ...plan, milestones: lines.map((l) => { const [w, title] = split(l, ":"); return { title: title || w, weeksBefore: parseInt(w) || 0 }; }) };
    default: return plan;
  }
}
const EDITABLE: PlanSection[] = ["themes", "schedule", "guestManagement", "milestones", "contingencies"];

function PlanPage() {
  const { eventId } = Route.useParams();
  const ev = useQuery(eventQuery(eventId));
  const planQ = useQuery(planQuery(eventId));
  const budget = useQuery(budgetQuery(eventId));
  const tasks = useQuery(tasksQuery(eventId));
  const ideas = useQuery(savedIdeasQuery());
  const gen = useServerFn(generatePlan);
  const inv = useInvalidate();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PlanSection | null>(null);
  const [draft, setDraft] = useState("");
  const [busySection, setBusySection] = useState<PlanSection | "all" | null>(null);

  const run = useMutation({
    mutationFn: async ({ mode, section }: { mode: "ai" | "demo"; section?: PlanSection }) => {
      const res = await gen({ data: { eventId, mode } });
      if (!res.ok) throw new Error(res.error);
      const existing = planQ.data?.plan as EventPlan | undefined;
      const merged = section && existing ? { ...existing, [section]: res.data[section] } : res.data;
      const source = section && planQ.data ? (planQ.data.source as "ai" | "demo") : res.source;
      return savePlan(eventId, merged, res.source === "demo" ? "demo" : source);
    },
    onMutate: ({ section }) => { setError(null); setBusySection(section ?? "all"); },
    onSuccess: async (_d, { section }) => { await inv(["plan", eventId]); toast.success(section ? `${SECTION_LABEL[section]} regenerated` : "Plan ready"); },
    onError: (e: Error) => setError(e.message),
    onSettled: () => setBusySection(null),
  });

  const applyBudget = useMutation({
    mutationFn: async (plan: EventPlan) => {
      const e = ev.data!;
      const rows = allocateByPercent(Number(e.total_budget), plan.budget.map((b) => ({ name: b.category, percent: b.percent })));
      const { data: u } = await supabase.auth.getUser();
      await supabase.from("budget_categories").delete().eq("event_id", eventId).eq("spent", 0);
      const existing = (await supabase.from("budget_categories").select("name").eq("event_id", eventId)).data ?? [];
      const names = new Set(existing.map((x) => x.name.toLowerCase()));
      const ins = rows.filter((r) => !names.has(r.name.toLowerCase())).map((r, i) => ({ ...r, event_id: eventId, user_id: u.user!.id, position: i }));
      if (ins.length) { const { error } = await supabase.from("budget_categories").insert(ins); if (error) throw error; }
    },
    onSuccess: async () => { await inv(["budget", eventId], ["dashboard"]); toast.success("Budget categories updated from the plan (categories with spending were kept)"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveEdit = useMutation({
    mutationFn: async (plan: EventPlan) => savePlan(eventId, plan, planQ.data!.source as "ai" | "demo"),
    onSuccess: async () => { await inv(["plan", eventId]); setEditing(null); toast.success("Section saved"); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!ev.data || planQ.isLoading) return <Skeleton className="h-96" aria-busy="true" />;
  const e = ev.data;
  const plan = planQ.data?.plan as EventPlan | undefined;
  const source = planQ.data?.source as "ai" | "demo" | undefined;
  const money = (n: number) => formatMoney(n, e.currency);
  const eventIdeas = (ideas.data ?? []).filter((i) => i.event_id === eventId);

  async function pdf() {
    const t = toast.loading("Preparing PDF…");
    try {
      await exportPlanPdf({
        title: e.title,
        subtitle: `${e.event_date} · ${e.guest_count} guests · ${e.location} · Budget ${money(Number(e.total_budget))}`,
        plan: plan ?? null,
        planSource: source ?? null,
        budget: (budget.data ?? []).map((b) => ({ name: b.name, allocated: Number(b.allocated), spent: Number(b.spent) })),
        tasks: tasks.data ?? [],
        money,
      });
      toast.success("PDF downloaded", { id: t });
    } catch {
      toast.error("Couldn't create the PDF. Please try again.", { id: t });
    }
  }
  async function share() {
    const text = `${e.title} — ${e.event_date}, ${e.location}. ${e.guest_count} guests.${plan ? ` Theme: ${plan.themes[0]?.name}.` : ""}`;
    try {
      if (navigator.share) await navigator.share({ title: e.title, text });
      else { await navigator.clipboard.writeText(text); toast.success("Summary copied to clipboard"); }
    } catch { /* user cancelled */ }
  }

  const actions = (
    <div className="no-print flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={pdf}><FileDown /> PDF</Button>
      <Button variant="outline" size="sm" onClick={() => window.print()}><Printer /> Print</Button>
      <Button variant="outline" size="sm" onClick={share}><Share2 /> Share summary</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div aria-live="polite">
        {error && (
          <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <p className="font-medium text-destructive">{error}</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => run.mutate({ mode: "ai" })}>Try again</Button>
              <Button size="sm" variant="ghost" onClick={() => run.mutate({ mode: "demo" })}>Use sample plan instead</Button>
            </div>
          </div>
        )}
      </div>

      {!plan ? (
        busySection === "all" ? (
          <div className="space-y-3" aria-busy="true" aria-label="Generating plan"><Skeleton className="h-8 w-72" /><div className="grid gap-3 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-36" />)}</div><Skeleton className="h-48" /></div>
        ) : (
          <EmptyState
            title="Generate your event plan"
            text="Eventora uses your details — guests, budget, theme, food and accessibility — to draft themes, a schedule, budget split, vendor needs and contingencies."
            action={<>
              <Button onClick={() => run.mutate({ mode: "ai" })} disabled={run.isPending}><Sparkles /> Generate with AI</Button>
              <Button variant="outline" onClick={() => run.mutate({ mode: "demo" })} disabled={run.isPending}>Load sample plan</Button>
            </>}
          />
        )
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {source === "ai" ? <Badge className="bg-teal text-teal-foreground"><Sparkles className="mr-1 size-3" />AI-generated</Badge> : <Badge variant="outline">Sample plan — not live AI</Badge>}
              <Button size="sm" variant="ghost" className="no-print" onClick={() => run.mutate({ mode: "ai" })} disabled={run.isPending}><RefreshCw className={busySection === "all" ? "animate-spin" : ""} /> Regenerate all</Button>
            </div>
            {actions}
          </div>
          <p className="max-w-3xl text-muted-foreground">{plan.summary}</p>

          {PLAN_SECTIONS.map((s) => (
            <section key={s} aria-labelledby={`sec-${s}`} className="rounded-2xl border bg-card p-5 shadow-card">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 id={`sec-${s}`} className="text-lg font-semibold">{SECTION_LABEL[s]}</h2>
                <div className="no-print flex gap-1">
                  {s === "budget" && <Button size="sm" variant="teal" onClick={() => applyBudget.mutate(plan)} disabled={applyBudget.isPending}>Apply to budget</Button>}
                  {EDITABLE.includes(s) && editing !== s && <Button size="sm" variant="ghost" onClick={() => { setEditing(s); setDraft(sectionToText(plan, s)); }}>Edit</Button>}
                  <Button size="sm" variant="ghost" onClick={() => run.mutate({ mode: "ai", section: s })} disabled={run.isPending} aria-label={`Regenerate ${SECTION_LABEL[s]}`}>
                    <Wand2 className={busySection === s ? "animate-pulse" : ""} /> Regenerate
                  </Button>
                </div>
              </div>
              {editing === s ? (
                <div className="space-y-2">
                  <label htmlFor={`edit-${s}`} className="text-xs text-muted-foreground">One item per line</label>
                  <Textarea id={`edit-${s}`} rows={6} value={draft} onChange={(ev2) => setDraft(ev2.target.value)} />
                  <div className="flex gap-2"><Button size="sm" onClick={() => saveEdit.mutate(textToSection(plan, s, draft))}>Save</Button><Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button></div>
                </div>
              ) : busySection === s ? <Skeleton className="h-24" /> : <SectionBody plan={plan} s={s} money={money} total={Number(e.total_budget)} />}
            </section>
          ))}
        </>
      )}

      {eventIdeas.length > 0 && (
        <section aria-labelledby="saved-ideas" className="rounded-2xl border bg-card p-5 shadow-card">
          <h2 id="saved-ideas" className="mb-3 text-lg font-semibold">Ideas added to this event</h2>
          <ul className="grid gap-2 md:grid-cols-2">{eventIdeas.map((i) => <li key={i.id} className="rounded-lg bg-muted p-3 text-sm"><strong>{i.title}</strong><p className="text-muted-foreground">{i.description}</p></li>)}</ul>
        </section>
      )}
      {!plan && actions}
    </div>
  );
}

function SectionBody({ plan, s, money, total }: { plan: EventPlan; s: PlanSection; money: (n: number) => string; total: number }) {
  switch (s) {
    case "themes":
      return <ul className="grid gap-3 md:grid-cols-3">{plan.themes.map((t) => <li key={t.name} className="rounded-xl bg-accent/50 p-4"><h3 className="font-sans font-semibold">{t.name}</h3><p className="mt-1 text-sm">{t.description}</p><p className="mt-2 text-xs text-muted-foreground"><strong>Why:</strong> {t.why}</p></li>)}</ul>;
    case "schedule":
      return <ol className="space-y-1">{plan.schedule.map((x, i) => <li key={i} className="flex gap-4 text-sm"><span className="w-14 shrink-0 font-semibold tabular-nums text-primary">{x.time}</span>{x.activity}</li>)}</ol>;
    case "budget":
      return <><table className="w-full text-sm"><caption className="sr-only">Suggested budget split</caption><tbody>{plan.budget.map((b) => <tr key={b.category} className="border-b last:border-0"><th scope="row" className="py-2 text-left font-medium">{b.category}</th><td className="py-2 tabular-nums">{b.percent}%</td><td className="py-2 tabular-nums">{money((total * b.percent) / 100)}</td><td className="py-2 text-muted-foreground">{b.why}</td></tr>)}</tbody></table><p className="mt-2 text-xs text-muted-foreground">Illustrative estimates, not vendor quotes.</p></>;
    case "vendors":
      return <ul className="grid gap-2 sm:grid-cols-2">{plan.vendors.map((v, i) => <li key={i} className="text-sm"><strong>{v.category}:</strong> {v.requirement}</li>)}</ul>;
    case "ideas":
      return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{(Object.keys(plan.ideas) as (keyof EventPlan["ideas"])[]).map((k) => <div key={k}><h3 className="font-sans text-sm font-semibold capitalize">{k}</h3><ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">{plan.ideas[k].map((x) => <li key={x}>{x}</li>)}</ul></div>)}</div>;
    case "guestManagement":
      return <ul className="list-disc space-y-1 pl-5 text-sm">{plan.guestManagement.map((g) => <li key={g}>{g}</li>)}</ul>;
    case "milestones":
      return <ul className="space-y-1 text-sm">{[...plan.milestones].sort((a, b) => b.weeksBefore - a.weeksBefore).map((m, i) => <li key={i}><span className="font-semibold">{m.weeksBefore > 0 ? `${m.weeksBefore} weeks before` : m.weeksBefore === 0 ? "Event week" : `${-m.weeksBefore} weeks after`}:</span> {m.title}</li>)}</ul>;
    case "contingencies":
      return <ul className="grid gap-3 md:grid-cols-3">{plan.contingencies.map((c) => <li key={c.risk} className="rounded-lg border p-3 text-sm"><strong>{c.risk}</strong><p className="text-muted-foreground">{c.plan}</p></li>)}</ul>;
  }
}
