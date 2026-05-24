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
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

export const Route = createFileRoute("/_authed/candidate/setup")({
  head: () => ({ meta: [{ title: "Candidate setup — RealMock" }] }),
  component: CandidateSetupPage,
});

// Same skill list as interviewer so matching works
const SKILLS = [
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
  target_role: z.string().trim().min(2, "At least 2 characters").max(100),
  target_companies: z.array(z.string().trim().min(1)).max(20),
  target_company_tier: z.enum(["product_based", "service_based", "startup", "other"]),
  experience_level: z.enum(["entry", "junior", "mid", "senior", "staff", "principal"]),
  skills: z.array(z.string()).min(1, "Pick at least one skill area"),
  resume_url: z
    .string()
    .trim()
    .url("Enter a valid URL")
    .max(500)
    .or(z.literal("")),
});

type FormState = {
  target_role: string;
  target_companies: string[];
  target_company_tier: "product_based" | "service_based" | "startup" | "other";
  experience_level: "entry" | "junior" | "mid" | "senior" | "staff" | "principal";
  skills: string[];
  resume_url: string;
};

function CandidateSetupPage() {
  const { user, roles, refreshRoles } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>({
    target_role: "",
    target_companies: [],
    target_company_tier: "product_based",
    experience_level: "entry",
    skills: [],
    resume_url: "",
  });

  const [companyInput, setCompanyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState(false);

  // Load existing profile
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("candidate_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setExisting(true);
        setForm({
          target_role: data.target_role ?? "",
          target_companies: (data.target_companies as string[]) ?? [],
          target_company_tier:
            (data.target_company_tier as FormState["target_company_tier"]) ?? "product_based",
          experience_level:
            (data.experience_level as FormState["experience_level"]) ?? "entry",
          skills: (data.skills as string[]) ?? [],
          resume_url: data.resume_url ?? "",
        });
      }
    })();
  }, [user]);

  // Company tag input — press Enter or comma to add
  const addCompany = () => {
    const val = companyInput.trim();
    if (!val || form.target_companies.includes(val)) {
      setCompanyInput("");
      return;
    }
    setForm((f) => ({ ...f, target_companies: [...f.target_companies, val] }));
    setCompanyInput("");
  };

  const removeCompany = (c: string) => {
    setForm((f) => ({
      ...f,
      target_companies: f.target_companies.filter((x) => x !== c),
    }));
  };

  const toggleSkill = (v: string) => {
    setForm((f) => ({
      ...f,
      skills: f.skills.includes(v)
        ? f.skills.filter((x) => x !== v)
        : [...f.skills, v],
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

    // Assign candidate role if not already present
    if (!roles.includes("candidate")) {
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, role: "candidate" });

      // 23505 = unique_violation — role already exists, safe to ignore
      if (roleError && roleError.code !== "23505") {
        toast.error(roleError.message);
        setSaving(false);
        return;
      }

      await refreshRoles();
    }

    const { error } = await supabase.from("candidate_profiles").upsert({
      user_id: user.id,
      target_role: parsed.data.target_role,
      target_companies: parsed.data.target_companies as never,
      target_company_tier: parsed.data.target_company_tier,
      experience_level: parsed.data.experience_level,
      skills: parsed.data.skills as never,
      resume_url: parsed.data.resume_url || null,
    });

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(
      existing
        ? "Profile updated"
        : "You're set up as a candidate — go book a mock!"
    );
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-12">
        <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--ink-soft)] mb-2">
          Candidate profile
        </div>
        <h1 className="font-serif text-4xl font-bold">Tell us what you're aiming for.</h1>
        <p className="mt-2 text-[color:var(--ink-soft)]">
          This helps us match you with the right interviewers for your goals.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {/* Section 1 — Role & level */}
          <Card className="p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="target_role">Target role</Label>
                <Input
                  id="target_role"
                  placeholder="Software Engineer, PM, Data Scientist…"
                  value={form.target_role}
                  onChange={(e) => setForm({ ...form, target_role: e.target.value })}
                  className="mt-1.5 h-11"
                  required
                />
              </div>
              <div>
                <Label>Experience level</Label>
                <Select
                  value={form.experience_level}
                  onValueChange={(v) =>
                    setForm({ ...form, experience_level: v as FormState["experience_level"] })
                  }
                >
                  <SelectTrigger className="mt-1.5 h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">Entry (0–1 yr)</SelectItem>
                    <SelectItem value="junior">Junior (1–3 yrs)</SelectItem>
                    <SelectItem value="mid">Mid (3–6 yrs)</SelectItem>
                    <SelectItem value="senior">Senior (6–10 yrs)</SelectItem>
                    <SelectItem value="staff">Staff (10+ yrs)</SelectItem>
                    <SelectItem value="principal">Principal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Target companies — tag input */}
            <div>
              <Label htmlFor="companies">Target companies</Label>
              <div className="mt-1.5 flex gap-2">
                <Input
                  id="companies"
                  placeholder="Type a company name, press Enter…"
                  value={companyInput}
                  onChange={(e) => setCompanyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addCompany();
                    }
                  }}
                  className="h-11"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addCompany}
                  className="h-11 px-4 rounded-xl shrink-0"
                >
                  Add
                </Button>
              </div>
              {form.target_companies.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.target_companies.map((c) => (
                    <Badge
                      key={c}
                      variant="secondary"
                      className="rounded-full flex items-center gap-1 pr-1.5"
                    >
                      {c}
                      <button
                        type="button"
                        onClick={() => removeCompany(c)}
                        className="ml-0.5 hover:opacity-70"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Company tier */}
            <div>
              <Label>Preferred company type</Label>
              <Select
                value={form.target_company_tier}
                onValueChange={(v) =>
                  setForm({ ...form, target_company_tier: v as FormState["target_company_tier"] })
                }
              >
                <SelectTrigger className="mt-1.5 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product_based">Product-based</SelectItem>
                  <SelectItem value="service_based">Service-based</SelectItem>
                  <SelectItem value="startup">Startup</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Resume URL */}
            <div>
              <Label htmlFor="resume_url">
                Resume URL{" "}
                <span className="text-[color:var(--ink-soft)] font-normal">(optional)</span>
              </Label>
              <Input
                id="resume_url"
                placeholder="https://drive.google.com/…"
                value={form.resume_url}
                onChange={(e) => setForm({ ...form, resume_url: e.target.value })}
                className="mt-1.5 h-11"
              />
            </div>
          </Card>

          {/* Section 2 — Skills to practice */}
          <Card className="p-6">
            <Label>I want to practice…</Label>
            <div className="mt-3 grid sm:grid-cols-2 gap-2">
              {SKILLS.map((t) => (
                <label
                  key={t.v}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer ${
                    form.skills.includes(t.v)
                      ? "border-[color:var(--accent-warm)] bg-[color:var(--accent-warm)]/5"
                      : "border-border"
                  }`}
                >
                  <Checkbox
                    checked={form.skills.includes(t.v)}
                    onCheckedChange={() => toggleSkill(t.v)}
                  />
                  <span className="text-sm">{t.l}</span>
                </label>
              ))}
            </div>
          </Card>

          <Button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[color:var(--accent-warm)] text-[color:var(--accent-warm-foreground)] hover:bg-[color:var(--accent-warm)]/90 px-7 h-11"
          >
            {saving ? "Saving…" : existing ? "Update profile" : "Create candidate profile"}
          </Button>
        </form>
      </main>
    </div>
  );
}