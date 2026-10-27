import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BudgetEditor } from "@/components/budget/BudgetEditor";
import { budgetQuery, eventQuery, useRowMutations, useUpdateEvent } from "@/lib/queries";
import { budgetCsv, downloadText, slug } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/events/$eventId/budget")({
  head: () => ({ meta: [{ title: "Budget — Eventora AI" }, { name: "description", content: "Allocate and track your event budget." }, { property: "og:title", content: "Budget — Eventora AI" }, { property: "og:description", content: "Event budget dashboard." }] }),
  component: BudgetPage,
});

function BudgetPage() {
  const { eventId } = Route.useParams();
  const ev = useQuery(eventQuery(eventId));
  const lines = useQuery(budgetQuery(eventId));
  const { add, update, remove } = useRowMutations("budget_categories", eventId);
  const updEvent = useUpdateEvent(eventId);
  if (!ev.data || lines.isLoading) return <Skeleton className="h-96" aria-busy="true" />;
  const rows = (lines.data ?? []).map((l) => ({ ...l, allocated: Number(l.allocated), spent: Number(l.spent) }));
  return (
    <section aria-labelledby="budget-h">
      <div className="mb-4 flex items-center justify-between">
        <h2 id="budget-h" className="text-xl font-semibold">Budget</h2>
        <Button variant="outline" size="sm" onClick={() => { downloadText(`${slug(ev.data.title)}-budget.csv`, budgetCsv(rows, ev.data.currency)); toast.success("Budget CSV downloaded"); }} disabled={!rows.length}>
          <Download /> Export CSV
        </Button>
      </div>
      <BudgetEditor
        total={Number(ev.data.total_budget)}
        currency={ev.data.currency}
        contingencyPct={Number(ev.data.contingency_pct)}
        lines={rows}
        onChangeLine={(id, patch) => update.mutate({ id, patch })}
        onAddLine={(name) => add.mutate({ name, allocated: 0, spent: 0, position: rows.length })}
        onDeleteLine={(id) => remove.mutate(id)}
        onChangeTotal={(n) => updEvent.mutate({ total_budget: n })}
        onChangeContingency={(n) => updEvent.mutate({ contingency_pct: n })}
      />
    </section>
  );
}
