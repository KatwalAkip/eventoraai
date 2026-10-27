export interface VendorLike {
  name: string;
  category: string;
  estimated_cost: number;
  booking_status: string;
  rating: number | null;
  contact: string;
  notes: string;
}

export type VendorSort = "name" | "cost_asc" | "cost_desc" | "rating";

export function filterVendors<T extends VendorLike>(
  vendors: T[],
  opts: { query?: string; category?: string; status?: string; sort?: VendorSort },
): T[] {
  const q = opts.query?.trim().toLowerCase();
  const out = vendors.filter((v) => {
    if (opts.category && opts.category !== "all" && v.category !== opts.category) return false;
    if (opts.status && opts.status !== "all" && v.booking_status !== opts.status) return false;
    if (q && !`${v.name} ${v.contact} ${v.notes}`.toLowerCase().includes(q)) return false;
    return true;
  });
  const sort = opts.sort ?? "name";
  return [...out].sort((a, b) => {
    switch (sort) {
      case "cost_asc":
        return Number(a.estimated_cost) - Number(b.estimated_cost);
      case "cost_desc":
        return Number(b.estimated_cost) - Number(a.estimated_cost);
      case "rating":
        return (b.rating ?? 0) - (a.rating ?? 0);
      default:
        return a.name.localeCompare(b.name);
    }
  });
}

export function bookingProgress(vendors: Pick<VendorLike, "booking_status">[]) {
  const active = vendors.filter((v) => v.booking_status !== "declined");
  const booked = active.filter((v) => v.booking_status === "booked").length;
  return {
    booked,
    total: active.length,
    pct: active.length ? Math.round((booked / active.length) * 100) : 0,
  };
}

export function cheapestPerCategory<T extends VendorLike>(vendors: T[]): Record<string, T> {
  const out: Record<string, T> = {};
  for (const v of vendors) {
    if (v.booking_status === "declined") continue;
    const cur = out[v.category];
    if (!cur || Number(v.estimated_cost) < Number(cur.estimated_cost)) out[v.category] = v;
  }
  return out;
}
