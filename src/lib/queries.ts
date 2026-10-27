import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { DEFAULT_SPLIT, allocateByPercent } from "./budget";
import { generateTasks, todayIso, addDays } from "./timeline";
import type { EventFormValues } from "./validation";
import type { EventPlan } from "./plan-schema";

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): NonNullable<T> {
  if (res.error) throw new Error(res.error.message);
  if (res.data == null) throw new Error("Not found");
  return res.data as NonNullable<T>;
}

export const eventsQuery = () =>
  queryOptions({
    queryKey: ["events"],
    queryFn: async () =>
      unwrap(await supabase.from("events").select("*").order("event_date", { ascending: true }).limit(100)),
  });

export const dashboardQuery = () =>
  queryOptions({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [events, budget, tasks, vendors] = await Promise.all([
        supabase.from("events").select("*").order("event_date").limit(100),
        supabase.from("budget_categories").select("event_id, allocated, spent").limit(1000),
        supabase.from("tasks").select("id, event_id, title, due_date, status, priority").limit(1000),
        supabase.from("vendors").select("event_id, booking_status").limit(1000),
      ]);
      return {
        events: unwrap(events),
        budget: unwrap(budget),
        tasks: unwrap(tasks),
        vendors: unwrap(vendors),
      };
    },
  });

export const eventQuery = (id: string) =>
  queryOptions({
    queryKey: ["event", id],
    queryFn: async () => {
      const res = await supabase.from("events").select("*").eq("id", id).maybeSingle();
      if (res.error) throw new Error(res.error.message);
      if (!res.data) throw new Error("Event not found");
      return res.data;
    },
  });

export const budgetQuery = (eventId: string) =>
  queryOptions({
    queryKey: ["budget", eventId],
    queryFn: async () =>
      unwrap(await supabase.from("budget_categories").select("*").eq("event_id", eventId).order("position")),
  });

export const tasksQuery = (eventId: string) =>
  queryOptions({
    queryKey: ["tasks", eventId],
    queryFn: async () =>
      unwrap(await supabase.from("tasks").select("*").eq("event_id", eventId).order("position")),
  });

export const vendorsQuery = (eventId: string) =>
  queryOptions({
    queryKey: ["vendors", eventId],
    queryFn: async () =>
      unwrap(await supabase.from("vendors").select("*").eq("event_id", eventId).order("created_at")),
  });

export const planQuery = (eventId: string) =>
  queryOptions({
    queryKey: ["plan", eventId],
    queryFn: async () =>
{
      const res = await supabase
        .from("ai_plans")
        .select("*")
        .eq("event_id", eventId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
  });

export const savedIdeasQuery = () =>
  queryOptions({
    queryKey: ["ideas"],
    queryFn: async () =>
      unwrap(await supabase.from("saved_ideas").select("*").order("created_at", { ascending: false }).limit(200)),
  });

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("You need to be signed in.");
  return data.user.id;
}

/** Create an event plus a default budget split and suggested timeline. */
export async function createEventWithDefaults(values: EventFormValues, opts: { isSample?: boolean; status?: "draft" | "planning" } = {}) {
  const user_id = await currentUserId();
  const event = unwrap(
    await supabase
      .from("events")
      .insert({ ...values, start_time: values.start_time || null, user_id, is_sample: !!opts.isSample, status: opts.status ?? "planning" } as TablesInsert<"events">)
      .select()
      .single(),
  );
  const cats = allocateByPercent(values.total_budget, DEFAULT_SPLIT).map((c, i) => ({
    event_id: event.id,
    user_id,
    name: c.name,
    allocated: c.allocated,
    spent: 0,
    position: i,
  }));
  const tasks = generateTasks(values.event_date, todayIso()).map((t) => ({ ...t, event_id: event.id, user_id }));
  unwrap(await supabase.from("budget_categories").insert(cats).select("id"));
  unwrap(await supabase.from("tasks").insert(tasks).select("id"));
  return event;
}

export async function createSampleEvent() {
  const user_id = await currentUserId();
  const date = addDays(todayIso(), 60);
  const event = await createEventWithDefaults(
    {
      title: "Sample: Maya's 30th Birthday",
      event_type: "birthday",
      event_date: date,
      start_time: "18:00",
      duration_hours: 5,
      location: "Rooftop venue, downtown",
      guest_count: 40,
      total_budget: 3000,
      currency: "USD",
      contingency_pct: 10,
      theme: "Retro 90s",
      colors: "Teal, violet, gold",
      atmosphere: "Lively and nostalgic",
      food_preferences: "Vegetarian options, one nut allergy",
      venue_preference: "indoor",
      accessibility: "Step-free access",
      special_requests: "Surprise video from family abroad",
    },
    { isSample: true },
  );
  const sampleVendors: TablesInsert<"vendors">[] = [
    { name: "Sample Rooftop Hall", category: "venue", estimated_cost: 900, booking_status: "booked", payment_status: "deposit", rating: 4, contact: "sample@example.com", notes: "Sample data — not a real business." },
    { name: "Sample Street Bites Catering", category: "catering", estimated_cost: 950, booking_status: "shortlisted", payment_status: "unpaid", rating: 5, contact: "", notes: "Sample data — not a real business." },
    { name: "Sample Snapshots Studio", category: "photography", estimated_cost: 300, booking_status: "researching", payment_status: "unpaid", rating: null, contact: "", notes: "Sample data — not a real business." },
  ].map((v) => ({ ...v, event_id: event.id, user_id, is_sample: true }));
  unwrap(await supabase.from("vendors").insert(sampleVendors).select("id"));
  return event;
}

export function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: unknown[][]) => Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: k })));
}

function onErr(e: Error) {
  toast.error(e.message || "Something went wrong");
}

export function useUpdateEvent(id: string) {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (patch: TablesUpdate<"events">) =>
      unwrap(await supabase.from("events").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id).select().single()),
    onSuccess: () => inv(["event", id], ["events"], ["dashboard"]),
    onError: onErr,
  });
}

export function useDeleteEvent() {
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from("events").delete().eq("id", id).select("id")),
    onSuccess: () => inv(["events"], ["dashboard"]),
    onError: onErr,
  });
}

type Table = "budget_categories" | "tasks" | "vendors";
const keyFor: Record<Table, string> = { budget_categories: "budget", tasks: "tasks", vendors: "vendors" };

export function useRowMutations<T extends Table>(table: T, eventId: string) {
  const inv = useInvalidate();
  const refresh = () => inv([keyFor[table], eventId], ["dashboard"]);
  const add = useMutation({
    mutationFn: async (row: Omit<TablesInsert<T>, "event_id" | "user_id">) => {
      const user_id = await currentUserId();
      return unwrap(
        await supabase
          .from(table)
          .insert({ ...row, event_id: eventId, user_id } as never)
          .select()
          .single(),
      );
    },
    onSuccess: refresh,
    onError: onErr,
  });
  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<T> }) =>
      unwrap(await supabase.from(table).update(patch as never).eq("id" as never, id as never).select().single()),
    onSuccess: refresh,
    onError: onErr,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from(table).delete().eq("id" as never, id as never).select("id")),
    onSuccess: refresh,
    onError: onErr,
  });
  return { add, update, remove };
}

export async function savePlan(eventId: string, plan: EventPlan, source: "ai" | "demo") {
  const user_id = await currentUserId();
  await supabase.from("ai_plans").delete().eq("event_id", eventId);
  return unwrap(
    await supabase.from("ai_plans").insert({ event_id: eventId, user_id, plan, source }).select().single(),
  );
}
