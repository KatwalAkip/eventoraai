import { z } from "zod";
import { CURRENCIES } from "./types";

export const eventFormSchema = z.object({
  title: z.string().trim().min(2, "Give your event a name (at least 2 characters)").max(120, "Keep the name under 120 characters"),
  event_type: z.enum(["wedding", "birthday", "anniversary", "community", "corporate", "other"], {
    errorMap: () => ({ message: "Choose an event type" }),
  }),
  event_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the event date"),
  start_time: z.string().regex(/^(\d{2}:\d{2})?$/, "Use HH:MM").optional().default(""),
  duration_hours: z.coerce
    .number({ invalid_type_error: "Enter the duration in hours" })
    .positive("Duration must be more than 0 hours")
    .max(240, "Duration can't exceed 240 hours"),
  location: z.string().trim().min(2, "Add a city or venue preference").max(200),
  guest_count: z.coerce
    .number({ invalid_type_error: "Enter the number of guests" })
    .int("Guests must be a whole number")
    .min(1, "At least 1 guest")
    .max(100000, "That's more than 100,000 guests"),
  total_budget: z.coerce
    .number({ invalid_type_error: "Enter a budget amount" })
    .min(0, "Budget can't be negative")
    .max(1_000_000_000, "Budget is too large"),
  currency: z.enum(CURRENCIES),
  contingency_pct: z.coerce.number().min(0, "Minimum 0%").max(50, "Maximum 50%"),
  theme: z.string().trim().max(200).default(""),
  colors: z.string().trim().max(200).default(""),
  atmosphere: z.string().trim().max(200).default(""),
  food_preferences: z.string().trim().max(500).default(""),
  venue_preference: z.enum(["indoor", "outdoor", "either"]),
  accessibility: z.string().trim().max(500).default(""),
  special_requests: z.string().trim().max(1000).default(""),
});

export type EventFormValues = z.infer<typeof eventFormSchema>;

export const emptyEventForm: EventFormValues = {
  title: "",
  event_type: "birthday",
  event_date: "",
  start_time: "",
  duration_hours: 4,
  location: "",
  guest_count: 50,
  total_budget: 0,
  currency: "USD",
  contingency_pct: 10,
  theme: "",
  colors: "",
  atmosphere: "",
  food_preferences: "",
  venue_preference: "either",
  accessibility: "",
  special_requests: "",
};

export const vendorFormSchema = z.object({
  name: z.string().trim().min(1, "Vendor name is required").max(120),
  category: z.enum(["venue", "catering", "decoration", "photography", "entertainment", "transport", "other"]),
  contact: z.string().trim().max(200).default(""),
  estimated_cost: z.coerce.number({ invalid_type_error: "Enter a cost" }).min(0, "Cost can't be negative"),
  booking_status: z.enum(["researching", "shortlisted", "booked", "declined"]),
  payment_status: z.enum(["unpaid", "deposit", "paid"]),
  rating: z.coerce.number().int().min(0).max(5).default(0),
  notes: z.string().trim().max(1000).default(""),
});
export type VendorFormValues = z.infer<typeof vendorFormSchema>;

export const taskFormSchema = z.object({
  title: z.string().trim().min(1, "Task title is required").max(200),
  phase: z.string().min(1),
  due_date: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Invalid date").default(""),
  priority: z.enum(["low", "medium", "high"]),
});
export type TaskFormValues = z.infer<typeof taskFormSchema>;
