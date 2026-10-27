# Eventora AI

AI-assisted planner for weddings, birthdays and community events: guided event wizard, AI plan (themes, schedule, budget split, vendors, ideas, milestones, contingencies), budget dashboard, timeline checklist, vendor tracker, ideas generator, PDF/CSV/print/share.

- Run tests: `bun run test` (Vitest + Testing Library).
- AI: server-side via Lovable AI (`LOVABLE_API_KEY`, server only), 20 generations/user/hour. "Load sample plan" / "Samples" produce clearly labelled template output.
- Data: Lovable Cloud with per-user Row Level Security.

Limitations: no Playwright test-runner suite yet; signed-in flows were not browser-verified by the agent.
