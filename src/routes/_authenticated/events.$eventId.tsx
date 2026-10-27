import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { eventQuery } from "@/lib/queries";
import { EVENT_TYPES, labelFor } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/events/$eventId")({
  head: () => ({ meta: [{ title: "Event — Eventora AI" }, { name: "description", content: "Your event plan, budget, timeline and vendors." }, { property: "og:title", content: "Event — Eventora AI" }, { property: "og:description", content: "Event workspace." }] }),
  component: EventLayout,
});

const TABS = [
  { to: "/events/$eventId", label: "Plan", exact: true },
  { to: "/events/$eventId/budget", label: "Budget" },
  { to: "/events/$eventId/timeline", label: "Timeline" },
  { to: "/events/$eventId/vendors", label: "Vendors" },
  { to: "/events/$eventId/settings", label: "Details & settings" },
] as const;

function EventLayout() {
  const { eventId } = Route.useParams();
  const { data: event, isLoading, error } = useQuery(eventQuery(eventId));
  if (isLoading) return <div className="space-y-3" aria-busy="true"><Skeleton className="h-10 w-80" /><Skeleton className="h-8 w-full" /><Skeleton className="h-64" /></div>;
  if (error || !event)
    return <div role="alert" className="rounded-lg border p-6">This event couldn't be found. <Button asChild variant="link"><Link to="/dashboard">Back to dashboard</Link></Button></div>;
  return (
    <div>
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">{labelFor(EVENT_TYPES, event.event_type)} · {event.event_date} · {event.guest_count} guests · {event.location}</p>
        <h1 className="mt-1 flex flex-wrap items-center gap-2 text-3xl font-semibold">
          {event.title}
          {event.is_sample && <Badge variant="outline">Sample data</Badge>}
          {event.status === "draft" && <Badge variant="secondary">Draft</Badge>}
        </h1>
      </div>
      <nav aria-label="Event sections" className="no-print -mx-1 mb-6 flex gap-1 overflow-x-auto border-b">
        {TABS.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            params={{ eventId }}
            activeOptions={{ exact: "exact" in t }}
            className="whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            activeProps={{ className: "border-primary text-foreground", "aria-current": "page" }}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
