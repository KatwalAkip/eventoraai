import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Sparkles className="size-4" aria-hidden />
      </span>
      <span
        className={cn(
          "font-display text-lg font-semibold",
          tone === "dark" ? "text-sidebar-foreground" : "text-foreground",
        )}
      >
        Eventora <span className="text-teal">AI</span>
      </span>
    </span>
  );
}
