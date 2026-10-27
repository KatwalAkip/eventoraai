import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/AppShell";
import { EventForm } from "@/components/event/EventForm";
import { createEventWithDefaults, useInvalidate } from "@/lib/queries";
import type { EventFormValues } from "@/lib/validation";

export const Route = createFileRoute("/_authenticated/events/new")({
  head: () => ({ meta: [{ title: "New event — Eventora AI" }, { name: "description", content: "Create a new event in a few guided steps." }, { property: "og:title", content: "New event — Eventora AI" }, { property: "og:description", content: "Create a new event plan." }] }),
  component: NewEvent,
});

function NewEvent() {
  const navigate = useNavigate();
  const inv = useInvalidate();
  const m = useMutation({
    mutationFn: ({ v, draft }: { v: EventFormValues; draft: boolean }) => createEventWithDefaults(v, { status: draft ? "draft" : "planning" }),
    onSuccess: async (ev, { draft }) => {
      await inv(["dashboard"], ["events"]);
      toast.success(draft ? "Draft saved" : "Event created — let's build your plan");
      navigate({ to: "/events/$eventId", params: { eventId: ev.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Create an event" description="Four quick steps. Required fields are marked *." />
      <div className="rounded-2xl border bg-card p-6 shadow-card">
        <EventForm busy={m.isPending} onSubmit={(v, { draft }) => m.mutate({ v, draft })} />
      </div>
    </div>
  );
}
