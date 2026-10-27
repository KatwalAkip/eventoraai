import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TaskChecklist } from "@/components/timeline/TaskChecklist";
import { eventQuery, tasksQuery, useRowMutations } from "@/lib/queries";
import { daysBetween, reorder, todayIso } from "@/lib/timeline";
import { downloadText, slug, tasksCsv } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/events/$eventId/timeline")({
  head: () => ({ meta: [{ title: "Timeline — Eventora AI" }, { name: "description", content: "Your event checklist and deadlines." }, { property: "og:title", content: "Timeline — Eventora AI" }, { property: "og:description", content: "Event planning checklist." }] }),
  component: TimelinePage,
});

function TimelinePage() {
  const { eventId } = Route.useParams();
  const ev = useQuery(eventQuery(eventId));
  const tasks = useQuery(tasksQuery(eventId));
  const { add, update, remove } = useRowMutations("tasks", eventId);
  if (!ev.data || tasks.isLoading) return <Skeleton className="h-96" aria-busy="true" />;
  const list = tasks.data ?? [];
  const today = todayIso();
  const past = daysBetween(today, ev.data.event_date) < 0;
  return (
    <section aria-labelledby="tl-h">
      <div className="mb-4 flex items-center justify-between">
        <h2 id="tl-h" className="text-xl font-semibold">Timeline & checklist</h2>
        <Button variant="outline" size="sm" disabled={!list.length} onClick={() => { downloadText(`${slug(ev.data.title)}-tasks.csv`, tasksCsv(list)); toast.success("Tasks CSV downloaded"); }}>
          <Download /> Export CSV
        </Button>
      </div>
      {past && <p className="mb-4 rounded-lg bg-muted p-3 text-sm">This event date has passed, so suggested deadlines aren't assigned to pre-event tasks.</p>}
      <TaskChecklist
        tasks={list}
        today={today}
        eventDate={ev.data.event_date}
        onAdd={(t) => add.mutate({ ...t, position: list.length })}
        onUpdate={(id, patch) => update.mutate({ id, patch })}
        onDelete={(id) => remove.mutate(id)}
        onMove={(index, delta) => {
          const before = [...list].sort((a, b) => a.position - b.position);
          const after = reorder(before, index, delta);
          after.forEach((t) => {
            const old = before.find((b) => b.id === t.id);
            if (old && old.position !== t.position) update.mutate({ id: t.id, patch: { position: t.position } });
          });
        }}
      />
    </section>
  );
}
