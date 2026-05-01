import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/interviewers/$id")({
  head: () => ({ meta: [{ title: "Interviewer profile — RealMock" }] }),
  component: InterviewerDetail,
});

type Slot = { id: string; start_at: string; end_at: string; is_booked: boolean };

function InterviewerDetail() {
  const { id } = Route.useParams();
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [pickedSlot, setPickedSlot] = useState<string | null>(null);
  const [type, setType] = useState("dsa");
  const [notes, setNotes] = useState("");
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: ip }, { data: prof }, { data: s }] = await Promise.all([
        supabase.from("interviewer_profiles").select("*").eq("user_id", id).maybeSingle(),
        supabase.from("profiles").select("full_name, headline").eq("id", id).maybeSingle(),
        supabase.from("availability_slots").select("*").eq("interviewer_id", id).eq("is_booked", false).order("start_at"),
      ]);
      setProfile({ ...ip, full_name: prof?.full_name, headline: prof?.headline });
      setSlots((s ?? []).filter((x) => new Date(x.start_at).getTime() > Date.now()));
    })();
  }, [id]);

  const book = async () => {
    if (!user) {
      navigate({ to: "/sign-in" });
      return;
    }
    if (!roles.includes("candidate")) {
      toast.error("Only candidate accounts can book");
      return;
    }
    if (!pickedSlot) {
      toast.error("Pick a slot");
      return;
    }
    const slot = slots.find((s) => s.id === pickedSlot);
    if (!slot) return;
    const duration = Math.round((new Date(slot.end_at).getTime() - new Date(slot.start_at).getTime()) / 60000);
    setBooking(true);
    const { data, error } = await supabase.from("bookings").insert({
      candidate_id: user.id,
      interviewer_id: id,
      slot_id: slot.id,
      interview_type: type as never,
      scheduled_at: slot.start_at,
      end_at: slot.end_at,
      duration_minutes: duration,
      candidate_notes: notes || null,
      price_cents: Math.round((profile?.hourly_rate ?? 0) * (duration / 60)),
    }).select("id").single();

    if (!error) {
      await supabase.from("availability_slots").update({ is_booked: true }).eq("id", slot.id);
    }
    setBooking(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Booking requested");
    navigate({ to: "/booking/$id", params: { id: data!.id } });
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-4xl px-6 py-16 text-[color:var(--ink-soft)]">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-12">
        <div className="grid lg:grid-cols-[1fr_360px] gap-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="rounded-full gap-1 text-xs">
                <ShieldCheck className="h-3 w-3" /> Verified
              </Badge>
              <Badge variant="secondary" className="rounded-full text-xs capitalize">{profile.company_tier?.replace(/_/g, " ")}</Badge>
            </div>
            <h1 className="font-serif text-4xl md:text-5xl font-bold">{profile.full_name}</h1>
            <p className="mt-2 text-[color:var(--ink-soft)] text-lg">{profile.job_role} @ {profile.company} · {profile.years_experience}+ yrs</p>
            {profile.bio && <p className="mt-6 leading-relaxed">{profile.bio}</p>}
            <div className="mt-6 flex flex-wrap gap-2">
              {(profile.expertise as string[]).map((e) => (
                <Badge key={e} variant="secondary" className="rounded-full capitalize">{e.replace(/_/g, " ")}</Badge>
              ))}
            </div>
          </div>

          <Card className="p-6 h-fit lg:sticky lg:top-24">
            <div className="font-serif text-2xl font-bold">${(profile.hourly_rate / 100).toFixed(0)}<span className="text-sm font-sans font-normal text-[color:var(--ink-soft)]">/hr</span></div>
            <div className="mt-5">
              <label className="text-xs uppercase tracking-wider text-[color:var(--ink-soft)]">Interview type</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="mt-1.5 h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(profile.expertise as string[]).map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="mt-4">
              <label className="text-xs uppercase tracking-wider text-[color:var(--ink-soft)]">Pick a slot</label>
              <div className="mt-2 max-h-60 overflow-y-auto space-y-1.5">
                {slots.length === 0 ? (
                  <p className="text-sm text-[color:var(--ink-soft)]">No open slots right now.</p>
                ) : slots.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setPickedSlot(s.id)}
                    className={`w-full text-left text-sm rounded-xl border px-3 py-2 transition ${pickedSlot === s.id ? "border-[color:var(--accent-warm)] bg-[color:var(--accent-warm)]/10" : "border-border hover:border-[color:var(--ink-soft)]"}`}
                  >
                    {format(new Date(s.start_at), "EEE, MMM d • h:mm a")}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <label className="text-xs uppercase tracking-wider text-[color:var(--ink-soft)]">Notes (optional)</label>
              <Textarea placeholder="What you want to focus on" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1.5" maxLength={500} />
            </div>
            <Button onClick={book} disabled={booking || slots.length === 0} className="mt-5 w-full rounded-full h-11 bg-[color:var(--accent-warm)] text-[color:var(--accent-warm-foreground)] hover:bg-[color:var(--accent-warm)]/90">
              {booking ? "Requesting…" : "Request booking"}
            </Button>
            <p className="mt-3 text-xs text-[color:var(--ink-soft)] text-center">
              {user ? "You'll get a confirmation when they accept." : <Link to="/sign-in" className="underline">Sign in to book</Link>}
            </p>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
