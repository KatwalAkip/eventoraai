import type { TaskPhase, TaskPriority, TaskStatus } from "./types";

const DAY = 86_400_000;

/** Parse YYYY-MM-DD as a UTC date (no timezone drift). */
export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}
export function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
export function todayIso(now = new Date()): string {
  return toIso(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}
export function daysBetween(fromIso: string, toIsoDate: string): number {
  return Math.round((parseDate(toIsoDate).getTime() - parseDate(fromIso).getTime()) / DAY);
}
export function addDays(iso: string, days: number): string {
  return toIso(new Date(parseDate(iso).getTime() + days * DAY));
}

export interface DeadlineResult {
  dueDate: string | null;
  adjusted: boolean;
}

/**
 * Suggested deadline = eventDate - offsetDays (negative offset = after the event).
 * - Pre-event tasks whose ideal date already passed are moved to today (adjusted),
 *   unless the event itself is already past — then no deadline is assigned.
 * - Post-event tasks are never moved earlier than the event.
 */
export function computeDeadline(eventDate: string, offsetDays: number, today: string): DeadlineResult {
  const ideal = addDays(eventDate, -offsetDays);
  if (offsetDays < 0) return { dueDate: ideal, adjusted: false };
  if (daysBetween(today, eventDate) < 0) return { dueDate: null, adjusted: true };
  if (daysBetween(today, ideal) < 0) return { dueDate: today, adjusted: true };
  return { dueDate: ideal, adjusted: false };
}

export interface TemplateTask {
  title: string;
  phase: TaskPhase;
  offsetDays: number;
  priority: TaskPriority;
}

export const TASK_TEMPLATE: TemplateTask[] = [
  { title: "Confirm budget and guest estimate", phase: "planning", offsetDays: 90, priority: "high" },
  { title: "Choose theme and overall concept", phase: "planning", offsetDays: 80, priority: "medium" },
  { title: "Shortlist and visit venues", phase: "venue", offsetDays: 70, priority: "high" },
  { title: "Book venue and pay deposit", phase: "venue", offsetDays: 60, priority: "high" },
  { title: "Research caterers, decorators and photographers", phase: "vendors", offsetDays: 55, priority: "medium" },
  { title: "Book key vendors", phase: "vendors", offsetDays: 45, priority: "high" },
  { title: "Send invitations", phase: "guests", offsetDays: 35, priority: "high" },
  { title: "Track RSVPs and dietary needs", phase: "guests", offsetDays: 14, priority: "medium" },
  { title: "Finalize menu and decor plan", phase: "decor", offsetDays: 21, priority: "medium" },
  { title: "Confirm all vendors and timings", phase: "final", offsetDays: 7, priority: "high" },
  { title: "Prepare run-of-show and emergency kit", phase: "final", offsetDays: 2, priority: "medium" },
  { title: "Event day: set-up and coordination", phase: "event_day", offsetDays: 0, priority: "high" },
  { title: "Send thank-you notes and settle payments", phase: "post_event", offsetDays: -3, priority: "medium" },
];

export function generateTasks(eventDate: string, today: string, template = TASK_TEMPLATE) {
  const horizon = Math.max(daysBetween(today, eventDate), 0);
  return template.map((t, i) => {
    // Compress offsets for short lead times so tasks stay ordered rather than all landing today.
    const offset =
      t.offsetDays > 0 && horizon < 90 ? Math.round((t.offsetDays / 90) * horizon) : t.offsetDays;
    const { dueDate } = computeDeadline(eventDate, offset, today);
    return {
      title: t.title,
      phase: t.phase,
      priority: t.priority,
      offset_days: offset,
      due_date: dueDate,
      position: i,
    };
  });
}

export interface TaskLike {
  status: TaskStatus | string;
  due_date: string | null;
  phase: string;
  priority: string;
  title: string;
  position: number;
}

export function isOverdue(task: Pick<TaskLike, "status" | "due_date">, today: string): boolean {
  return task.status !== "done" && !!task.due_date && daysBetween(today, task.due_date) < 0;
}

export type TaskFilter = "all" | "open" | "done" | "overdue";

export function filterTasks<T extends TaskLike>(
  tasks: T[],
  opts: { filter?: TaskFilter; phase?: string; query?: string },
  today: string,
): T[] {
  const q = opts.query?.trim().toLowerCase();
  return tasks
    .filter((t) => {
      if (opts.filter === "open" && t.status === "done") return false;
      if (opts.filter === "done" && t.status !== "done") return false;
      if (opts.filter === "overdue" && !isOverdue(t, today)) return false;
      if (opts.phase && opts.phase !== "all" && t.phase !== opts.phase) return false;
      if (q && !t.title.toLowerCase().includes(q)) return false;
      return true;
    })
    .sort((a, b) => a.position - b.position);
}

export function taskProgress(tasks: Pick<TaskLike, "status">[]) {
  const done = tasks.filter((t) => t.status === "done").length;
  return { done, total: tasks.length, pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0 };
}

/** Move item at index by delta, returning new array with positions renumbered. */
export function reorder<T extends { position: number }>(items: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return items;
  const copy = [...items];
  const [moved] = copy.splice(index, 1);
  copy.splice(target, 0, moved);
  return copy.map((it, i) => ({ ...it, position: i }));
}
