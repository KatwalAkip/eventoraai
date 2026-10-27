import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — Eventora AI" },
      { name: "description", content: "Choose a new password for your Eventora AI account." },
      { property: "og:title", content: "Set a new password — Eventora AI" },
      { property: "og:description", content: "Choose a new password for your Eventora AI account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setErr("Password must be at least 8 characters");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr(error.message);
    navigate({ to: "/dashboard" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={submit} noValidate className="w-full max-w-sm space-y-4">
        <h1 className="text-3xl font-semibold">Set a new password</h1>
        <div className="space-y-1.5">
          <Label htmlFor="new-pw">New password</Label>
          <Input id="new-pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={!!err} aria-describedby={err ? "new-pw-err" : undefined} />
          {err && <p id="new-pw-err" role="alert" className="text-sm text-destructive">{err}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Saving…" : "Update password"}</Button>
      </form>
    </main>
  );
}
