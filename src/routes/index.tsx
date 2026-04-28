import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RealMock — Get judged before companies judge you" },
      {
        name: "description",
        content:
          "Mock interviews with verified engineers from product-based companies. Real pressure, honest hire/no-hire feedback.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pt-20 pb-24">
          <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--ink-soft)] mb-6">
            No courses. Only reality.
          </div>
          <h1 className="font-serif text-5xl md:text-7xl font-bold leading-[1.05] max-w-4xl">
            You learn anywhere.{" "}
            <em className="text-[color:var(--accent-warm)] not-italic font-semibold italic">
              We test you in reality.
            </em>
          </h1>
          <p className="mt-7 text-lg text-[color:var(--ink-soft)] max-w-2xl leading-relaxed">
            Mock interviews with senior engineers from product companies. Get an honest hire / no-hire
            verdict — and the feedback to fix what's actually breaking — before it counts.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-[color:var(--accent-warm)] text-[color:var(--accent-warm-foreground)] hover:bg-[color:var(--accent-warm)]/90 px-7"
            >
              <Link to="/interviewers">Find an interviewer</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-[color:var(--border)] px-7"
            >
              <Link to="/become-interviewer">Become an interviewer</Link>
            </Button>
          </div>

          {/* Trust strip */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <TrustCard label="Verified interviewers" value="240+" />
            <TrustCard label="Avg feedback rating" value="4.8/5" />
            <TrustCard label="Engineers from" value="FAANG + product cos." />
          </div>
        </section>

        {/* What this is NOT */}
        <section className="border-y border-border/70 bg-[color:var(--surface)]">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="grid md:grid-cols-3 gap-8">
              <Negative title="Not a course." body="Knowledge is everywhere. Practice with real pressure isn't." />
              <Negative title="Not an AI." body="No language model can replicate a senior engineer leaning in to ask why." />
              <Negative title="Not a peer." body="Same level as you = same blind spots. We only allow people above your level." />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-6 py-24">
          <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--ink-soft)] mb-3">
            How it works
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-bold max-w-2xl">
            Three steps. Then a real verdict.
          </h2>
          <div className="mt-12 grid md:grid-cols-3 gap-8">
            <Step n={1} title="Pick an interviewer" body="Filter by company, role, and interview type. Every interviewer is manually verified — no exceptions." />
            <Step n={2} title="Book a slot" body="Their real calendar. Pick a time that works. Show up on the meeting link they send." />
            <Step n={3} title="Get the verdict" body="Hire / no-hire decision with structured feedback on what to fix before the real interview." />
          </div>
        </section>

        {/* Big CTA */}
        <section className="mx-auto max-w-5xl px-6 pb-24">
          <div className="rounded-3xl bg-[color:var(--ink)] text-background p-10 md:p-16">
            <h3 className="font-serif text-3xl md:text-5xl font-bold leading-tight max-w-2xl">
              The interview before the interview.
            </h3>
            <p className="mt-4 text-background/70 max-w-xl">
              Stop guessing if you're ready. Find out from the people who'd actually hire you.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-[color:var(--accent-warm)] text-[color:var(--accent-warm-foreground)] hover:bg-[color:var(--accent-warm)]/90 px-7"
              >
                <Link to="/sign-up">Book your first mock</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function TrustCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-5 py-4">
      <div className="font-serif text-2xl font-bold">{value}</div>
      <div className="text-sm text-[color:var(--ink-soft)] mt-1">{label}</div>
    </div>
  );
}

function Negative({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 font-serif text-2xl font-bold">
        <span className="text-[color:var(--accent-warm)]">×</span> {title}
      </div>
      <p className="mt-3 text-[color:var(--ink-soft)] leading-relaxed">{body}</p>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="font-serif text-3xl font-bold text-[color:var(--accent-warm)]">0{n}</div>
      <div className="mt-3 font-medium text-lg">{title}</div>
      <p className="mt-2 text-sm text-[color:var(--ink-soft)] leading-relaxed">{body}</p>
    </div>
  );
}
