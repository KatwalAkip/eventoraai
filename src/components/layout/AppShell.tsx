import { Link, Outlet, useNavigate, useRouteContext } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Lightbulb, LogOut, Menu, Plus, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/events/new", label: "New event", icon: Plus },
  { to: "/ideas", label: "Ideas", icon: Lightbulb },
] as const;

export function AppShell() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useRouteContext({ from: "/_authenticated" });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const links = (
    <ul className="space-y-1">
      {NAV.map(({ to, label, icon: Icon }) => (
        <li key={to}>
          <Link
            to={to}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );

  const footer = (
    <div className="mt-auto space-y-2 border-t border-sidebar-border pt-4">
      <p className="truncate px-3 text-xs text-sidebar-foreground/70" title={user.email ?? ""}>
        {user.email}
      </p>
      <button
        onClick={signOut}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent"
      >
        <LogOut className="size-4" aria-hidden /> Sign out
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background lg:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2">
        Skip to content
      </a>
      <aside className="no-print hidden w-64 shrink-0 flex-col bg-sidebar p-5 lg:sticky lg:top-0 lg:flex lg:h-screen">
        <Link to="/dashboard" className="mb-8 block">
          <Logo tone="dark" />
        </Link>
        <nav aria-label="Main">{links}</nav>
        {footer}
      </aside>

      <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b bg-sidebar px-4 py-3 lg:hidden">
        <Link to="/dashboard">
          <Logo tone="dark" />
        </Link>
        <Button
          variant="ghost-dark"
          size="icon"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X /> : <Menu />}
        </Button>
      </header>
      {open && (
        <nav id="mobile-nav" aria-label="Main" className="no-print flex flex-col bg-sidebar p-4 lg:hidden">
          {links}
          {footer}
        </nav>
      )}

      <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <Outlet />
      </main>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

