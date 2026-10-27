export interface BudgetLine {
  name: string;
  allocated: number;
  spent: number;
}

export interface BudgetSummary {
  total: number;
  allocated: number;
  spent: number;
  remaining: number;
  unallocated: number;
  contingencyReserve: number;
  spendableAfterReserve: number;
  overAllocated: boolean;
  overSpent: boolean;
  overspentCategories: string[];
  percentSpent: number;
}

/** Coerce any user input to a finite, non-negative amount rounded to cents. */
export function safeAmount(value: unknown): number {
  const n = typeof value === "string" ? Number(value.replace(/,/g, "").trim()) : Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

const round = (n: number) => Math.round(n * 100) / 100;

export function summarizeBudget(
  totalBudget: number,
  lines: BudgetLine[],
  contingencyPct = 0,
): BudgetSummary {
  const total = safeAmount(totalBudget);
  const pct = Math.min(Math.max(Number.isFinite(contingencyPct) ? contingencyPct : 0, 0), 50);
  const allocated = round(lines.reduce((s, l) => s + safeAmount(l.allocated), 0));
  const spent = round(lines.reduce((s, l) => s + safeAmount(l.spent), 0));
  const contingencyReserve = round((total * pct) / 100);
  const overspentCategories = lines
    .filter((l) => safeAmount(l.spent) > safeAmount(l.allocated))
    .map((l) => l.name);
  return {
    total,
    allocated,
    spent,
    remaining: round(total - spent),
    unallocated: round(total - allocated),
    contingencyReserve,
    spendableAfterReserve: round(total - contingencyReserve - spent),
    overAllocated: allocated > total,
    overSpent: spent > total,
    overspentCategories,
    percentSpent: total > 0 ? Math.round((spent / total) * 1000) / 10 : 0,
  };
}

export const DEFAULT_SPLIT: { name: string; percent: number }[] = [
  { name: "Venue", percent: 30 },
  { name: "Catering", percent: 30 },
  { name: "Decoration", percent: 10 },
  { name: "Photography", percent: 8 },
  { name: "Entertainment", percent: 8 },
  { name: "Transport", percent: 4 },
  { name: "Contingency", percent: 10 },
];

/** Split a total into categories by percent; rounding remainder goes to the last line. */
export function allocateByPercent(
  total: number,
  split: { name: string; percent: number }[],
): { name: string; allocated: number }[] {
  const t = safeAmount(total);
  const valid = split.filter((s) => Number.isFinite(s.percent) && s.percent > 0);
  const pctSum = valid.reduce((s, x) => s + x.percent, 0);
  if (t === 0 || pctSum === 0) return valid.map((s) => ({ name: s.name, allocated: 0 }));
  const scale = pctSum > 100 ? 100 / pctSum : 1;
  const out = valid.map((s) => ({
    name: s.name,
    allocated: Math.floor(((t * s.percent * scale) / 100) * 100) / 100,
  }));
  const target = round((t * Math.min(pctSum, 100)) / 100);
  const diff = round(target - out.reduce((s, x) => s + x.allocated, 0));
  const last = out[out.length - 1];
  if (last) last.allocated = round(last.allocated + diff);
  return out;
}

export function savingsSuggestions(summary: BudgetSummary, lines: BudgetLine[]): string[] {
  const tips: string[] = [];
  const byName = (n: string) => lines.find((l) => l.name.toLowerCase() === n);
  if (summary.overAllocated)
    tips.push(
      "Allocations exceed your total budget. Reduce the largest categories or raise the total.",
    );
  for (const name of summary.overspentCategories)
    tips.push(`${name} is over its allocation — move funds from an underused category.`);
  const catering = byName("catering");
  if (catering && summary.total > 0 && catering.allocated / summary.total > 0.4)
    tips.push("Catering is over 40% of budget: consider a buffet or family-style service.");
  const venue = byName("venue");
  if (venue && summary.total > 0 && venue.allocated / summary.total > 0.35)
    tips.push("Venue is a large share: weekday dates or community halls often cost less.");
  if (!byName("contingency"))
    tips.push("Add a contingency line so surprises don't come out of essentials.");
  if (tips.length === 0) tips.push("Your budget looks balanced. Keep tracking actual spend.");
  return tips;
}

export function formatMoney(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount)}`;
  }
}
