import { z } from "zod";

/** Strict-schema-friendly shape: every field required, no numeric bounds (clamped in code). */
export const eventPlanSchema = z.object({
  summary: z.string(),
  themes: z.array(z.object({ name: z.string(), description: z.string(), why: z.string() })),
  schedule: z.array(z.object({ time: z.string(), activity: z.string() })),
  budget: z.array(z.object({ category: z.string(), percent: z.number(), why: z.string() })),
  vendors: z.array(z.object({ category: z.string(), requirement: z.string() })),
  ideas: z.object({
    decoration: z.array(z.string()),
    catering: z.array(z.string()),
    entertainment: z.array(z.string()),
    activities: z.array(z.string()),
  }),
  guestManagement: z.array(z.string()),
  milestones: z.array(z.object({ title: z.string(), weeksBefore: z.number() })),
  contingencies: z.array(z.object({ risk: z.string(), plan: z.string() })),
});
export type EventPlan = z.infer<typeof eventPlanSchema>;

export const PLAN_SECTIONS = [
  "themes",
  "schedule",
  "budget",
  "vendors",
  "ideas",
  "guestManagement",
  "milestones",
  "contingencies",
] as const;
export type PlanSection = (typeof PLAN_SECTIONS)[number];

const clean = (s: string, max = 600) =>
  s.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);

/** Validate + normalize untrusted model output. Throws PlanParseError on failure. */
export class PlanParseError extends Error {}

export function parsePlan(input: unknown): EventPlan {
  let value = input;
  if (typeof input === "string") {
    const trimmed = input.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
    try {
      value = JSON.parse(trimmed);
    } catch {
      throw new PlanParseError("The AI response was not valid JSON.");
    }
  }
  const res = eventPlanSchema.safeParse(value);
  if (!res.success) throw new PlanParseError("The AI response did not match the plan format.");
  const p = res.data;
  const list = (a: string[], n = 6) => a.map((s) => clean(s, 300)).filter(Boolean).slice(0, n);
  const budget = p.budget
    .map((b) => ({
      category: clean(b.category, 40),
      percent: Math.max(0, Math.min(100, Math.round(Number(b.percent) || 0))),
      why: clean(b.why, 300),
    }))
    .filter((b) => b.category)
    .slice(0, 10);
  const plan: EventPlan = {
    summary: clean(p.summary, 800),
    themes: p.themes
      .map((t) => ({ name: clean(t.name, 80), description: clean(t.description), why: clean(t.why, 300) }))
      .filter((t) => t.name)
      .slice(0, 3),
    schedule: p.schedule
      .map((s) => ({ time: clean(s.time, 20), activity: clean(s.activity, 200) }))
      .filter((s) => s.activity)
      .slice(0, 16),
    budget,
    vendors: p.vendors
      .map((v) => ({ category: clean(v.category, 40), requirement: clean(v.requirement, 300) }))
      .filter((v) => v.category)
      .slice(0, 10),
    ideas: {
      decoration: list(p.ideas.decoration),
      catering: list(p.ideas.catering),
      entertainment: list(p.ideas.entertainment),
      activities: list(p.ideas.activities),
    },
    guestManagement: list(p.guestManagement, 8),
    milestones: p.milestones
      .map((m) => ({ title: clean(m.title, 160), weeksBefore: Math.max(-4, Math.min(52, Math.round(Number(m.weeksBefore) || 0))) }))
      .filter((m) => m.title)
      .slice(0, 14),
    contingencies: p.contingencies
      .map((c) => ({ risk: clean(c.risk, 120), plan: clean(c.plan, 300) }))
      .filter((c) => c.risk)
      .slice(0, 6),
  };
  if (plan.themes.length === 0 || plan.budget.length === 0)
    throw new PlanParseError("The AI response was missing themes or budget.");
  return plan;
}

export interface PlanInput {
  title: string;
  event_type: string;
  event_date: string;
  start_time: string | null;
  duration_hours: number;
  location: string;
  guest_count: number;
  total_budget: number;
  currency: string;
  theme: string;
  colors: string;
  atmosphere: string;
  food_preferences: string;
  venue_preference: string;
  accessibility: string;
  special_requests: string;
}

const THEMES: Record<string, { name: string; description: string }[]> = {
  wedding: [
    { name: "Garden Romance", description: "Soft florals, linen and candlelight with an open-air ceremony feel." },
    { name: "Modern Heritage", description: "Family traditions reinterpreted with clean, contemporary styling." },
    { name: "Intimate Supper Club", description: "Long tables, a curated menu and storytelling toasts." },
  ],
  birthday: [
    { name: "Retro Arcade Night", description: "Neon accents, classic games and a playlist from the guest of honour's favourite decade." },
    { name: "Picnic in the Park", description: "Blankets, lawn games and a grazing table for a relaxed daytime party." },
    { name: "Mystery Dinner", description: "Guests receive characters and solve a light-hearted mystery over dinner." },
  ],
  community: [
    { name: "Neighbourhood Fair", description: "Stalls from local makers, food trucks and family activities." },
    { name: "Cultural Showcase", description: "Performances, food and crafts celebrating the community's heritage." },
    { name: "Green Day Out", description: "Tree planting, upcycling workshops and a zero-waste potluck." },
  ],
};

/** Deterministic, clearly-labelled sample plan used when live AI is unavailable. */
export function buildDemoPlan(e: PlanInput): EventPlan {
  const themes = (THEMES[e.event_type] ?? THEMES.birthday).map((t) => ({
    ...t,
    why: `Fits ${e.guest_count} guests${e.theme ? ` and your "${e.theme}" preference` : ""} within a ${e.currency} ${Math.round(e.total_budget).toLocaleString("en-US")} budget.`,
  }));
  const start = e.start_time || "17:00";
  const [h, m] = start.split(":").map(Number);
  const at = (offsetMin: number) => {
    const t = (h ?? 17) * 60 + (m ?? 0) + offsetMin;
    return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
  };
  const durMin = Math.max(60, Math.round(e.duration_hours * 60));
  return {
    summary: `Sample plan for "${e.title}" — a ${e.event_type} for ${e.guest_count} guests in ${e.location || "your chosen city"}. Generated from built-in templates, not live AI.`,
    themes,
    schedule: [
      { time: at(-120), activity: "Vendor set-up and venue walkthrough" },
      { time: at(0), activity: "Guests arrive — welcome drinks" },
      { time: at(Math.round(durMin * 0.25)), activity: "Main programme / ceremony" },
      { time: at(Math.round(durMin * 0.5)), activity: "Meal service" },
      { time: at(Math.round(durMin * 0.75)), activity: "Entertainment and activities" },
      { time: at(durMin), activity: "Closing and send-off" },
    ],
    budget: [
      { category: "Venue", percent: 30, why: "Usually the largest fixed cost; book early." },
      { category: "Catering", percent: 30, why: `Scales with ${e.guest_count} guests and dietary needs.` },
      { category: "Decoration", percent: 10, why: "Theme-driven; reuse items to save." },
      { category: "Photography", percent: 8, why: "Captures the event for guests who can't attend." },
      { category: "Entertainment", percent: 8, why: "Keeps energy up between programme moments." },
      { category: "Transport", percent: 4, why: "Guest shuttles or vendor logistics." },
      { category: "Contingency", percent: 10, why: "Reserve for surprises and price changes." },
    ],
    vendors: [
      { category: "Venue", requirement: `${e.venue_preference === "either" ? "Indoor or outdoor" : e.venue_preference} space for ${e.guest_count}${e.accessibility ? `, ${e.accessibility}` : ", step-free access"}` },
      { category: "Catering", requirement: e.food_preferences || "Menu covering vegetarian and common allergens" },
      { category: "Decoration", requirement: `Styling in ${e.colors || "your chosen palette"}` },
      { category: "Photography", requirement: `${Math.ceil(e.duration_hours)}-hour coverage` },
    ],
    ideas: {
      decoration: ["Statement entrance arch", "Table numbers that tell a story", "Fairy-light canopy"],
      catering: ["Interactive food station", "Signature drink named for the host", "Late-night snack bar"],
      entertainment: ["Live acoustic set", "Photo booth with props", "Curated playlist by guests"],
      activities: ["Guest memory wall", "Short toasts segment", "Group photo moment"],
    },
    guestManagement: [
      "Send save-the-dates 6–8 weeks ahead with an RSVP deadline.",
      "Collect dietary and accessibility needs on the RSVP form.",
      "Assign a point person to greet and guide guests on the day.",
    ],
    milestones: [
      { title: "Lock budget and guest list", weeksBefore: 10 },
      { title: "Book venue", weeksBefore: 8 },
      { title: "Book caterer and photographer", weeksBefore: 6 },
      { title: "Send invitations", weeksBefore: 5 },
      { title: "Final headcount to caterer", weeksBefore: 1 },
    ],
    contingencies: [
      { risk: "Bad weather", plan: e.venue_preference === "outdoor" ? "Reserve a tent or indoor backup space." : "Arrange covered arrival area and umbrellas." },
      { risk: "Vendor delay", plan: "Confirm arrival times 48 hours before and keep backup contacts." },
      { risk: "Unexpected costs", plan: "Hold the contingency line untouched until the final week." },
    ],
  };
}

export function planPrompt(e: PlanInput): string {
  return [
    "Create a practical, personalized event plan. Use only the details below; do not invent vendor names, prices quotes, reviews or availability.",
    `Title: ${e.title}`,
    `Type: ${e.event_type}`,
    `Date: ${e.event_date}${e.start_time ? ` at ${e.start_time}` : ""}, duration ${e.duration_hours} hours`,
    `Location preference: ${e.location}`,
    `Guests: ${e.guest_count}`,
    `Budget: ${e.total_budget} ${e.currency}`,
    `Theme: ${e.theme || "open"}; colors: ${e.colors || "open"}; atmosphere: ${e.atmosphere || "open"}`,
    `Food/dietary: ${e.food_preferences || "none specified"}`,
    `Venue: ${e.venue_preference}`,
    `Accessibility: ${e.accessibility || "none specified"}`,
    `Special/cultural requests: ${e.special_requests || "none"}`,
    "Return exactly 3 themes, 5-10 schedule items (HH:MM times), 5-8 budget categories whose percents sum to 100 (include Contingency), 4-6 vendor requirements, 3-5 items per idea list, 3-5 guest management tips, 5-8 milestones (weeksBefore as integer weeks before the event), and 3 contingencies covering bad weather, delays and unexpected costs. Each 'why' explains briefly how it fits the user's preferences and budget. Keep text concise.",
  ].join("\n");
}
