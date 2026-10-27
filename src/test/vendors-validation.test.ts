import { describe, expect, it } from "vitest";
import { bookingProgress, cheapestPerCategory, filterVendors } from "@/lib/vendors";
import { emptyEventForm, eventFormSchema, vendorFormSchema } from "@/lib/validation";
import { csvEscape, tasksCsv } from "@/lib/export";

const v = (name: string, category: string, cost: number, status = "shortlisted", rating: number | null = null) => ({
  name, category, estimated_cost: cost, booking_status: status, rating, contact: "", notes: "",
});

describe("vendor filtering and sorting", () => {
  const list = [v("Zed Hall", "venue", 900, "booked", 3), v("Alpha Foods", "catering", 500, "shortlisted", 5), v("Bee Photos", "photography", 300, "declined")];
  it("filters by category and query", () => {
    expect(filterVendors(list, { category: "venue" }).map((x) => x.name)).toEqual(["Zed Hall"]);
    expect(filterVendors(list, { query: "foods" })).toHaveLength(1);
  });
  it("sorts by name, cost and rating", () => {
    expect(filterVendors(list, { sort: "name" }).map((x) => x.name)).toEqual(["Alpha Foods", "Bee Photos", "Zed Hall"]);
    expect(filterVendors(list, { sort: "cost_asc" }).map((x) => x.estimated_cost)).toEqual([300, 500, 900]);
    expect(filterVendors(list, { sort: "cost_desc" })[0]!.name).toBe("Zed Hall");
    expect(filterVendors(list, { sort: "rating" })[0]!.name).toBe("Alpha Foods");
  });
  it("counts booking progress excluding declined vendors", () => {
    expect(bookingProgress(list)).toEqual({ booked: 1, total: 2, pct: 50 });
  });
  it("finds the cheapest non-declined vendor per category", () => {
    const c = cheapestPerCategory([...list, v("Cheap Hall", "venue", 400)]);
    expect(c["venue"]!.name).toBe("Cheap Hall");
    expect(c["photography"]).toBeUndefined();
  });
});

describe("form validation", () => {
  const valid = { ...emptyEventForm, title: "Maya's 30th", event_date: "2026-08-01", location: "Pune", guest_count: 40, total_budget: 3000 };
  it("accepts a complete birthday event", () => {
    expect(eventFormSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects missing title, zero guests and negative budget with helpful messages", () => {
    const r = eventFormSchema.safeParse({ ...valid, title: "", guest_count: 0, total_budget: -1 });
    expect(r.success).toBe(false);
    const errs = r.success ? {} : r.error.flatten().fieldErrors;
    expect(errs.title?.[0]).toMatch(/name/i);
    expect(errs.guest_count?.[0]).toMatch(/at least 1/i);
    expect(errs.total_budget?.[0]).toMatch(/negative/i);
  });
  it("rejects a vendor without a name or with a negative cost", () => {
    const r = vendorFormSchema.safeParse({ name: " ", category: "venue", estimated_cost: -5, booking_status: "booked", payment_status: "paid" });
    expect(r.success).toBe(false);
  });
});

describe("CSV export", () => {
  it("escapes quotes, commas and blocks formula injection", () => {
    expect(csvEscape('a,"b"')).toBe('"a,""b"""');
    expect(csvEscape("=SUM(A1)")).toBe("'=SUM(A1)");
  });
  it("builds a task CSV with headers", () => {
    const csv = tasksCsv([{ title: "Book venue", phase: "venue", due_date: null, priority: "high", status: "done" }]);
    expect(csv.split("\r\n")).toEqual(["Task,Phase,Due date,Priority,Status", "Book venue,venue,,high,done"]);
  });
});
