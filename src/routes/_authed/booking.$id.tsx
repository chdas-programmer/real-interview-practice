import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authed/booking/$id")({
  head: () => ({ meta: [{ title: "Booking — RealMock" }] }),
  component: BookingDetail,
});

const linkSchema = z.string().trim().url("Enter a valid URL").max(500);

function BookingDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [b, setB] = useState<any>(null);
  const [otherName, setOtherName] = useState("");
  const [link, setLink] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("bookings").select("*").eq("id", id).maybeSingle();
    if (!data) return;
    setB(data);
    setLink(data.meeting_link ?? "");
    const otherId = data.candidate_id === user?.id ? data.interviewer_id : data.candidate_id;
    const { data: p } = await supabase.from("profiles").select("full_name").eq("id", otherId).maybeSingle();
    setOtherName(p?.full_name ?? "User");
  };

  useEffect(() => { if (user) load(); }, [user, id]);

  if (!b) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-3xl px-6 py-16 text-[color:var(--ink-soft)]">Loading…</div>
      </div>
    );
  }

  const isInterviewer = user?.id === b.interviewer_id;
  const isCandidate = user?.id === b.candidate_id;

  const confirm = async () => {
    const parsed = linkSchema.safeParse(link);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("bookings").update({
      meeting_link: parsed.data,
      status: "confirmed",
    }).eq("id", id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Booking confirmed");
    load();
  };

  const cancel = async () => {
    setBusy(true);
    const { error } = await supabase.from("bookings").update({
      status: "cancelled",
      cancellation_reason: reason || null,
    }).eq("id", id);
    if (!error && b.slot_id) {
      await supabase.from("availability_slots").update({ is_booked: false }).eq("id", b.slot_id);
    }
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Booking cancelled");
    navigate({ to: "/dashboard" });
  };

  const markCompleted = async () => {
    setBusy(true);
    const { error } = await supabase.from("bookings").update({ status: "completed" }).eq("id", id);
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Marked completed"); load(); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-12">
        <Link to="/dashboard" className="text-sm text-[color:var(--ink-soft)] hover:text-foreground">← Back to dashboard</Link>

        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <h1 className="font-serif text-4xl font-bold">Interview with {otherName}</h1>
          <Badge variant="outline" className="rounded-full capitalize">{b.status.replace(/_/g, " ")}</Badge>
        </div>
        <p className="mt-3 text-[color:var(--ink-soft)]">
          {format(new Date(b.scheduled_at), "EEEE, MMM d • h:mm a")} · {b.duration_minutes} min · {b.interview_type.replace(/_/g, " ")}
        </p>

        {b.candidate_notes && (
          <Card className="mt-6 p-5">
            <div className="text-xs uppercase tracking-wider text-[color:var(--ink-soft)] mb-2">Candidate notes</div>
            <p className="text-sm">{b.candidate_notes}</p>
          </Card>
        )}

        {b.status === "pending_confirmation" && isInterviewer && (
          <Card className="mt-6 p-6">
            <h2 className="font-serif text-xl font-bold">Confirm with a meeting link</h2>
            <p className="text-sm text-[color:var(--ink-soft)] mt-1">Paste a Zoom / Google Meet / etc. link.</p>
            <Input className="mt-4 h-11" placeholder="https://meet.google.com/…" value={link} onChange={(e) => setLink(e.target.value)} />
            <Button onClick={confirm} disabled={busy} className="mt-4 rounded-full bg-[color:var(--accent-warm)] text-[color:var(--accent-warm-foreground)] hover:bg-[color:var(--accent-warm)]/90">
              {busy ? "Confirming…" : "Confirm booking"}
            </Button>
          </Card>
        )}

        {b.status === "confirmed" && (
          <Card className="mt-6 p-6">
            <h2 className="font-serif text-xl font-bold">Meeting link</h2>
            <a href={b.meeting_link} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[color:var(--accent-warm)] underline break-all">
              {b.meeting_link}
            </a>
            {isInterviewer && new Date(b.scheduled_at).getTime() < Date.now() && (
              <div className="mt-5">
                <Button onClick={markCompleted} variant="outline" className="rounded-full">Mark as completed</Button>
              </div>
            )}
          </Card>
        )}

        {(b.status === "pending_confirmation" || b.status === "confirmed") && (isCandidate || isInterviewer) && (
          <Card className="mt-6 p-6">
            <h2 className="font-serif text-xl font-bold">Cancel</h2>
            <Textarea placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} className="mt-3" maxLength={300} />
            <Button onClick={cancel} disabled={busy} variant="outline" className="mt-4 rounded-full text-[color:var(--destructive)] border-[color:var(--destructive)]/30 hover:bg-[color:var(--destructive)]/5">
              Cancel booking
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
}
