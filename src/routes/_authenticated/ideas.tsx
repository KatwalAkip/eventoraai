import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Heart, Leaf, PiggyBank, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/ConfirmButton";
import { generateIdeas } from "@/lib/ai.functions";
import { IDEA_FOCUS, type Idea, type IdeaFilters } from "@/lib/ideas";
import { eventsQuery, savedIdeasQuery, useInvalidate } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { EVENT_TYPES } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/ideas")({
  head: () => ({ meta: [{ title: "Ideas generator — Eventora AI" }, { name: "description", content: "Personalized themes, activities, menus and eco-friendly ideas." }, { property: "og:title", content: "Ideas generator — Eventora AI" }, { property: "og:description", content: "Personalized event ideas." }] }),
  component: IdeasPage,
});

const sel = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm";

function IdeasPage() {
  const gen = useServerFn(generateIdeas);
  const inv = useInvalidate();
  const events = useQuery(eventsQuery());
  const saved = useQuery(savedIdeasQuery());
  const [f, setF] = useState<IdeaFilters>({ eventType: "birthday", focus: "activities", budget: "medium", audience: "", theme: "", location: "", ecoOnly: false });
  const [results, setResults] = useState<{ ideas: Idea[]; source: "ai" | "demo" } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState("");

  const run = useMutation({
    mutationFn: async (mode: "ai" | "demo") => {
      const r = await gen({ data: { ...f, mode } });
      if (!r.ok) throw new Error(r.error);
      return { ideas: r.data, source: r.source };
    },
    onMutate: () => setError(null),
    onSuccess: setResults,
    onError: (e: Error) => setError(e.message),
  });

  const save = useMutation({
    mutationFn: async ({ idea, eventId }: { idea: Idea; eventId: string | null }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("saved_ideas").insert({ user_id: u.user!.id, event_id: eventId, title: idea.title, description: idea.description, category: idea.category, estimated_cost: idea.estimatedCost });
      if (error) throw error;
    },
    onSuccess: async (_d, { eventId }) => { await inv(["ideas"]); toast.success(eventId ? "Idea added to your event plan" : "Saved to favorites"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("saved_ideas").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => inv(["ideas"]),
  });

  return (
    <div>
      <PageHeader title="Ideas generator" description="Filter by event, budget and audience, then save favorites or add them straight to an event." />
      <form className="grid gap-3 rounded-2xl border bg-card p-5 shadow-card sm:grid-cols-3 lg:grid-cols-4" onSubmit={(e) => { e.preventDefault(); run.mutate("ai"); }} aria-label="Idea filters">
        <div className="space-y-1"><Label htmlFor="i-type">Event type</Label><select id="i-type" className={sel} value={f.eventType} onChange={(e) => setF({ ...f, eventType: e.target.value })}>{EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
        <div className="space-y-1"><Label htmlFor="i-focus">Looking for</Label><select id="i-focus" className={sel} value={f.focus} onChange={(e) => setF({ ...f, focus: e.target.value })}>{IDEA_FOCUS.map((x) => <option key={x} value={x} className="capitalize">{x}</option>)}</select></div>
        <div className="space-y-1"><Label htmlFor="i-budget">Budget level</Label><select id="i-budget" className={sel} value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value as IdeaFilters["budget"] })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
        <div className="space-y-1"><Label htmlFor="i-aud">Audience</Label><Input id="i-aud" maxLength={120} value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })} placeholder="e.g. kids & parents" /></div>
        <div className="space-y-1"><Label htmlFor="i-theme">Theme</Label><Input id="i-theme" maxLength={120} value={f.theme} onChange={(e) => setF({ ...f, theme: e.target.value })} /></div>
        <div className="space-y-1"><Label htmlFor="i-loc">Location</Label><Input id="i-loc" maxLength={120} value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={f.ecoOnly} onChange={(e) => setF({ ...f, ecoOnly: e.target.checked })} className="size-4" /> Eco-friendly only</label>
        <div className="flex items-end gap-2">
          <Button type="submit" disabled={run.isPending}><Sparkles /> {run.isPending ? "Thinking…" : "Generate"}</Button>
          <Button type="button" variant="outline" onClick={() => run.mutate("demo")} disabled={run.isPending}>Samples</Button>
        </div>
      </form>

      <div aria-live="polite" className="mt-6 space-y-4">
        {error && <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">{error} <Button variant="link" size="sm" onClick={() => run.mutate("demo")}>Show sample ideas</Button></div>}
        {run.isPending && <div className="grid gap-3 md:grid-cols-3" aria-busy="true">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-36" />)}</div>}
        {results && !run.isPending && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              {results.source === "ai" ? <Badge className="bg-teal text-teal-foreground">AI-generated</Badge> : <Badge variant="outline">Sample ideas — not live AI</Badge>}
              <Label htmlFor="i-target" className="text-sm">Add ideas to:</Label>
              <select id="i-target" className="h-8 rounded-md border border-input bg-background px-2 text-sm" value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="">Favorites only</option>
                {(events.data ?? []).map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
              </select>
            </div>
            {results.ideas.length === 0 ? <EmptyState title="No ideas match" text="Try a different focus or remove the eco-only filter." /> : (
              <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {results.ideas.map((i) => (
                  <li key={i.title} className="flex flex-col rounded-xl border bg-card p-4 shadow-card">
                    <h3 className="font-sans font-semibold">{i.title}</h3>
                    <p className="mt-1 flex-1 text-sm text-muted-foreground">{i.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1 text-xs">
                      <Badge variant="secondary" className="capitalize">{i.category}</Badge>
                      <Badge variant="outline">Cost: {i.estimatedCost}</Badge>
                      {i.lowBudget && <Badge variant="outline"><PiggyBank className="mr-1 size-3" />Low budget</Badge>}
                      {i.ecoFriendly && <Badge variant="outline"><Leaf className="mr-1 size-3" />Eco</Badge>}
                    </div>
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => save.mutate({ idea: i, eventId: target || null })}>
                      <Heart /> {target ? "Add to event" : "Save favorite"}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <section className="mt-10" aria-labelledby="fav-h">
        <h2 id="fav-h" className="mb-3 text-xl font-semibold">Saved ideas</h2>
        {saved.isLoading ? <Skeleton className="h-24" /> : (saved.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Nothing saved yet.</p> : (
          <ul className="grid gap-2 md:grid-cols-2">
            {saved.data!.map((s) => (
              <li key={s.id} className="flex items-start justify-between gap-2 rounded-lg border bg-card p-3 text-sm">
                <div><strong>{s.title}</strong>{s.event_id && <span className="ml-2 text-xs text-teal">· {(events.data ?? []).find((e) => e.id === s.event_id)?.title}</span>}<p className="text-muted-foreground">{s.description}</p></div>
                <Button size="icon" variant="ghost" aria-label={`Remove ${s.title}`} onClick={() => remove.mutate(s.id)}><Trash2 /></Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
