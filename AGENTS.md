<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Pure business logic (budget, timeline, vendors, validation, plan schema) lives in `src/lib/*.ts` with unit tests in `src/test/`; UI components take data + callbacks so they're testable without the backend.
- AI calls run only in `src/lib/ai.functions.ts` (auth-required server functions) via `ai.server.ts`; outputs are schema-validated and a labelled sample ("demo") mode exists — never present demo output as AI.
- All user tables are owner-scoped with RLS (`user_id = auth.uid()`, child rows also require `event_owned(event_id)`).
