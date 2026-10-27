import { describe, expect, it } from "vitest";
import { PlanParseError, buildDemoPlan, parsePlan, type PlanInput } from "@/lib/plan-schema";
import { parseIdeas, sampleIdeas } from "@/lib/ideas";
import { friendlyAiError } from "@/lib/ai.server";

const input: PlanInput = {
  title: "Maya's 30th", event_type: "birthday", event_date: "2026-08-01", start_time: "18:00", duration_hours: 5,
  location: "Pune", guest_count: 40, total_budget: 3000, currency: "USD", theme: "Retro", colors: "", atmosphere: "",
  food_preferences: "Vegetarian", venue_preference: "outdoor", accessibility: "", special_requests: "",
};

describe("AI plan parsing", () => {
  it("demo plan passes schema validation and uses the user's inputs", () => {
    const demo = buildDemoPlan(input);
    const parsed = parsePlan(demo);
    expect(parsed.themes).toHaveLength(3);
    expect(parsed.summary).toContain("not live AI");
    expect(parsed.themes[0]!.why).toContain("40 guests");
    expect(parsed.schedule[1]!.time).toBe("18:00");
    expect(parsed.contingencies[0]!.plan).toMatch(/tent|indoor/i);
    expect(parsed.budget.reduce((s, b) => s + b.percent, 0)).toBe(100);
  });
  it("parses JSON strings, including fenced code blocks", () => {
    const json = "```json\n" + JSON.stringify(buildDemoPlan(input)) + "\n```";
    expect(parsePlan(json).themes).toHaveLength(3);
  });
  it("rejects malformed JSON and wrong shapes", () => {
    expect(() => parsePlan("{not json")).toThrow(PlanParseError);
    expect(() => parsePlan({ summary: "x" })).toThrow(PlanParseError);
  });
  it("clamps out-of-range numbers and trims to limits", () => {
    const demo = buildDemoPlan(input);
    demo.budget[0]!.percent = 450;
    demo.milestones[0]!.weeksBefore = 999;
    demo.themes.push({ name: "Extra", description: "", why: "" });
    const p = parsePlan(demo);
    expect(p.budget[0]!.percent).toBe(100);
    expect(p.milestones[0]!.weeksBefore).toBe(52);
    expect(p.themes).toHaveLength(3);
  });
  it("fails when themes or budget are missing", () => {
    const demo = buildDemoPlan(input);
    expect(() => parsePlan({ ...demo, themes: [] })).toThrow(/missing/);
  });
});

describe("ideas", () => {
  it("filters sample ideas by budget and eco preference", () => {
    const low = sampleIdeas({ eventType: "birthday", focus: "all", budget: "low", ecoOnly: true });
    expect(low.length).toBeGreaterThan(0);
    expect(low.every((i) => i.lowBudget && i.ecoFriendly)).toBe(true);
  });
  it("validates AI idea output", () => {
    expect(() => parseIdeas({ ideas: [{ title: "x" }] })).toThrow();
    const ok = parseIdeas({ ideas: [{ title: " Picnic ", description: "d", category: "Activities", estimatedCost: "Low", lowBudget: true, ecoFriendly: true }] });
    expect(ok[0]).toMatchObject({ title: "Picnic", category: "activities" });
  });
});

describe("AI error handling", () => {
  it("maps statuses to helpful messages without leaking details", () => {
    expect(friendlyAiError(429)).toMatch(/busy/);
    expect(friendlyAiError(402)).toMatch(/credits/);
    expect(friendlyAiError(500)).not.toMatch(/stack|key/i);
  });
});
