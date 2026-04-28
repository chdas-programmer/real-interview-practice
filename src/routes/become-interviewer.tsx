import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/become-interviewer")({
  head: () => ({
    meta: [
      { title: "Become an interviewer — RealMock" },
      { name: "description", content: "Help serious candidates and earn on the side. Apply to interview on RealMock." },
    ],
  }),
  component: BecomePage,
});

function BecomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-4xl px-6 py-20">
        <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--ink-soft)] mb-4">For professionals</div>
        <h1 className="font-serif text-5xl font-bold leading-tight max-w-3xl">
          Help serious people. <em className="text-[color:var(--accent-warm)] font-semibold italic">Get paid to do it.</em>
        </h1>
        <p className="mt-5 text-lg text-[color:var(--ink-soft)] max-w-2xl">
          If you're at a product company and have hired or interviewed before, candidates need you. Set your price, your
          hours, and run interviews on your terms.
        </p>

        <div className="mt-12 grid md:grid-cols-3 gap-5">
          <Card title="Set your rate" body="You decide what your time is worth. Senior engineers typically charge $40–$120 / hour." />
          <Card title="Your hours" body="Pick recurring weekly slots. Cancel any time. We never assign sessions to you." />
          <Card title="No fluff" body="Real interviews, real feedback. We only allow product-based interviewers — no peer practice." />
        </div>

        <div className="mt-12 rounded-3xl border border-border bg-card p-8">
          <h2 className="font-serif text-2xl font-bold">Verification is mandatory.</h2>
          <p className="mt-2 text-[color:var(--ink-soft)]">
            We manually verify every interviewer's company, role and LinkedIn before they can accept bookings. Usually
            takes 1–2 business days.
          </p>
          <Button asChild size="lg" className="mt-6 rounded-full bg-[color:var(--accent-warm)] text-[color:var(--accent-warm-foreground)] hover:bg-[color:var(--accent-warm)]/90">
            <Link to="/sign-up">Start your application</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="font-serif text-xl font-bold">{title}</div>
      <p className="mt-2 text-sm text-[color:var(--ink-soft)] leading-relaxed">{body}</p>
    </div>
  );
}
