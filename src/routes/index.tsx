import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";
import { StarRating } from "@/components/star-rating";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RealMock — Get judged before companies judge you" },
      {
        name: "description",
        content:
          "Mock interviews with verified engineers from Google, Amazon, Microsoft and more. Real pressure, honest hire/no-hire feedback.",
      },
    ],
  }),
  component: HomePage,
});

type TopInterviewer = {
  user_id: string;
  full_name: string;
  company: string;
  job_role: string;
  avg: number;
  count: number;
};

function HomePage() {
  const [top, setTop] = useState<TopInterviewer[]>([]);

  useEffect(() => {
    (async () => {
      const { data: ips } = await supabase
        .from("interviewer_profiles")
        .select("user_id, company, job_role")
        .eq("verification_status", "verified")
        .limit(20);
      if (!ips || ips.length === 0) return;
      const ids = ips.map((i) => i.user_id);
      const [{ data: revs }, { data: profs }] = await Promise.all([
        supabase.from("reviews").select("reviewee_id, rating").in("reviewee_id", ids),
        supabase.from("profiles").select("id, full_name").in("id", ids),
      ]);
      const agg = new Map<string, { sum: number; n: number }>();
      (revs ?? []).forEach((r) => {
        const cur = agg.get(r.reviewee_id) ?? { sum: 0, n: 0 };
        cur.sum += r.rating;
        cur.n += 1;
        agg.set(r.reviewee_id, cur);
      });
      const nameMap = new Map((profs ?? []).map((p) => [p.id, p.full_name ?? "Anonymous"]));
      const merged: TopInterviewer[] = ips
        .map((i) => {
          const a = agg.get(i.user_id);
          return {
            user_id: i.user_id,
            full_name: nameMap.get(i.user_id) ?? "Anonymous",
            company: i.company,
            job_role: i.job_role,
            avg: a ? a.sum / a.n : 0,
            count: a?.n ?? 0,
          };
        })
        .filter((x) => x.count > 0)
        .sort((a, b) => b.avg - a.avg || b.count - a.count)
        .slice(0, 3);
      setTop(merged);
    })();
  }, []);

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
            <Button asChild size="lg" variant="outline" className="rounded-full border-[color:var(--border)] px-7">
              <Link to="/become-interviewer">Become an interviewer</Link>
            </Button>
          </div>

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <TrustCard label="Verified interviewers" value="240+" />
            <TrustCard label="Avg feedback rating" value="4.8/5" />
            <TrustCard label="Engineers from" value="FAANG + product cos." />
          </div>
        </section>

        {/* Company logos strip */}
        <section className="border-y border-border/70 bg-[color:var(--surface)]">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--ink-soft)] text-center mb-8">
              Our interviewers come from
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-70">
              {["Google", "Amazon", "Microsoft", "Meta", "Netflix", "Stripe", "Apple", "Uber"].map((c) => (
                <div key={c} className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-[color:var(--ink)]">
                  {c}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What this is NOT */}
        <section className="mx-auto max-w-6xl px-6 py-24">
          <div className="grid md:grid-cols-3 gap-8">
            <Negative title="Not a course." body="Knowledge is everywhere. Practice with real pressure isn't." />
            <Negative title="Not an AI." body="No language model can replicate a senior engineer leaning in to ask why." />
            <Negative title="Not a peer." body="Same level as you = same blind spots. We only allow people above your level." />
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--ink-soft)] mb-3">How it works</div>
          <h2 className="font-serif text-3xl md:text-4xl font-bold max-w-2xl">Three steps. Then a real verdict.</h2>
          <div className="mt-12 grid md:grid-cols-3 gap-8">
            <Step n={1} title="Pick an interviewer" body="Filter by company, role, and interview type. Every interviewer is manually verified." />
            <Step n={2} title="Book & pay" body="Pick a slot, pay securely. First session is on us. Show up — we host the meeting." />
            <Step n={3} title="Get the verdict" body="Hire / no-hire decision with structured feedback on what to fix before the real interview." />
          </div>
        </section>

        {/* Top interviewers */}
        {top.length > 0 && (
          <section className="border-t border-border/70 bg-[color:var(--surface)]">
            <div className="mx-auto max-w-6xl px-6 py-20">
              <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--ink-soft)] mb-3">Top rated</div>
              <h2 className="font-serif text-3xl md:text-4xl font-bold">The best in the room.</h2>
              <div className="mt-10 grid md:grid-cols-3 gap-5">
                {top.map((t) => (
                  <Card key={t.user_id} className="p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-lg">{t.full_name}</div>
                        <div className="text-sm text-[color:var(--ink-soft)]">{t.job_role} @ {t.company}</div>
                      </div>
                      <Badge variant="outline" className="rounded-full text-xs gap-1 shrink-0">
                        <ShieldCheck className="h-3 w-3" /> Top
                      </Badge>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <StarRating value={Math.round(t.avg)} readOnly size={16} />
                      <span className="text-sm font-medium">{t.avg.toFixed(1)}</span>
                      <span className="text-sm text-[color:var(--ink-soft)]">({t.count})</span>
                    </div>
                    <Button asChild size="sm" className="mt-5 rounded-full bg-[color:var(--accent-warm)] text-[color:var(--accent-warm-foreground)] hover:bg-[color:var(--accent-warm)]/90">
                      <Link to="/interviewers/$id" params={{ id: t.user_id }}>View profile</Link>
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Testimonials */}
        <section className="mx-auto max-w-6xl px-6 py-24">
          <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--ink-soft)] mb-3">What candidates say</div>
          <h2 className="font-serif text-3xl md:text-4xl font-bold max-w-2xl">Real outcomes. Honest words.</h2>
          <div className="mt-10 grid md:grid-cols-3 gap-5">
            <Testimonial
              quote="The first mock destroyed me. The second I aced my onsite. Worth every rupee."
              name="Priya S."
              role="SWE @ Razorpay"
            />
            <Testimonial
              quote="Got a 'no-hire' from a Meta engineer. Two weeks later I cleared a Meta loop. Nothing teaches like that."
              name="Arjun M."
              role="SDE-2 @ Meta"
            />
            <Testimonial
              quote="The feedback was specific. Not 'study DSA more' — exactly which patterns I missed."
              name="Sneha R."
              role="Frontend @ Atlassian"
            />
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

function Testimonial({ quote, name, role }: { quote: string; name: string; role: string }) {
  return (
    <Card className="p-6">
      <p className="font-serif text-lg leading-relaxed">"{quote}"</p>
      <div className="mt-5">
        <div className="font-medium">{name}</div>
        <div className="text-sm text-[color:var(--ink-soft)]">{role}</div>
      </div>
    </Card>
  );
}
