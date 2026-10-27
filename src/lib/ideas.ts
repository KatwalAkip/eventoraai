import { z } from "zod";

export const ideaSchema = z.object({
  title: z.string(),
  description: z.string(),
  category: z.string(),
  estimatedCost: z.string(),
  lowBudget: z.boolean(),
  ecoFriendly: z.boolean(),
});
export const ideasResponseSchema = z.object({ ideas: z.array(ideaSchema) });
export type Idea = z.infer<typeof ideaSchema>;

export interface IdeaFilters {
  eventType: string;
  focus: string;
  budget: "low" | "medium" | "high";
  audience: string;
  theme: string;
  location: string;
  ecoOnly: boolean;
}

export const IDEA_FOCUS = [
  "themes",
  "ceremony",
  "activities",
  "decorations",
  "invitations",
  "menu",
  "entertainment",
] as const;

const LIB: (Idea & { types: string[] })[] = [
  { title: "Wildflower aisle in reusable pots", description: "Line the aisle with potted wildflowers guests can take home afterwards.", category: "decorations", estimatedCost: "Low", lowBudget: true, ecoFriendly: true, types: ["wedding", "anniversary"] },
  { title: "Handfasting ceremony", description: "A short ribbon-binding ritual where family members each tie a ribbon.", category: "ceremony", estimatedCost: "Low", lowBudget: true, ecoFriendly: true, types: ["wedding"] },
  { title: "Story-of-us slideshow", description: "Photos from friends and family set to the couple's favourite songs.", category: "entertainment", estimatedCost: "Free", lowBudget: true, ecoFriendly: true, types: ["wedding", "anniversary", "birthday"] },
  { title: "Regional street-food stalls", description: "Two or three stalls serving local specialities instead of a plated dinner.", category: "menu", estimatedCost: "Medium", lowBudget: false, ecoFriendly: false, types: ["wedding", "community", "birthday"] },
  { title: "Digital RSVP invitations", description: "Animated e-invites with an RSVP form for dietary needs.", category: "invitations", estimatedCost: "Free", lowBudget: true, ecoFriendly: true, types: ["wedding", "birthday", "anniversary", "community", "corporate", "other"] },
  { title: "Seed-paper invitations", description: "Printed invites that guests can plant afterwards.", category: "invitations", estimatedCost: "Medium", lowBudget: false, ecoFriendly: true, types: ["wedding", "birthday", "anniversary"] },
  { title: "Decade throwback party", description: "Guests dress from the birth year of the guest of honour; music and snacks to match.", category: "themes", estimatedCost: "Low", lowBudget: true, ecoFriendly: false, types: ["birthday"] },
  { title: "DIY pizza bar", description: "Pre-made bases with toppings so guests build their own.", category: "menu", estimatedCost: "Low", lowBudget: true, ecoFriendly: false, types: ["birthday", "community", "corporate"] },
  { title: "Scavenger hunt", description: "Clue cards hidden around the venue leading to a small prize.", category: "activities", estimatedCost: "Free", lowBudget: true, ecoFriendly: true, types: ["birthday", "community", "corporate"] },
  { title: "Karaoke corner", description: "A rented speaker and mic with a projected lyrics screen.", category: "entertainment", estimatedCost: "Low", lowBudget: true, ecoFriendly: false, types: ["birthday", "corporate", "community"] },
  { title: "Community potluck", description: "Each household brings a dish from their heritage with a recipe card.", category: "menu", estimatedCost: "Free", lowBudget: true, ecoFriendly: true, types: ["community"] },
  { title: "Skill-swap stations", description: "Neighbours host 15-minute mini workshops — knitting, coding, cooking.", category: "activities", estimatedCost: "Free", lowBudget: true, ecoFriendly: true, types: ["community", "corporate"] },
  { title: "Cultural performance hour", description: "Local dance or music groups perform short sets.", category: "entertainment", estimatedCost: "Medium", lowBudget: false, ecoFriendly: true, types: ["community", "wedding"] },
  { title: "Upcycled bunting", description: "Bunting made from donated fabric scraps in a workshop before the event.", category: "decorations", estimatedCost: "Free", lowBudget: true, ecoFriendly: true, types: ["community", "birthday"] },
  { title: "Candle-lit lantern walk", description: "Guests walk together with paper lanterns to the dinner area.", category: "ceremony", estimatedCost: "Low", lowBudget: true, ecoFriendly: false, types: ["wedding", "anniversary", "community"] },
  { title: "Live portrait artist", description: "An illustrator sketches quick portraits as keepsakes.", category: "entertainment", estimatedCost: "High", lowBudget: false, ecoFriendly: true, types: ["wedding", "birthday", "anniversary", "corporate"] },
  { title: "Hackathon-style challenge", description: "Teams solve a fun brief in 60 minutes, judged by a panel.", category: "activities", estimatedCost: "Free", lowBudget: true, ecoFriendly: true, types: ["corporate"] },
  { title: "Vow renewal moment", description: "A short renewal of vows led by a close friend.", category: "ceremony", estimatedCost: "Free", lowBudget: true, ecoFriendly: true, types: ["anniversary"] },
];

/** Offline sample ideas, clearly labelled as such in the UI. */
export function sampleIdeas(f: Pick<IdeaFilters, "eventType" | "focus" | "budget" | "ecoOnly">): Idea[] {
  return LIB.filter((i) => i.types.includes(f.eventType) || f.eventType === "other")
    .filter((i) => !f.focus || f.focus === "all" || i.category === f.focus)
    .filter((i) => f.budget !== "low" || i.lowBudget)
    .filter((i) => !f.ecoOnly || i.ecoFriendly)
    .map(({ types: _types, ...rest }) => rest);
}

export function parseIdeas(input: unknown): Idea[] {
  const res = ideasResponseSchema.safeParse(input);
  if (!res.success) throw new Error("The AI ideas did not match the expected format.");
  return res.data.ideas
    .map((i) => ({
      ...i,
      title: i.title.trim().slice(0, 160),
      description: i.description.trim().slice(0, 600),
      category: i.category.trim().toLowerCase().slice(0, 40) || "general",
      estimatedCost: i.estimatedCost.trim().slice(0, 40),
    }))
    .filter((i) => i.title)
    .slice(0, 8);
}

export function ideasPrompt(f: IdeaFilters): string {
  return [
    "Suggest 6 practical, original event ideas. Do not invent real businesses or prices; estimatedCost is a rough tier like 'Free', 'Low', 'Medium' or 'High'.",
    `Event type: ${f.eventType}`,
    `Focus: ${f.focus}`,
    `Budget level: ${f.budget}`,
    `Audience: ${f.audience || "mixed ages"}`,
    `Theme: ${f.theme || "open"}`,
    `Location: ${f.location || "unspecified"}`,
    f.ecoOnly ? "Every idea must be eco-friendly." : "Include at least two eco-friendly ideas.",
    "Include at least two low-budget alternatives. category should be one of: themes, ceremony, activities, decorations, invitations, menu, entertainment.",
  ].join("\n");
}
