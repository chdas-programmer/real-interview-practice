import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How RealMock works — Real interviews, real verdicts" },
      { name: "description", content: "Three steps from booking to a hire/no-hire verdict from a verified senior engineer." },
    ],
  }),
  component: HowPage,
});

function HowPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-4xl px-6 py-20">
        <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--ink-soft)] mb-4">How it works</div>
        <h1 className="font-serif text-5xl font-bold leading-tight">Practice like it's real.</h1>
        <p className="mt-5 text-lg text-[color:var(--ink-soft)] max-w-2xl">
          Every interaction on RealMock is designed to feel like the real thing — same pressure, same scrutiny, same
          honest verdict at the end.
        </p>

        <ol className="mt-14 space-y-10">
          <Step n={1} title="Browse and pick">
            Filter by company, role, years of experience, interview type and price. Every interviewer on the platform is
            manually verified by our team — we check their company, role, and LinkedIn.
          </Step>
          <Step n={2} title="Book a real slot">
            Pick a time on their actual calendar. They confirm and send you the meeting link.
          </Step>
          <Step n={3} title="Show up. Get tested.">
            Same format as the real interview — coding, system design, behavioral — with someone who's done thousands.
          </Step>
          <Step n={4} title="Get the verdict">
            Within 24 hours: a hire / no-hire decision plus structured feedback on what to fix.
          </Step>
        </ol>

        <div className="mt-16 rounded-3xl bg-[color:var(--ink)] text-background p-10">
          <h2 className="font-serif text-3xl font-bold">Ready when you are.</h2>
          <p className="mt-2 text-background/70">It only counts if it's real.</p>
          <Button asChild size="lg" className="mt-6 rounded-full bg-[color:var(--accent-warm)] text-[color:var(--accent-warm-foreground)] hover:bg-[color:var(--accent-warm)]/90">
            <Link to="/interviewers">Find an interviewer</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="grid md:grid-cols-[80px_1fr] gap-4">
      <div className="font-serif text-4xl font-bold text-[color:var(--accent-warm)]">0{n}</div>
      <div>
        <div className="font-serif text-2xl font-bold">{title}</div>
        <p className="mt-2 text-[color:var(--ink-soft)] leading-relaxed">{children}</p>
      </div>
    </li>
  );
}
