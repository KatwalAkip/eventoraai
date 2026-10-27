import type { Tables } from "@/integrations/supabase/types";

export type EventRow = Tables<"events">;
export type BudgetCategoryRow = Tables<"budget_categories">;
export type TaskRow = Tables<"tasks">;
export type VendorRow = Tables<"vendors">;
export type SavedIdeaRow = Tables<"saved_ideas">;
export type AiPlanRow = Tables<"ai_plans">;

export const EVENT_TYPES = [
  { value: "wedding", label: "Wedding" },
  { value: "birthday", label: "Birthday" },
  { value: "anniversary", label: "Anniversary" },
  { value: "community", label: "Community event" },
  { value: "corporate", label: "Club / college event" },
  { value: "other", label: "Other celebration" },
] as const;
export type EventType = (typeof EVENT_TYPES)[number]["value"];

export const VENDOR_CATEGORIES = [
  { value: "venue", label: "Venue" },
  { value: "catering", label: "Catering" },
  { value: "decoration", label: "Decoration" },
  { value: "photography", label: "Photography" },
  { value: "entertainment", label: "Entertainment" },
  { value: "transport", label: "Transport" },
  { value: "other", label: "Other" },
] as const;
export type VendorCategory = (typeof VENDOR_CATEGORIES)[number]["value"];

export const BOOKING_STATUSES = ["researching", "shortlisted", "booked", "declined"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
export const PAYMENT_STATUSES = ["unpaid", "deposit", "paid"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const TASK_STATUSES = ["todo", "in_progress", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const TASK_PRIORITIES = ["low", "medium", "high"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_PHASES = [
  { value: "planning", label: "Initial planning" },
  { value: "venue", label: "Venue selection" },
  { value: "vendors", label: "Vendor booking" },
  { value: "guests", label: "Invitations & guests" },
  { value: "decor", label: "Decor & catering" },
  { value: "final", label: "Final confirmations" },
  { value: "event_day", label: "Event day" },
  { value: "post_event", label: "Post-event" },
] as const;
export type TaskPhase = (typeof TASK_PHASES)[number]["value"];

export const CURRENCIES = ["USD", "EUR", "GBP", "INR", "AUD", "CAD", "SGD", "AED"] as const;

export function labelFor<T extends readonly { value: string; label: string }[]>(
  list: T,
  value: string,
): string {
  return list.find((i) => i.value === value)?.label ?? value;
}

export function humanize(value: string): string {
  return value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}
