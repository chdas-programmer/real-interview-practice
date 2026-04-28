import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format, addDays, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authed/interviewer/")({
  head: () => ({ meta: [{ title: "Interviewer hub — RealMock" }] }),
  component: InterviewerHubPage,
});

type Slot = { id: string; start_at: string; end_at: string; is_booked: boolean };
type Booking = {
  id: string;
  scheduled_at: string;
  status: string;
  interview_type: string;
  candidate_id: string;
  meeting_link: string | null;
  candidate_name?: string;
};

function InterviewerHubPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ verification_status: string } | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [date, setDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [time, setTime] = useState("18:00");
  const [duration, setDuration] = useState(60);

  const load = async () => {
    if (!user) return;
    const [{ data: p }, { data: s }, { data: b }] = await Promise.all([
      supabase.from("interviewer_profiles").select("verification_status").eq("user_id", user.id).maybeSingle(),
      supabase.from("availability_slots").select("*").eq("interviewer_id", user.id).order("start_at"),
      supabase.from("bookings").select("id, scheduled_at, status, interview_type, candidate_id, meeting_link").eq("interviewer_id", user.id).order("scheduled_at", { ascending: false }),
    ]);
    setProfile(p);
    setSlots((s ?? []).filter((x) => new Date(x.start_at).getTime() >= startOfDay(new Date()).getTime()));
    if (b && b.length) {
      const ids = Array.from(new Set(b.map((x) => x.candidate_id)));
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const m = new Map((profs ?? []).map((p) => [p.id, p.full_name ?? "User"]));
      setBookings(b.map((x) => ({ ...x, candidate_name: m.get(x.candidate_id) ?? "User" })));
    } else setBookings([]);
  };

  useEffect(() => { load(); }, [user]);

  const addSlot = async () => {
    if (!user) return;
    const start = new Date(`${date}T${time}:00`);
    const end = new Date(start.getTime() + duration * 60000);
    if (start.getTime() < Date.now()) {
      toast.error("Pick a future time");
      return;
    }
    const { error } = await supabase.from("availability_slots").insert({
      interviewer_id: user.id,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Slot added");
    load();
  };

  const removeSlot = async (id: string) => {
    const { error } = await supabase.from("availability_slots").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    load();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-12">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--ink-soft)] mb-2">Interviewer hub</div>
            <h1 className="font-serif text-4xl font-bold">Your interviewer hub</h1>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/interviewer/setup">Edit profile</Link>
          </Button>
        </div>

        {profile?.verification_status !== "verified" && (
          <Card className="mt-6 p-5 border-[color:var(--accent-warm)]/30 bg-[color:var(--accent-warm)]/5">
            <div className="font-medium">Pending verification</div>
            <p className="text-sm text-[color:var(--ink-soft)] mt-1">
              Your profile won't appear in the candidate browse list until our team verifies you (1–2 business days).
            </p>
          </Card>
        )}

        <div className="mt-10 grid lg:grid-cols-2 gap-8">
          <section>
            <h2 className="font-serif text-2xl font-bold mb-4">Availability</h2>
            <Card className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-[color:var(--ink-soft)]">Date</label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 h-10" />
                </div>
                <div>
                  <label className="text-xs text-[color:var(--ink-soft)]">Time</label>
                  <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 h-10" />
                </div>
                <div>
                  <label className="text-xs text-[color:var(--ink-soft)]">Min</label>
                  <Input type="number" step={15} min={15} max={180} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="mt-1 h-10" />
                </div>
                <div className="flex items-end">
                  <Button onClick={addSlot} className="w-full rounded-full bg-[color:var(--accent-warm)] text-[color:var(--accent-warm-foreground)] hover:bg-[color:var(--accent-warm)]/90 h-10">Add slot</Button>
                </div>
              </div>
            </Card>

            <div className="mt-4 space-y-2">
              {slots.length === 0 ? (
                <p className="text-sm text-[color:var(--ink-soft)]">No upcoming slots.</p>
              ) : (
                slots.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                    <div className="text-sm">
                      <div className="font-medium">{format(new Date(s.start_at), "EEE, MMM d • h:mm a")}</div>
                      <div className="text-[color:var(--ink-soft)] text-xs">
                        {Math.round((new Date(s.end_at).getTime() - new Date(s.start_at).getTime()) / 60000)} min · {s.is_booked ? "Booked" : "Open"}
                      </div>
                    </div>
                    {!s.is_booked && (
                      <Button size="sm" variant="ghost" className="rounded-full" onClick={() => removeSlot(s.id)}>Remove</Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-bold mb-4">Booking requests</h2>
            {bookings.length === 0 ? (
              <p className="text-sm text-[color:var(--ink-soft)]">No bookings yet.</p>
            ) : (
              <div className="space-y-3">
                {bookings.map((b) => (
                  <Card key={b.id} className="p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {b.candidate_name}
                          <Badge variant="outline" className="rounded-full text-xs">{b.status.replace(/_/g, " ")}</Badge>
                        </div>
                        <div className="text-xs text-[color:var(--ink-soft)] mt-1">
                          {format(new Date(b.scheduled_at), "EEE, MMM d • h:mm a")} · {b.interview_type.replace(/_/g, " ")}
                        </div>
                      </div>
                      <Button asChild size="sm" variant="outline" className="rounded-full">
                        <Link to="/booking/$id" params={{ id: b.id }}>Open</Link>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
