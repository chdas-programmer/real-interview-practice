import { createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/_authed/profile")({
  head: () => ({ meta: [{ title: "My profile — RealMock" }] }),
  component: ProfilePage,
});

const schema = z.object({
  full_name: z.string().trim().min(2).max(100),
  headline: z.string().trim().max(160).optional(),
  target_role: z.string().trim().max(100).optional(),
  target_company_tier: z.enum(["product_based", "service_based", "startup", "other"]),
  experience_level: z.enum(["entry", "junior", "mid", "senior", "staff", "principal"]),
  skills: z.string().max(500).optional(),
  target_companies: z.string().max(500).optional(),
});

function ProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    full_name: "",
    headline: "",
    target_role: "",
    target_company_tier: "product_based" as const,
    experience_level: "entry" as const,
    skills: "",
    target_companies: "",
  });
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: cp }] = await Promise.all([
        supabase.from("profiles").select("full_name, headline").eq("id", user.id).maybeSingle(),
        supabase.from("candidate_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      setForm((f) => ({
        ...f,
        full_name: p?.full_name ?? "",
        headline: p?.headline ?? "",
        target_role: cp?.target_role ?? "",
        target_company_tier: (cp?.target_company_tier as never) ?? "product_based",
        experience_level: (cp?.experience_level as never) ?? "entry",
        skills: (cp?.skills ?? []).join(", "),
        target_companies: (cp?.target_companies ?? []).join(", "),
      }));
      setResumeUrl(cp?.resume_url ?? null);
    })();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    const skills = (parsed.data.skills ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const target_companies = (parsed.data.target_companies ?? "").split(",").map((s) => s.trim()).filter(Boolean);

    const [r1, r2] = await Promise.all([
      supabase.from("profiles").update({ full_name: parsed.data.full_name, headline: parsed.data.headline ?? null }).eq("id", user.id),
      supabase.from("candidate_profiles").upsert({
        user_id: user.id,
        target_role: parsed.data.target_role ?? null,
        target_company_tier: parsed.data.target_company_tier,
        experience_level: parsed.data.experience_level,
        skills,
        target_companies,
      }),
    ]);
    setSaving(false);
    if (r1.error || r2.error) {
      toast.error(r1.error?.message ?? r2.error?.message ?? "Save failed");
      return;
    }
    toast.success("Profile saved");
  };

  const handleResume = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Max 5MB");
      return;
    }
    setUploading(true);
    const path = `${user.id}/resume-${Date.now()}.pdf`;
    const { error } = await supabase.storage.from("resumes").upload(path, file, { contentType: file.type, upsert: true });
    if (error) {
      setUploading(false);
      toast.error(error.message);
      return;
    }
    await supabase.from("candidate_profiles").upsert({ user_id: user.id, resume_url: path });
    setResumeUrl(path);
    setUploading(false);
    toast.success("Resume uploaded");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-12">
        <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--ink-soft)] mb-2">Candidate profile</div>
        <h1 className="font-serif text-4xl font-bold">Your profile</h1>

        <form onSubmit={handleSave} className="mt-8 space-y-5">
          <Card className="p-6 space-y-4">
            <div>
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-1.5 h-11" />
            </div>
            <div>
              <Label htmlFor="headline">Headline</Label>
              <Input id="headline" placeholder="e.g. Senior backend engineer targeting FAANG" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} className="mt-1.5 h-11" />
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div>
              <Label htmlFor="target_role">Target role</Label>
              <Input id="target_role" placeholder="e.g. Senior Backend Engineer" value={form.target_role} onChange={(e) => setForm({ ...form, target_role: e.target.value })} className="mt-1.5 h-11" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Target company type</Label>
                <Select value={form.target_company_tier} onValueChange={(v) => setForm({ ...form, target_company_tier: v as never })}>
                  <SelectTrigger className="mt-1.5 h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product_based">Product-based</SelectItem>
                    <SelectItem value="service_based">Service-based</SelectItem>
                    <SelectItem value="startup">Startup</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Experience level</Label>
                <Select value={form.experience_level} onValueChange={(v) => setForm({ ...form, experience_level: v as never })}>
                  <SelectTrigger className="mt-1.5 h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">Entry (0–1 yr)</SelectItem>
                    <SelectItem value="junior">Junior (1–3 yr)</SelectItem>
                    <SelectItem value="mid">Mid (3–6 yr)</SelectItem>
                    <SelectItem value="senior">Senior (6–10 yr)</SelectItem>
                    <SelectItem value="staff">Staff (10+ yr)</SelectItem>
                    <SelectItem value="principal">Principal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="target_companies">Target companies (comma-separated)</Label>
              <Input id="target_companies" placeholder="Google, Meta, Stripe" value={form.target_companies} onChange={(e) => setForm({ ...form, target_companies: e.target.value })} className="mt-1.5 h-11" />
            </div>
            <div>
              <Label htmlFor="skills">Skills (comma-separated)</Label>
              <Textarea id="skills" placeholder="Go, Postgres, Kubernetes, distributed systems" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} className="mt-1.5" />
            </div>
          </Card>

          <Card className="p-6">
            <Label>Resume (PDF)</Label>
            <div className="mt-2 flex items-center gap-3">
              <input type="file" accept="application/pdf" onChange={handleResume} disabled={uploading} className="block text-sm" />
              {resumeUrl && <span className="text-xs text-[color:var(--ink-soft)]">Uploaded ✓</span>}
            </div>
          </Card>

          <Button type="submit" disabled={saving} className="rounded-full bg-[color:var(--accent-warm)] text-[color:var(--accent-warm-foreground)] hover:bg-[color:var(--accent-warm)]/90 px-7 h-11">
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </form>
      </main>
    </div>
  );
}
