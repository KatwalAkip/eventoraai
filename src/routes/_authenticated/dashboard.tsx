import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarDays, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/ConfirmButton";
import { createSampleEvent, dashboardQuery, useInvalidate } from "@/lib/queries";
import { formatMoney, summarizeBudget } from "@/lib/budget";
import { daysBetween, isOverdue, taskProgress, todayIso } from "@/lib/timeline";
import { bookingProgress } from "@/lib/vendors";
import { EVENT_TYPES, labelFor } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Eventora AI" }, { name: "description", content: "Your upcoming events, budgets, tasks and vendor bookings." }, { property: "og:title", content: "Dashboard — Eventora AI" }, { property: "og:description", content: "Your event planning dashboard." }] }),
  component: Dashboard,
});

function Bar({ pct, label }: { pct: number; label: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground"><span>{label}</span><span>{pct}%</span></div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-full bg-primary" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

function Dashboard() {
  const { data, isLoading, error, refetch } = useQuery(dashboardQuery());
  const navigate = useNavigate();
  const inv = useInvalidate();
  const sample = useMutation({
    mutationFn: createSampleEvent,
    onSuccess: async (ev) => {
      await inv(["dashboard"], ["events"]);
      toast.success("Sample event added. It's labelled so you can delete it any time.");
      navigate({ to: "/events/$eventId", params: { eventId: ev.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const today = todayIso();

  if (isLoading)
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading dashboard">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-48" />
      </div>
    );
  if (error)
    return <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">Couldn't load your events. <Button variant="link" onClick={() => refetch()}>Retry</Button></div>;

  const { events, budget, tasks, vendors } = data!;
  const upcoming = events.filter((e) => e.event_date >= today);
  const deadlines = tasks
    .filter((t) => t.status !== "done" && t.due_date)
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))
    .slice(0, 6);
  const tp = taskProgress(tasks);
  const vp = bookingProgress(vendors);
  const evName = (id: string) => events.find((e) => e.id === id)?.title ?? "";

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Everything coming up, at a glance."
        actions={<Button asChild><Link to="/events/new"><Plus /> New event</Link></Button>}
      />
      {events.length === 0 ? (
        <EmptyState
          title="Plan your first event"
          text="Create an event to get an AI-assisted plan, budget and timeline — or load a clearly-labelled sample to explore."
          action={<><Button asChild><Link to="/events/new">Create event</Link></Button><Button variant="outline" onClick={() => sample.mutate()} disabled={sample.isPending}>{sample.isPending ? "Adding…" : "Load sample event"}</Button></>}
        />
      ) : (
        <div className="space-y-8">
          <section aria-labelledby="stats" className="grid gap-4 sm:grid-cols-3">
            <h2 id="stats" className="sr-only">Overview</h2>
            <div className="rounded-xl border bg-card p-5 shadow-card"><p className="text-xs uppercase text-muted-foreground">Upcoming events</p><p className="mt-1 text-3xl font-semibold">{upcoming.length}</p></div>
            <div className="rounded-xl border bg-card p-5 shadow-card"><p className="text-xs uppercase text-muted-foreground">Tasks complete</p><p className="mt-1 text-3xl font-semibold">{tp.done}<span className="text-base text-muted-foreground"> / {tp.total}</span></p><p className="text-xs text-muted-foreground">{tp.total - tp.done} pending</p></div>
            <div className="rounded-xl border bg-card p-5 shadow-card"><p className="text-xs uppercase text-muted-foreground">Vendors booked</p><p className="mt-1 text-3xl font-semibold">{vp.booked}<span className="text-base text-muted-foreground"> / {vp.total}</span></p></div>
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <section className="lg:col-span-2" aria-labelledby="ev-h">
              <h2 id="ev-h" className="mb-3 text-xl font-semibold">Your events</h2>
              <ul className="space-y-3">
                {events.map((e) => {
                  const lines = budget.filter((b) => b.event_id === e.id).map((b) => ({ name: "", allocated: b.allocated, spent: b.spent }));
                  const s = summarizeBudget(e.total_budget, lines, e.contingency_pct);
                  const et = tasks.filter((t) => t.event_id === e.id);
                  const days = daysBetween(today, e.event_date);
                  return (
                    <li key={e.id}>
                      <Link to="/events/$eventId" params={{ eventId: e.id }} className="block rounded-xl border bg-card p-5 shadow-card transition hover:border-primary">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h3 className="font-sans text-lg font-semibold">{e.title}</h3>
                            <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                              <span className="inline-flex items-center gap-1"><CalendarDays className="size-4" aria-hidden />{e.event_date}</span>
                              <span className="inline-flex items-center gap-1"><Users className="size-4" aria-hidden />{e.guest_count} guests</span>
                              <span>{labelFor(EVENT_TYPES, e.event_type)}</span>
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {e.is_sample && <Badge variant="outline">Sample</Badge>}
                            {e.status === "draft" && <Badge variant="secondary">Draft</Badge>}
                            <Badge variant={days < 0 ? "secondary" : "default"}>{days < 0 ? "Past" : days === 0 ? "Today" : `${days} days to go`}</Badge>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <Bar label={`Budget spent: ${formatMoney(s.spent, e.currency)} of ${formatMoney(s.total, e.currency)}`} pct={Math.round(s.percentSpent)} />
                          <Bar label="Tasks done" pct={taskProgress(et).pct} />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
            <section aria-labelledby="dl-h">
              <h2 id="dl-h" className="mb-3 text-xl font-semibold">Upcoming deadlines</h2>
              {deadlines.length === 0 ? (
                <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">No open deadlines.</p>
              ) : (
                <ul className="divide-y rounded-xl border bg-card shadow-card">
                  {deadlines.map((t) => (
                    <li key={t.id} className="p-3 text-sm">
                      <Link to="/events/$eventId/timeline" params={{ eventId: t.event_id }} className="font-medium hover:underline">{t.title}</Link>
                      <p className="text-xs text-muted-foreground">{evName(t.event_id)} · due {t.due_date} {isOverdue(t, today) && <span className="font-semibold text-destructive">· Overdue</span>}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
