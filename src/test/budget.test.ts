import { describe, expect, it } from "vitest";
import { allocateByPercent, safeAmount, savingsSuggestions, summarizeBudget } from "@/lib/budget";

describe("budget calculations", () => {
  const lines = [
    { name: "Venue", allocated: 1000, spent: 400 },
    { name: "Catering", allocated: 800, spent: 900 },
  ];

  it("computes totals and remaining balance", () => {
    const s = summarizeBudget(3000, lines, 10);
    expect(s.allocated).toBe(1800);
    expect(s.spent).toBe(1300);
    expect(s.remaining).toBe(1700);
    expect(s.unallocated).toBe(1200);
    expect(s.contingencyReserve).toBe(300);
    expect(s.spendableAfterReserve).toBe(1400);
  });

  it("detects overspent categories and over-allocation", () => {
    const s = summarizeBudget(1500, lines);
    expect(s.overspentCategories).toEqual(["Catering"]);
    expect(s.overAllocated).toBe(true);
    expect(s.overSpent).toBe(false);
  });

  it("recalculates when an expense changes", () => {
    const updated = lines.map((l) => (l.name === "Catering" ? { ...l, spent: 500 } : l));
    const s = summarizeBudget(3000, updated);
    expect(s.spent).toBe(900);
    expect(s.overspentCategories).toEqual([]);
  });

  it("treats negative, empty and invalid inputs as zero", () => {
    expect(safeAmount(-5)).toBe(0);
    expect(safeAmount("")).toBe(0);
    expect(safeAmount("abc")).toBe(0);
    expect(safeAmount("1,250.555")).toBe(1250.56);
    const s = summarizeBudget(Number.NaN, [{ name: "X", allocated: -10, spent: Number.NaN }]);
    expect(s.total).toBe(0);
    expect(s.allocated).toBe(0);
    expect(s.percentSpent).toBe(0);
  });

  it("allocates by percent with cents adding up exactly", () => {
    const rows = allocateByPercent(1000, [
      { name: "A", percent: 33.333 },
      { name: "B", percent: 33.333 },
      { name: "C", percent: 33.334 },
    ]);
    expect(rows.reduce((s, r) => s + r.allocated, 0)).toBeCloseTo(1000, 2);
  });

  it("scales down splits that exceed 100%", () => {
    const rows = allocateByPercent(1000, [
      { name: "A", percent: 100 },
      { name: "B", percent: 100 },
    ]);
    expect(rows.map((r) => r.allocated)).toEqual([500, 500]);
  });

  it("returns zero allocations for a zero budget", () => {
    expect(allocateByPercent(0, [{ name: "A", percent: 50 }])).toEqual([{ name: "A", allocated: 0 }]);
  });

  it("suggests savings when over budget", () => {
    const s = summarizeBudget(1500, lines);
    const tips = savingsSuggestions(s, lines);
    expect(tips.some((t) => t.includes("exceed"))).toBe(true);
    expect(tips.some((t) => t.includes("Catering"))).toBe(true);
  });
});
