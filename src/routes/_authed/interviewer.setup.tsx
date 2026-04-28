import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authed/interviewer/setup")({
  head: () => ({ meta: [{ title: "Interviewer setup — RealMock" }] }),
  component: InterviewerSetupPage,
});

const TYPES = [
  { v: "dsa", l: "DSA / Coding" },
  { v: "system_design", l: "System Design" },
  { v: "frontend", l: "Frontend" },
  { v: "backend", l: "Backend" },
  { v: "ml", l: "ML / Data" },
  { v: "behavioral", l: "Behavioral" },
  { v: "hr", l: "HR" },
  { v: "pm", l: "Product Management" },
] as const;

const schema = z.object({
  company: z.string().trim().min(2).max(100),
  job_role: z.string().trim().min(2).max(100),
  years_experience: z.number().min(0).max(50),
  experience_level: z.enum(["entry", "junior", "mid", "senior", "staff", "principal"]),
  company_tier: z.enum(["product_based", "service_based", "startup", "other"]),
  linkedin_url: z.string().trim().url("Enter a valid LinkedIn URL").max(255),
  bio: z.string().trim().min(40, "At least 40 characters").max(1000),
  hourly_rate: z.number().min(500).max(50000),
  expertise: z.array(z.string()).min(1, "Pick at least one expertise"),
  accepts_resume_reviews: z.boolean(),
});

function InterviewerSetupPage() {
  const { user, refreshRoles, roles } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    company: "",
    job_role: "",
    years_experience: 3,
    experience_level: "mid" as const,
    company_tier: "product_based" as const,
    linkedin_url: "",
    bio: "",
    hourly_rate: 3000,
    expertise: [] as string[],
    accepts_resume_reviews: false,
  });
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("interviewer_profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        setForm({
          company: data.company,
          job_role: data.job_role,
          years_experience: data.years_experience,
          experience_level: data.experience_level as never,
          company_tier: data.company_tier as never,
          linkedin_url: data.linkedin_url ?? "",
          bio: data.bio ?? "",
          hourly_rate: data.hourly_rate,
          expertise: (data.expertise as string[]) ?? [],
          accepts_resume_reviews: data.accepts_resume_reviews,
        });
        setStatus(data.verification_status);
      }
    })();
  }, [user]);

  const toggleExp = (v: string) => {
    setForm((f) => ({
      ...f,
      expertise: f.expertise.includes(v) ? f.expertise.filter((x) => x !== v) : [...f.expertise, v],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);

    // Ensure interviewer role exists
    if (!roles.includes("interviewer")) {
      await supabase.from("user_roles").insert({ user_id: user.id, role: "interviewer" });
      await refreshRoles();
    }

    const { error } = await supabase.from("interviewer_profiles").upsert({
      user_id: user.id,
      ...parsed.data,
      expertise: parsed.data.expertise as never,
    });

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(status === "verified" ? "Profile updated" : "Application submitted — we'll review within 1–2 business days");
    navigate({ to: "/interviewer" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-12">
        <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--ink-soft)] mb-2">Interviewer application</div>
        <h1 className="font-serif text-4xl font-bold">Tell us where you work.</h1>
        <p className="mt-2 text-[color:var(--ink-soft)]">We verify every interviewer manually before they appear on the platform.</p>

        {status && (
          <div className="mt-6 rounded-2xl border border-border bg-card px-5 py-4 text-sm">
            <span className="text-[color:var(--ink-soft)]">Verification status:</span>{" "}
            <strong className={status === "verified" ? "text-[color:var(--success)]" : status === "rejected" ? "text-[color:var(--destructive)]" : ""}>
              {status.toUpperCase()}
            </strong>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <Card className="p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company">Company</Label>
                <Input id="company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="mt-1.5 h-11" required />
              </div>
              <div>
                <Label>Company type</Label>
                <Select value={form.company_tier} onValueChange={(v) => setForm({ ...form, company_tier: v as never })}>
                  <SelectTrigger className="mt-1.5 h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product_based">Product-based</SelectItem>
                    <SelectItem value="service_based">Service-based</SelectItem>
                    <SelectItem value="startup">Startup</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="job_role">Your current role</Label>
              <Input id="job_role" placeholder="Senior Software Engineer" value={form.job_role} onChange={(e) => setForm({ ...form, job_role: e.target.value })} className="mt-1.5 h-11" required />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="years">Years of experience</Label>
                <Input id="years" type="number" min={0} max={50} value={form.years_experience} onChange={(e) => setForm({ ...form, years_experience: Number(e.target.value) })} className="mt-1.5 h-11" />
              </div>
              <div>
                <Label>Level</Label>
                <Select value={form.experience_level} onValueChange={(v) => setForm({ ...form, experience_level: v as never })}>
                  <SelectTrigger className="mt-1.5 h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mid">Mid</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="principal">Principal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="linkedin">LinkedIn URL</Label>
              <Input id="linkedin" placeholder="https://linkedin.com/in/…" value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} className="mt-1.5 h-11" required />
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div>
              <Label>I can interview for…</Label>
              <div className="mt-3 grid sm:grid-cols-2 gap-2">
                {TYPES.map((t) => (
                  <label key={t.v} className={`flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer ${form.expertise.includes(t.v) ? "border-[color:var(--accent-warm)] bg-[color:var(--accent-warm)]/5" : "border-border"}`}>
                    <Checkbox checked={form.expertise.includes(t.v)} onCheckedChange={() => toggleExp(t.v)} />
                    <span className="text-sm">{t.l}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="bio">Short bio</Label>
              <Textarea id="bio" placeholder="Brief intro for candidates — what you specialize in, your interviewing style." value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="mt-1.5 min-h-[100px]" />
            </div>
            <div>
              <Label htmlFor="rate">Hourly rate (in cents — e.g. 3000 = $30)</Label>
              <Input id="rate" type="number" min={500} step={100} value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: Number(e.target.value) })} className="mt-1.5 h-11" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.accepts_resume_reviews} onCheckedChange={(v) => setForm({ ...form, accepts_resume_reviews: !!v })} />
              I'm available for resume reviews
            </label>
          </Card>

          <Button type="submit" disabled={saving} className="rounded-full bg-[color:var(--accent-warm)] text-[color:var(--accent-warm-foreground)] hover:bg-[color:var(--accent-warm)]/90 px-7 h-11">
            {saving ? "Saving…" : status === "verified" ? "Update profile" : "Submit application"}
          </Button>
        </form>
      </main>
    </div>
  );
}
