import { useMemo, useState } from "react";
import { Plus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ConfirmButton, EmptyState } from "@/components/common/ConfirmButton";
import { bookingProgress, filterVendors, type VendorSort } from "@/lib/vendors";
import { BOOKING_STATUSES, PAYMENT_STATUSES, VENDOR_CATEGORIES, humanize, labelFor } from "@/lib/types";
import { vendorFormSchema, type VendorFormValues } from "@/lib/validation";
import { formatMoney } from "@/lib/budget";

export interface VendorView {
  id: string;
  name: string;
  category: string;
  contact: string;
  estimated_cost: number;
  booking_status: string;
  payment_status: string;
  rating: number | null;
  notes: string;
  is_sample: boolean;
}

interface Props {
  vendors: VendorView[];
  currency: string;
  onAdd: (v: VendorFormValues) => void;
  onUpdate: (id: string, patch: Partial<VendorView>) => void;
  onDelete: (id: string) => void;
}

const sel = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm";
const blank: Record<keyof VendorFormValues, string> = { name: "", category: "venue", contact: "", estimated_cost: "0", booking_status: "researching", payment_status: "unpaid", rating: "0", notes: "" };

export function VendorForm({ onSubmit }: { onSubmit: (v: VendorFormValues) => void }) {
  const [f, setF] = useState(blank);
  const [errors, setErrors] = useState<Partial<Record<keyof VendorFormValues, string>>>({});
  const set = (k: keyof VendorFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form
      noValidate
      aria-label="Add vendor"
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const r = vendorFormSchema.safeParse(f);
        if (!r.success) {
          const fe = r.error.flatten().fieldErrors;
          return setErrors(Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v?.[0]])));
        }
        setErrors({});
        onSubmit(r.data);
        setF(blank);
      }}
    >
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="v-name">Vendor name *</Label>
        <Input id="v-name" value={f.name} onChange={set("name")} aria-invalid={!!errors.name} aria-describedby={errors.name ? "v-name-err" : undefined} />
        {errors.name && <p id="v-name-err" role="alert" className="text-sm text-destructive">{errors.name}</p>}
      </div>
      <div className="space-y-1"><Label htmlFor="v-cat">Category</Label><select id="v-cat" className={sel} value={f.category} onChange={set("category")}>{VENDOR_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
      <div className="space-y-1">
        <Label htmlFor="v-cost">Estimated cost</Label>
        <Input id="v-cost" type="number" min="0" value={f.estimated_cost} onChange={set("estimated_cost")} aria-invalid={!!errors.estimated_cost} aria-describedby={errors.estimated_cost ? "v-cost-err" : undefined} />
        {errors.estimated_cost && <p id="v-cost-err" role="alert" className="text-sm text-destructive">{errors.estimated_cost}</p>}
      </div>
      <div className="space-y-1"><Label htmlFor="v-contact">Contact</Label><Input id="v-contact" value={f.contact} onChange={set("contact")} placeholder="Phone or email" /></div>
      <div className="space-y-1"><Label htmlFor="v-rating">Your rating</Label><select id="v-rating" className={sel} value={f.rating} onChange={set("rating")}><option value="0">Not rated</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} / 5</option>)}</select></div>
      <div className="space-y-1"><Label htmlFor="v-book">Booking status</Label><select id="v-book" className={sel} value={f.booking_status} onChange={set("booking_status")}>{BOOKING_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</select></div>
      <div className="space-y-1"><Label htmlFor="v-pay">Payment status</Label><select id="v-pay" className={sel} value={f.payment_status} onChange={set("payment_status")}>{PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</select></div>
      <div className="space-y-1 sm:col-span-2"><Label htmlFor="v-notes">Notes</Label><Input id="v-notes" value={f.notes} onChange={set("notes")} /></div>
      <Button type="submit" className="sm:col-span-2">Save vendor</Button>
    </form>
  );
}

export function VendorManager({ vendors, currency, onAdd, onUpdate, onDelete }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<VendorSort>("name");
  const [open, setOpen] = useState(false);
  const [compare, setCompare] = useState(false);
  const list = useMemo(() => filterVendors(vendors, { query, category, sort }), [vendors, query, category, sort]);
  const shortlisted = vendors.filter((v) => v.booking_status === "shortlisted" || v.booking_status === "booked");
  const progress = bookingProgress(vendors);
  const money = (n: number) => formatMoney(Number(n), currency);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-sm font-medium" aria-live="polite">{progress.booked} of {progress.total} active vendors booked</p>
        <Button variant="outline" size="sm" aria-pressed={compare} onClick={() => setCompare((c) => !c)} disabled={shortlisted.length < 2}>Compare shortlisted ({shortlisted.length})</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus /> Add vendor</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add vendor</DialogTitle></DialogHeader>
            <VendorForm onSubmit={(v) => { onAdd(v); setOpen(false); }} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2">
        <label htmlFor="v-search" className="sr-only">Search vendors</label>
        <Input id="v-search" placeholder="Search vendors" value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 w-48" />
        <label htmlFor="v-filter" className="sr-only">Category filter</label>
        <select id="v-filter" className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All categories</option>
          {VENDOR_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <label htmlFor="v-sort" className="sr-only">Sort by</label>
        <select id="v-sort" className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={sort} onChange={(e) => setSort(e.target.value as VendorSort)}>
          <option value="name">Name A–Z</option><option value="cost_asc">Cost: low to high</option><option value="cost_desc">Cost: high to low</option><option value="rating">Your rating</option>
        </select>
      </div>

      {compare && shortlisted.length >= 2 && (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
          <table className="w-full text-sm">
            <caption className="p-3 text-left font-semibold">Shortlist comparison</caption>
            <thead className="border-y text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">Vendor</th><th className="p-3">Category</th><th className="p-3 text-right">Est. cost</th><th className="p-3">Rating</th><th className="p-3">Status</th></tr></thead>
            <tbody>{[...shortlisted].sort((a, b) => a.category.localeCompare(b.category) || a.estimated_cost - b.estimated_cost).map((v) => (
              <tr key={v.id} className="border-b last:border-0"><th scope="row" className="p-3 text-left font-medium">{v.name}</th><td className="p-3">{labelFor(VENDOR_CATEGORIES, v.category)}</td><td className="p-3 text-right tabular-nums">{money(v.estimated_cost)}</td><td className="p-3">{v.rating ? `${v.rating}/5` : "—"}</td><td className="p-3">{humanize(v.booking_status)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState title={vendors.length ? "No matching vendors" : "No vendors yet"} text={vendors.length ? "Try a different search or category." : "Add venues, caterers, photographers and more to track bookings and payments."} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2" aria-label="Vendors">
          {list.map((v) => (
            <li key={v.id} className="rounded-xl border bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-sans text-base font-semibold">{v.name}</h3>
                  <p className="text-xs text-muted-foreground">{labelFor(VENDOR_CATEGORIES, v.category)}{v.contact && ` · ${v.contact}`}</p>
                </div>
                <div className="flex items-center gap-1">
                  {v.is_sample ? <Badge variant="outline" className="border-warning text-warning-foreground">Sample — not a real business</Badge> : <Badge variant="outline">Added by you</Badge>}
                  <ConfirmButton label={`Delete ${v.name}`} title={`Delete ${v.name}?`} description="This vendor will be removed from your event." onConfirm={() => onDelete(v.id)}><Trash2 /></ConfirmButton>
                </div>
              </div>
              <p className="mt-2 text-lg font-semibold tabular-nums">{money(v.estimated_cost)} <span className="text-xs font-normal text-muted-foreground">estimate</span></p>
              {v.rating ? <p className="flex items-center gap-1 text-xs" aria-label={`Your rating ${v.rating} of 5`}><Star className="size-3 fill-current text-warning" aria-hidden />{v.rating}/5 (your rating)</p> : null}
              {v.notes && <p className="mt-1 text-sm text-muted-foreground">{v.notes}</p>}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div><Label htmlFor={`b-${v.id}`} className="text-xs">Booking</Label><select id={`b-${v.id}`} className={sel} value={v.booking_status} onChange={(e) => onUpdate(v.id, { booking_status: e.target.value })}>{BOOKING_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</select></div>
                <div><Label htmlFor={`p-${v.id}`} className="text-xs">Payment</Label><select id={`p-${v.id}`} className={sel} value={v.payment_status} onChange={(e) => onUpdate(v.id, { payment_status: e.target.value })}>{PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</select></div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
