import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/interviewers")({
  head: () => ({
    meta: [
      { title: "Browse interviewers — RealMock" },
      { name: "description", content: "Find a verified senior engineer from a product company to mock interview you." },
    ],
  }),
  component: BrowsePage,
});

type Interviewer = {
  user_id: string;
  company: string;
  company_tier: string;
  job_role: string;
  years_experience: number;
  experience_level: string;
  expertise: string[];
  bio: string | null;
  hourly_rate: number;
  full_name?: string;
};

const TYPES = [
  { v: "all", l: "All types" },
  { v: "dsa", l: "DSA" },
  { v: "system_design", l: "System Design" },
  { v: "frontend", l: "Frontend" },
  { v: "backend", l: "Backend" },
  { v: "ml", l: "ML" },
  { v: "behavioral", l: "Behavioral" },
  { v: "hr", l: "HR" },
  { v: "pm", l: "PM" },
];

function BrowsePage() {
  const [list, setList] = useState<Interviewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("all");
  const [tier, setTier] = useState("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("interviewer_profiles")
        .select("user_id, company, company_tier, job_role, years_experience, experience_level, expertise, bio, hourly_rate")
        .eq("verification_status", "verified")
        .order("years_experience", { ascending: false });

      const ids = (data ?? []).map((x) => x.user_id);
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, full_name").in("id", ids)
        : { data: [] as { id: string; full_name: string | null }[] };
      const m = new Map((profs ?? []).map((p) => [p.id, p.full_name ?? "Anonymous"]));

      setList((data ?? []).map((d) => ({ ...d, expertise: d.expertise as string[], full_name: m.get(d.user_id) })));
      setLoading(false);
    })();
  }, []);

  const filtered = list.filter((i) => {
    if (type !== "all" && !i.expertise.includes(type)) return false;
    if (tier !== "all" && i.company_tier !== tier) return false;
    if (q && !`${i.full_name} ${i.company} ${i.job_role}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-6xl w-full px-6 py-12">
        <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--ink-soft)] mb-2">Browse</div>
        <h1 className="font-serif text-4xl md:text-5xl font-bold">Verified interviewers.</h1>
        <p className="mt-2 text-[color:var(--ink-soft)]">Every profile here is manually checked.</p>

        <div className="mt-8 grid sm:grid-cols-3 gap-3">
          <Input placeholder="Search by name or company" value={q} onChange={(e) => setQ(e.target.value)} className="h-11" />
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={tier} onValueChange={setTier}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All companies</SelectItem>
              <SelectItem value="product_based">Product-based</SelectItem>
              <SelectItem value="startup">Startup</SelectItem>
              <SelectItem value="service_based">Service-based</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading ? (
            <p className="text-[color:var(--ink-soft)]">Loading…</p>
          ) : filtered.length === 0 ? (
            <Card className="p-8 col-span-full text-center">
              <p className="text-[color:var(--ink-soft)]">
                No interviewers match your filters yet. New pros are joining every week.
              </p>
            </Card>
          ) : (
            filtered.map((i) => <InterviewerCard key={i.user_id} i={i} />)
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function InterviewerCard({ i }: { i: Interviewer }) {
  return (
    <Card className="p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-lg">{i.full_name}</div>
          <div className="text-sm text-[color:var(--ink-soft)]">{i.job_role} @ {i.company}</div>
        </div>
        <Badge variant="outline" className="rounded-full text-xs gap-1 shrink-0">
          <ShieldCheck className="h-3 w-3" /> Verified
        </Badge>
      </div>
      <div className="flex flex-wrap gap-1">
        {i.expertise.slice(0, 4).map((e) => (
          <Badge key={e} variant="secondary" className="rounded-full text-xs capitalize">{e.replace(/_/g, " ")}</Badge>
        ))}
      </div>
      {i.bio && <p className="text-sm text-[color:var(--ink-soft)] line-clamp-3">{i.bio}</p>}
      <div className="flex items-center justify-between mt-auto">
        <div>
          <div className="font-serif text-xl font-bold">${(i.hourly_rate / 100).toFixed(0)}<span className="text-sm font-sans font-normal text-[color:var(--ink-soft)]">/hr</span></div>
          <div className="text-xs text-[color:var(--ink-soft)]">{i.years_experience}+ yrs experience</div>
        </div>
        <Button asChild size="sm" className="rounded-full bg-[color:var(--accent-warm)] text-[color:var(--accent-warm-foreground)] hover:bg-[color:var(--accent-warm)]/90">
          <Link to="/interviewers/$id" params={{ id: i.user_id }}>View & book</Link>
        </Button>
      </div>
    </Card>
  );
}
