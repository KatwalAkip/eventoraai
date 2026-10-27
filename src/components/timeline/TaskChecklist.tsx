import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton, EmptyState } from "@/components/common/ConfirmButton";
import { filterTasks, isOverdue, taskProgress, type TaskFilter } from "@/lib/timeline";
import { TASK_PHASES, labelFor } from "@/lib/types";
import { taskFormSchema } from "@/lib/validation";
import { cn } from "@/lib/utils";

export interface TaskView {
  id: string;
  title: string;
  phase: string;
  due_date: string | null;
  priority: string;
  status: string;
  position: number;
}

interface Props {
  tasks: TaskView[];
  today: string;
  eventDate: string;
  onAdd: (t: { title: string; phase: string; due_date: string | null; priority: string }) => void;
  onUpdate: (id: string, patch: Partial<TaskView>) => void;
  onDelete: (id: string) => void;
  onMove: (index: number, delta: number) => void;
}

const sel = "h-8 rounded-md border border-input bg-background px-2 text-sm";

export function TaskChecklist({ tasks, today, eventDate, onAdd, onUpdate, onDelete, onMove }: Props) {
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [phase, setPhase] = useState("all");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ title: "", phase: "planning", due_date: "", priority: "medium" });
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const sorted = useMemo(() => [...tasks].sort((a, b) => a.position - b.position), [tasks]);
  const visible = useMemo(() => filterTasks(sorted, { filter, phase, query }, today), [sorted, filter, phase, query, today]);
  const progress = taskProgress(tasks);
  const canReorder = filter === "all" && phase === "all" && !query;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = taskFormSchema.safeParse(form);
    if (!r.success) return setError(r.error.issues[0]?.message ?? "Invalid task");
    if (r.data.due_date && r.data.due_date < today && eventDate >= today)
      return setError("Due date can't be in the past.");
    setError("");
    onAdd({ ...r.data, due_date: r.data.due_date || null });
    setForm({ ...form, title: "", due_date: "" });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-medium" aria-live="polite">{progress.done} of {progress.total} complete ({progress.pct}%)</p>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden><div className="h-full bg-teal" style={{ width: `${progress.pct}%` }} /></div>
      </div>

      <form onSubmit={submit} noValidate className="grid gap-2 rounded-xl border bg-card p-4 shadow-card sm:grid-cols-[1fr_auto_auto_auto_auto]" aria-label="Add task">
        <div>
          <Label htmlFor="task-title" className="sr-only">Task title</Label>
          <Input id="task-title" placeholder="Add a task…" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} aria-invalid={!!error} aria-describedby={error ? "task-err" : undefined} className="h-8" />
        </div>
        <label className="sr-only" htmlFor="task-phase">Phase</label>
        <select id="task-phase" className={sel} value={form.phase} onChange={(e) => setForm({ ...form, phase: e.target.value })}>
          {TASK_PHASES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <label className="sr-only" htmlFor="task-due">Due date</label>
        <Input id="task-due" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="h-8" />
        <label className="sr-only" htmlFor="task-priority">Priority</label>
        <select id="task-priority" className={sel} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
          <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
        <Button type="submit" size="sm"><Plus /> Add task</Button>
        {error && <p id="task-err" role="alert" className="text-sm text-destructive sm:col-span-5">{error}</p>}
      </form>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter tasks">
        {(["all", "open", "done", "overdue"] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
        <label htmlFor="phase-filter" className="sr-only">Phase filter</label>
        <select id="phase-filter" className={sel} value={phase} onChange={(e) => setPhase(e.target.value)}>
          <option value="all">All phases</option>
          {TASK_PHASES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <label htmlFor="task-search" className="sr-only">Search tasks</label>
        <Input id="task-search" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} className="h-8 w-40" />
      </div>

      {visible.length === 0 ? (
        <EmptyState title="No tasks here" text={tasks.length ? "No tasks match these filters." : "Add your first task above."} />
      ) : (
        <ul className="divide-y rounded-xl border bg-card shadow-card" aria-label="Tasks">
          {visible.map((t) => {
            const overdue = isOverdue(t, today);
            const done = t.status === "done";
            const idx = sorted.findIndex((s) => s.id === t.id);
            return (
              <li key={t.id} className="flex flex-wrap items-center gap-3 p-3">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--color-teal)]"
                  checked={done}
                  onChange={() => onUpdate(t.id, { status: done ? "todo" : "done" })}
                  aria-label={`Mark "${t.title}" ${done ? "not done" : "done"}`}
                />
                <div className="min-w-0 flex-1">
                  {editing === t.id ? (
                    <form className="flex gap-1" onSubmit={(e) => { e.preventDefault(); if (editTitle.trim()) onUpdate(t.id, { title: editTitle.trim().slice(0, 200) }); setEditing(null); }}>
                      <Input aria-label="Task title" autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-8" />
                      <Button size="icon" type="submit" variant="ghost" aria-label="Save title"><Check /></Button>
                      <Button size="icon" type="button" variant="ghost" aria-label="Cancel edit" onClick={() => setEditing(null)}><X /></Button>
                    </form>
                  ) : (
                    <p className={cn("text-sm font-medium", done && "text-muted-foreground line-through")}>{t.title}</p>
                  )}
                  <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                    <span>{labelFor(TASK_PHASES, t.phase)}</span>
                    <span aria-hidden>·</span>
                    <span>{t.due_date ? `Due ${t.due_date}` : "No deadline"}</span>
                    <Badge variant="outline" className="h-5 text-[10px] capitalize">{t.priority} priority</Badge>
                    {overdue && <Badge className="h-5 bg-destructive text-[10px] text-destructive-foreground">Overdue</Badge>}
                    {done && <Badge className="h-5 bg-success text-[10px] text-primary-foreground">Done</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  <select aria-label={`Status of ${t.title}`} className={sel} value={t.status} onChange={(e) => onUpdate(t.id, { status: e.target.value })}>
                    <option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Done</option>
                  </select>
                  {canReorder && (
                    <>
                      <Button size="icon" variant="ghost" aria-label={`Move ${t.title} up`} disabled={idx === 0} onClick={() => onMove(idx, -1)}><ArrowUp /></Button>
                      <Button size="icon" variant="ghost" aria-label={`Move ${t.title} down`} disabled={idx === sorted.length - 1} onClick={() => onMove(idx, 1)}><ArrowDown /></Button>
                    </>
                  )}
                  <Button size="icon" variant="ghost" aria-label={`Edit ${t.title}`} onClick={() => { setEditing(t.id); setEditTitle(t.title); }}><Pencil /></Button>
                  <ConfirmButton label={`Delete ${t.title}`} title="Delete this task?" description={t.title} onConfirm={() => onDelete(t.id)}><Trash2 /></ConfirmButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
