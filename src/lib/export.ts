import type { EventPlan } from "./plan-schema";

export function csvEscape(value: unknown): string {
  let s = value == null ? "" : String(value);
  // Prevent spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\r\n");
}

export function tasksCsv(
  tasks: { title: string; phase: string; due_date: string | null; priority: string; status: string }[],
) {
  return toCsv(
    ["Task", "Phase", "Due date", "Priority", "Status"],
    tasks.map((t) => [t.title, t.phase, t.due_date ?? "", t.priority, t.status]),
  );
}

export function budgetCsv(lines: { name: string; allocated: number; spent: number }[], currency: string) {
  return toCsv(
    ["Category", `Allocated (${currency})`, `Spent (${currency})`, `Remaining (${currency})`],
    lines.map((l) => [l.name, l.allocated, l.spent, Math.round((Number(l.allocated) - Number(l.spent)) * 100) / 100]),
  );
}

export function downloadText(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob(["\ufeff" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "event";
}

export interface PdfInput {
  title: string;
  subtitle: string;
  plan: EventPlan | null;
  planSource: "ai" | "demo" | null;
  budget: { name: string; allocated: number; spent: number }[];
  tasks: { title: string; due_date: string | null; status: string }[];
  money: (n: number) => string;
}

export async function exportPlanPdf(input: PdfInput) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  let y = 56;
  const ensure = (h: number) => {
    if (y + h > H - 48) {
      doc.addPage();
      y = 56;
    }
  };
  const heading = (t: string) => {
    ensure(36);
    y += 10;
    doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(60, 40, 140);
    doc.text(t, 48, y);
    y += 18;
  };
  const para = (t: string, size = 10) => {
    doc.setFont("helvetica", "normal").setFontSize(size).setTextColor(30, 30, 50);
    const lines = doc.splitTextToSize(t, W - 96) as string[];
    for (const l of lines) {
      ensure(14);
      doc.text(l, 48, y);
      y += 14;
    }
  };
  doc.setFillColor(22, 26, 52).rect(0, 0, W, 36, "F");
  doc.setTextColor(245, 240, 228).setFont("helvetica", "bold").setFontSize(11).text("Eventora AI", 48, 23);
  y = 76;
  doc.setTextColor(22, 26, 52).setFontSize(22).text(input.title, 48, y);
  y += 20;
  para(input.subtitle, 11);
  if (input.planSource === "demo") para("Note: plan content is a sample generated from templates, not live AI.", 9);
  if (input.plan) {
    heading("Summary");
    para(input.plan.summary);
    heading("Theme concepts");
    input.plan.themes.forEach((t) => para(`• ${t.name} — ${t.description} (${t.why})`));
    heading("Schedule");
    input.plan.schedule.forEach((s) => para(`${s.time}   ${s.activity}`));
    heading("Contingencies");
    input.plan.contingencies.forEach((c) => para(`• ${c.risk}: ${c.plan}`));
  }
  heading("Budget");
  input.budget.forEach((b) => para(`${b.name}: allocated ${input.money(Number(b.allocated))}, spent ${input.money(Number(b.spent))}`));
  heading("Checklist");
  input.tasks.forEach((t) => para(`${t.status === "done" ? "[x]" : "[ ]"} ${t.title}${t.due_date ? ` — due ${t.due_date}` : ""}`));
  doc.save(`${slug(input.title)}-plan.pdf`);
}
