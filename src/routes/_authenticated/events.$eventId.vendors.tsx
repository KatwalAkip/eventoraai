import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { VendorManager } from "@/components/vendors/VendorManager";
import { eventQuery, useRowMutations, vendorsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/events/$eventId/vendors")({
  head: () => ({ meta: [{ title: "Vendors — Eventora AI" }, { name: "description", content: "Track vendors, bookings and payments." }, { property: "og:title", content: "Vendors — Eventora AI" }, { property: "og:description", content: "Vendor management." }] }),
  component: VendorsPage,
});

function VendorsPage() {
  const { eventId } = Route.useParams();
  const ev = useQuery(eventQuery(eventId));
  const vendors = useQuery(vendorsQuery(eventId));
  const { add, update, remove } = useRowMutations("vendors", eventId);
  if (!ev.data || vendors.isLoading) return <Skeleton className="h-96" aria-busy="true" />;
  return (
    <section aria-labelledby="v-h">
      <h2 id="v-h" className="mb-1 text-xl font-semibold">Vendors</h2>
      <p className="mb-4 text-sm text-muted-foreground">Vendors you add are your own records. Eventora doesn't verify businesses, availability or reviews.</p>
      <VendorManager
        vendors={(vendors.data ?? []).map((v) => ({ ...v, estimated_cost: Number(v.estimated_cost) }))}
        currency={ev.data.currency}
        onAdd={(v) => add.mutate({ ...v, rating: v.rating || null }, { onSuccess: () => toast.success("Vendor added") })}
        onUpdate={(id, patch) => update.mutate({ id, patch }, { onSuccess: () => toast.success("Vendor updated") })}
        onDelete={(id) => remove.mutate(id)}
      />
    </section>
  );
}
