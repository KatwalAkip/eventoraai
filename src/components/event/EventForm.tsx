import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type FieldPath } from "react-hook-form";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CURRENCIES, EVENT_TYPES } from "@/lib/types";
import { emptyEventForm, eventFormSchema, type EventFormValues } from "@/lib/validation";

const STEPS: { title: string; fields: FieldPath<EventFormValues>[] }[] = [
  { title: "Basics", fields: ["title", "event_type", "event_date", "start_time", "duration_hours"] },
  { title: "Place & guests", fields: ["location", "venue_preference", "guest_count", "accessibility"] },
  { title: "Budget", fields: ["total_budget", "currency", "contingency_pct"] },
  { title: "Style & food", fields: ["theme", "colors", "atmosphere", "food_preferences", "special_requests"] },
];

const selectCls =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

interface Props {
  initial?: Partial<EventFormValues>;
  submitLabel?: string;
  wizard?: boolean;
  busy?: boolean;
  onSubmit: (values: EventFormValues, opts: { draft: boolean }) => void | Promise<void>;
}

export function EventForm({ initial, submitLabel = "Create event", wizard = true, busy, onSubmit }: Props) {
  const [step, setStep] = useState(0);
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: { ...emptyEventForm, ...initial },
    mode: "onTouched",
  });
  const { register, formState, trigger, handleSubmit, getValues } = form;
  const errors = formState.errors;
  const visible = (i: number) => !wizard || step === i;

  const field = (
    name: FieldPath<EventFormValues>,
    label: string,
    input: React.ReactNode,
    hint?: string,
    required = false,
  ) => {
    const err = errors[name]?.message as string | undefined;
    return (
      <div className="space-y-1.5">
        <Label htmlFor={name}>
          {label}
          {required && <span aria-hidden className="text-destructive"> *</span>}
        </Label>
        {input}
        {hint && !err && <p id={`${name}-hint`} className="text-xs text-muted-foreground">{hint}</p>}
        {err && <p id={`${name}-error`} role="alert" className="text-sm text-destructive">{err}</p>}
      </div>
    );
  };
  const a11y = (name: FieldPath<EventFormValues>, required = false) => ({
    id: name,
    "aria-invalid": !!errors[name],
    "aria-required": required || undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  async function next() {
    if (await trigger(STEPS[step].fields, { shouldFocus: true })) setStep((s) => s + 1);
  }

  async function saveDraft() {
    // Drafts still need the core required fields so they can be planned later.
    const ok = await trigger(["title", "event_type", "event_date", "location", "guest_count", "total_budget"], { shouldFocus: true });
    if (ok) {
      const parsed = eventFormSchema.safeParse(getValues());
      if (parsed.success) await onSubmit(parsed.data, { draft: true });
      else await trigger();
    }
  }

  const isLast = !wizard || step === STEPS.length - 1;

  return (
    <form
      noValidate
      onSubmit={handleSubmit((v) => onSubmit(v, { draft: false }))}
      className="space-y-6"
      aria-label="Event details"
    >
      {wizard && (
        <ol className="flex flex-wrap gap-2" aria-label="Steps">
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              aria-current={i === step ? "step" : undefined}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium",
                i === step ? "border-primary bg-primary text-primary-foreground" : i < step ? "border-teal text-teal" : "text-muted-foreground",
              )}
            >
              {i + 1}. {s.title}
            </li>
          ))}
        </ol>
      )}

      <fieldset className={cn("grid gap-4 sm:grid-cols-2", !visible(0) && "hidden")}>
        <legend className="sr-only">Basics</legend>
        <div className="sm:col-span-2">{field("title", "Event title", <Input {...register("title")} {...a11y("title", true)} placeholder="e.g. Maya's 30th Birthday" />, undefined, true)}</div>
        {field("event_type", "Event type", (
          <select {...register("event_type")} {...a11y("event_type", true)} className={selectCls}>
            {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        ), undefined, true)}
        {field("event_date", "Event date", <Input type="date" {...register("event_date")} {...a11y("event_date", true)} />, undefined, true)}
        {field("start_time", "Start time", <Input type="time" {...register("start_time")} {...a11y("start_time")} />)}
        {field("duration_hours", "Duration (hours)", <Input type="number" step="0.5" min="0.5" inputMode="decimal" {...register("duration_hours")} {...a11y("duration_hours", true)} />, undefined, true)}
      </fieldset>

      <fieldset className={cn("grid gap-4 sm:grid-cols-2", !visible(1) && "hidden")}>
        <legend className="sr-only">Place and guests</legend>
        {field("location", "City or venue preference", <Input {...register("location")} {...a11y("location", true)} placeholder="e.g. Pune, garden venue" />, undefined, true)}
        {field("guest_count", "Expected guests", <Input type="number" min="1" inputMode="numeric" {...register("guest_count")} {...a11y("guest_count", true)} />, undefined, true)}
        {field("venue_preference", "Indoor or outdoor", (
          <select {...register("venue_preference")} {...a11y("venue_preference")} className={selectCls}>
            <option value="either">No preference</option>
            <option value="indoor">Indoor</option>
            <option value="outdoor">Outdoor</option>
          </select>
        ))}
        {field("accessibility", "Accessibility requirements", <Input {...register("accessibility")} {...a11y("accessibility")} placeholder="e.g. wheelchair access, quiet room" />)}
      </fieldset>

      <fieldset className={cn("grid gap-4 sm:grid-cols-3", !visible(2) && "hidden")}>
        <legend className="sr-only">Budget</legend>
        {field("total_budget", "Total budget", <Input type="number" min="0" step="1" inputMode="decimal" {...register("total_budget")} {...a11y("total_budget", true)} />, undefined, true)}
        {field("currency", "Currency", (
          <select {...register("currency")} {...a11y("currency")} className={selectCls}>
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        ))}
        {field("contingency_pct", "Contingency reserve (%)", <Input type="number" min="0" max="50" {...register("contingency_pct")} {...a11y("contingency_pct")} />, "Held back for surprises")}
      </fieldset>

      <fieldset className={cn("grid gap-4 sm:grid-cols-2", !visible(3) && "hidden")}>
        <legend className="sr-only">Style and food</legend>
        {field("theme", "Theme", <Input {...register("theme")} {...a11y("theme")} placeholder="e.g. Retro 90s" />)}
        {field("colors", "Color palette", <Input {...register("colors")} {...a11y("colors")} placeholder="e.g. Teal and gold" />)}
        {field("atmosphere", "Atmosphere", <Input {...register("atmosphere")} {...a11y("atmosphere")} placeholder="e.g. Relaxed, elegant" />)}
        {field("food_preferences", "Food & dietary needs", <Input {...register("food_preferences")} {...a11y("food_preferences")} placeholder="e.g. Vegetarian, nut allergy" />)}
        <div className="sm:col-span-2">{field("special_requests", "Special or cultural requests", <Textarea rows={3} {...register("special_requests")} {...a11y("special_requests")} />)}</div>
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        <div className="flex gap-2">
          {wizard && step > 0 && (
            <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft /> Back
            </Button>
          )}
          {wizard && (
            <Button type="button" variant="ghost" onClick={saveDraft} disabled={busy}>
              Save draft
            </Button>
          )}
        </div>
        {isLast ? (
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : submitLabel}</Button>
        ) : (
          <Button type="button" onClick={next}>
            Next <ArrowRight />
          </Button>
        )}
      </div>
    </form>
  );
}
