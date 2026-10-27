import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { EventForm } from "@/components/event/EventForm";
import { ConfirmButton } from "@/components/common/ConfirmButton";
import { eventQuery, tasksQuery, useDeleteEvent, useRowMutations, useUpdateEvent } from "@/lib/queries";
import { computeDeadline, todayIso } from "@/lib/timeline";
import type { EventFormValues } from "@/lib/validation";

export const Route = createFileRoute("/_authenticated/events/$eventId/settings")({
  head: () => ({ meta: [{ title: "Event settings — Eventora AI" }, { name: "description", content: "Edit event details or delete the event." }, { property: "og:title", content: "Event settings — Eventora AI" }, { property: "og:description", content: "Edit event details." }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const ev = useQuery(eventQuery(eventId));
  const tasks = useQuery(tasksQuery(eventId));
  const upd = useUpdateEvent(eventId);
  const { update: updTask } = useRowMutations("tasks", eventId);
  const del = useDeleteEvent();
  if (!ev.data) return <Skeleton className="h-96" aria-busy="true" />;
  const e = ev.data;
  const initial: Partial<EventFormValues> = {
    ...e,
    event_type: e.event_type as EventFormValues["event_type"],
    currency: e.currency as EventFormValues["currency"],
    venue_preference: e.venue_preference as EventFormValues["venue_preference"],
    start_time: e.start_time ?? "",
    total_budget: Number(e.total_budget),
    contingency_pct: Number(e.contingency_pct),
    duration_hours: Number(e.duration_hours),
  };

  async function save(v: EventFormValues) {
    const dateChanged = v.event_date !== e.event_date;
    await upd.mutateAsync({ ...v, start_time: v.start_time || null, status: e.status === "draft" ? "planning" : e.status });
    if (dateChanged) {
      const today = todayIso();
      let moved = 0;
      for (const t of tasks.data ?? []) {
        if (t.offset_days == null || t.status === "done") continue;
        const { dueDate } = computeDeadline(v.event_date, t.offset_days, today);
        if (dueDate !== t.due_date) {
          updTask.mutate({ id: t.id, patch: { due_date: dueDate } });
          moved++;
        }
      }
      toast.success(`Saved. ${moved} suggested deadline${moved === 1 ? "" : "s"} recalculated for the new date.`);
    } else toast.success("Event details saved");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="rounded-2xl border bg-card p-6 shadow-card lg:col-span-2" aria-labelledby="ed-h">
        <h2 id="ed-h" className="mb-4 text-xl font-semibold">Event details</h2>
        <EventForm key={e.updated_at} wizard={false} initial={initial} submitLabel="Save changes" busy={upd.isPending} onSubmit={(v) => save(v)} />
      </section>
      <section className="h-fit rounded-2xl border border-destructive/30 bg-card p-6" aria-labelledby="dz-h">
        <h2 id="dz-h" className="text-lg font-semibold">Delete event</h2>
        <p className="mt-1 text-sm text-muted-foreground">Removes the event with its plan, budget, tasks and vendors. This can't be undone.</p>
        <div className="mt-4">
          <ConfirmButton
            label="Delete event"
            size="default"
            variant="destructive"
            title={`Delete "${e.title}"?`}
            description="All plan, budget, task and vendor data for this event will be permanently deleted."
            onConfirm={() => del.mutate(eventId, { onSuccess: () => { toast.success("Event deleted"); navigate({ to: "/dashboard" }); } })}
          >
            Delete event
          </ConfirmButton>
        </div>
      </section>
    </div>
  );
}
