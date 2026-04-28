import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const Route = createFileRoute("/sign-up")({
  head: () => ({
    meta: [
      { title: "Sign up — RealMock" },
      { name: "description", content: "Create your RealMock account and book mock interviews with verified pros." },
    ],
  }),
  component: SignUpPage,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your name").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
  role: z.enum(["candidate", "interviewer"]),
});

function SignUpPage() {
  const navigate = useNavigate();
  const [full_name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"candidate" | "interviewer">("candidate");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ full_name, email, password, role });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
        data: {
          full_name: parsed.data.full_name,
          role: parsed.data.role,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created");
    navigate({
      to: parsed.data.role === "interviewer" ? "/interviewer/setup" : "/dashboard",
    });
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/dashboard",
    });
    if (result.error) {
      toast.error("Could not sign up with Google");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <h1 className="font-serif text-4xl font-bold">Get judged.</h1>
          <p className="mt-2 text-[color:var(--ink-soft)]">Before companies do.</p>

          <Button
            onClick={handleGoogle}
            variant="outline"
            className="w-full rounded-full mt-8 h-11"
          >
            Continue with Google
          </Button>
          <div className="my-6 flex items-center gap-3 text-xs text-[color:var(--ink-soft)]">
            <div className="flex-1 h-px bg-border" /> OR <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>I'm joining as a…</Label>
              <RadioGroup
                value={role}
                onValueChange={(v) => setRole(v as "candidate" | "interviewer")}
                className="grid grid-cols-2 gap-3 mt-2"
              >
                <label className={`rounded-2xl border p-4 cursor-pointer transition-colors ${role === "candidate" ? "border-[color:var(--accent-warm)] bg-[color:var(--accent-warm)]/5" : "border-border"}`}>
                  <RadioGroupItem value="candidate" className="sr-only" />
                  <div className="font-medium">Candidate</div>
                  <div className="text-xs text-[color:var(--ink-soft)] mt-1">Practice with real pros</div>
                </label>
                <label className={`rounded-2xl border p-4 cursor-pointer transition-colors ${role === "interviewer" ? "border-[color:var(--accent-warm)] bg-[color:var(--accent-warm)]/5" : "border-border"}`}>
                  <RadioGroupItem value="interviewer" className="sr-only" />
                  <div className="font-medium">Interviewer</div>
                  <div className="text-xs text-[color:var(--ink-soft)] mt-1">Apply to interview others</div>
                </label>
              </RadioGroup>
            </div>
            <div>
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" value={full_name} onChange={(e) => setName(e.target.value)} className="mt-1.5 h-11" required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 h-11" required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 h-11" required />
              <p className="text-xs text-[color:var(--ink-soft)] mt-1">8+ characters.</p>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-full h-11 bg-[color:var(--accent-warm)] text-[color:var(--accent-warm-foreground)] hover:bg-[color:var(--accent-warm)]/90"
            >
              {loading ? "Creating…" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-center text-[color:var(--ink-soft)]">
            Already have an account?{" "}
            <Link to="/sign-in" className="text-foreground font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
