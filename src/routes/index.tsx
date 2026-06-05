import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Users, MessageSquare, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nexus CRM — Client Lead Management" },
      { name: "description", content: "A focused CRM for tracking leads, status, and follow-ups." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "var(--gradient-hero), var(--background)" }}>
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary shadow-[var(--shadow-glow)]" />
          <span className="font-display text-lg font-semibold">Nexus CRM</span>
        </div>
        <Link to="/auth">
          <Button variant="ghost" size="sm">Sign in</Button>
        </Link>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pt-16 pb-24">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            A focused CRM for small sales teams
          </div>
          <h1 className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
            Every lead.<br />
            <span className="bg-gradient-to-r from-primary to-accent-foreground bg-clip-text text-transparent">
              One pipeline.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Capture leads from your contact forms, track status, and never miss a follow-up — all in a single, fast workspace.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth">
              <Button size="lg" className="gap-2">
                Open dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-24 grid gap-4 md:grid-cols-3">
          {[
            { icon: Users, title: "Lead pipeline", desc: "Name, email, source, status — at a glance." },
            { icon: Activity, title: "Status flow", desc: "Move leads from new → contacted → converted." },
            { icon: MessageSquare, title: "Notes & follow-ups", desc: "Keep context attached to every contact." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-border bg-card/60 p-6 shadow-[var(--shadow-card)] backdrop-blur">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
