import { describe, expect, it } from "vitest";
import { addDays, computeDeadline, filterTasks, generateTasks, isOverdue, reorder, taskProgress } from "@/lib/timeline";

const TODAY = "2026-06-01";

describe("deadline calculations", () => {
  it("subtracts the offset from the event date", () => {
    expect(computeDeadline("2026-09-01", 30, TODAY)).toEqual({ dueDate: "2026-08-02", adjusted: false });
  });
  it("moves a deadline that already passed to today", () => {
    expect(computeDeadline("2026-06-10", 30, TODAY)).toEqual({ dueDate: TODAY, adjusted: true });
  });
  it("never assigns pre-event deadlines for a past event", () => {
    expect(computeDeadline("2026-05-01", 10, TODAY)).toEqual({ dueDate: null, adjusted: true });
  });
  it("keeps post-event tasks after the event", () => {
    expect(computeDeadline("2026-05-01", -3, TODAY).dueDate).toBe("2026-05-04");
  });
  it("generates ordered tasks that are never before today", () => {
    const tasks = generateTasks(addDays(TODAY, 20), TODAY);
    expect(tasks.length).toBeGreaterThan(8);
    for (const t of tasks) if (t.due_date) expect(t.due_date >= TODAY).toBe(true);
    const dates = tasks.filter((t) => t.phase !== "post_event").map((t) => t.due_date!);
    expect([...dates].sort()).toEqual(dates);
  });
  it("recalculates when the event date changes", () => {
    const a = generateTasks("2026-12-01", TODAY)[0]!;
    const moved = computeDeadline("2026-12-31", a.offset_days, TODAY).dueDate;
    expect(moved).toBe(addDays(a.due_date!, 30));
  });
});

describe("task filtering and completion", () => {
  const tasks = [
    { title: "Book venue", status: "done", due_date: "2026-05-01", phase: "venue", priority: "high", position: 1 },
    { title: "Send invites", status: "todo", due_date: "2026-05-20", phase: "guests", priority: "high", position: 0 },
    { title: "Order cake", status: "todo", due_date: "2026-07-01", phase: "decor", priority: "low", position: 2 },
  ];
  it("flags overdue only for unfinished tasks", () => {
    expect(isOverdue(tasks[0]!, TODAY)).toBe(false);
    expect(isOverdue(tasks[1]!, TODAY)).toBe(true);
    expect(isOverdue(tasks[2]!, TODAY)).toBe(false);
  });
  it("filters by status, phase and query, sorted by position", () => {
    expect(filterTasks(tasks, { filter: "open" }, TODAY).map((t) => t.title)).toEqual(["Send invites", "Order cake"]);
    expect(filterTasks(tasks, { filter: "done" }, TODAY)).toHaveLength(1);
    expect(filterTasks(tasks, { filter: "overdue" }, TODAY).map((t) => t.title)).toEqual(["Send invites"]);
    expect(filterTasks(tasks, { phase: "decor" }, TODAY).map((t) => t.title)).toEqual(["Order cake"]);
    expect(filterTasks(tasks, { query: "CAKE" }, TODAY)).toHaveLength(1);
  });
  it("computes progress", () => {
    expect(taskProgress(tasks)).toEqual({ done: 1, total: 3, pct: 33 });
    expect(taskProgress([])).toEqual({ done: 0, total: 0, pct: 0 });
  });
  it("reorders and renumbers positions, ignoring out-of-range moves", () => {
    const items = [{ id: "a", position: 0 }, { id: "b", position: 1 }, { id: "c", position: 2 }];
    expect(reorder(items, 2, -1).map((i) => i.id)).toEqual(["a", "c", "b"]);
    expect(reorder(items, 2, -1).map((i) => i.position)).toEqual([0, 1, 2]);
    expect(reorder(items, 0, -1)).toBe(items);
  });
});
