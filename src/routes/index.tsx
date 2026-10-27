import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, ListChecks, PiggyBank, Sparkles, Store, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/Logo";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Eventora AI — Plan weddings, birthdays & community events" },
      { name: "description", content: "Turn your event details into a personalized plan with budgets, timelines, vendor checklists and AI-generated ideas." },
      { property: "og:title", content: "Eventora AI — Intelligent Event Planning" },
      { property: "og:description", content: "Personalized event plans with budgets, timelines, vendors and ideas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Sparkles, title: "AI event plans", text: "Three theme concepts, a schedule, budget split and contingencies built from your inputs." },
  { icon: PiggyBank, title: "Budget dashboard", text: "Allocate, track actual spend and get warnings before you overspend." },
  { icon: ListChecks, title: "Smart timeline", text: "Deadlines generated from your event date and recalculated when it moves." },
  { icon: Store, title: "Vendor tracker", text: "Compare shortlisted vendors, booking and payment status in one place." },
  { icon: Lightbulb, title: "Ideas generator", text: "Themes, menus, activities, low-budget and eco-friendly options." },
  { icon: CalendarCheck, title: "Export & share", text: "PDF plans, CSV checklists, print-ready summaries." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-midnight">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Logo tone="dark" />
          <nav className="flex gap-2" aria-label="Account">
            <Button asChild variant="ghost-dark" size="sm"><Link to="/auth">Sign in</Link></Button>
            <Button asChild variant="ivory" size="sm"><Link to="/auth">Get started</Link></Button>
          </nav>
        </div>
      </header>
      <main>
        <section className="relative overflow-hidden bg-midnight text-midnight-foreground">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 pb-20 pt-10 lg:grid-cols-2 lg:pt-16">
            <div>
              <p className="mb-4 inline-flex rounded-full border border-midnight-foreground/20 px-3 py-1 text-xs uppercase tracking-widest text-midnight-foreground/80">Weddings · Birthdays · Community</p>
              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">Your event, planned with care and a little intelligence.</h1>
              <p className="mt-5 max-w-lg text-lg text-midnight-foreground/80">Share the date, guests, budget and vibe. Eventora turns it into an actionable plan — budget, timeline, vendors and ideas included.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" variant="ivory"><Link to="/auth">Start planning free</Link></Button>
                <Button asChild size="lg" variant="ghost-dark"><a href="#features">See features</a></Button>
              </div>
            </div>
            <img src={hero} alt="Candle-lit event table with ivory linen and violet florals at dusk" width={1600} height={1008} className="aspect-[4/3] w-full rounded-2xl object-cover shadow-2xl" />
          </div>
        </section>
        <section id="features" className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-3xl font-semibold">Everything a planner needs, nothing it doesn't</h2>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-xl border bg-card p-6 shadow-card">
                <Icon className="size-6 text-primary" aria-hidden />
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{text}</p>
              </li>
            ))}
          </ul>
          <p className="mt-10 text-sm text-muted-foreground">Cost figures are estimates for planning, not vendor quotes. Sample vendors are clearly marked and are not real businesses.</p>
        </section>
      </main>
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">© Eventora AI</footer>
    </div>
  );
}
