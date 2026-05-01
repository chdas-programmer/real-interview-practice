import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ReviewForm } from "@/components/review-form";
import { StarRating } from "@/components/star-rating";
import { createMeetingForBooking } from "@/server/daily.functions";
import { createBookingIntent, verifyBookingPayment } from "@/server/payments.functions";
import { openRazorpay } from "@/lib/razorpay";

export const Route = createFileRoute("/_authed/booking/$id")({
  head: () => ({ meta: [{ title: "Booking — RealMock" }] }),
  component: BookingDetail,
});

function BookingDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [b, setB] = useState<any>(null);
  const [otherName, setOtherName] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [myReview, setMyReview] = useState<any>(null);

  const createMeeting = useServerFn(createMeetingForBooking);
  const createIntent = useServerFn(createBookingIntent);
  const verifyPayment = useServerFn(verifyBookingPayment);

  const load = async () => {
    const { data } = await supabase.from("bookings").select("*").eq("id", id).maybeSingle();
    if (!data) return;
    setB(data);
    const otherId = data.candidate_id === user?.id ? data.interviewer_id : data.candidate_id;
    const { data: p } = await supabase.from("profiles").select("full_name").eq("id", otherId).maybeSingle();
    setOtherName(p?.full_name ?? "User");
    if (data.status === "completed" && user) {
      const { data: r } = await supabase
        .from("reviews")
        .select("*")
        .eq("booking_id", id)
        .eq("reviewer_id", user.id)
        .maybeSingle();
      setMyReview(r);
    }
  };

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

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
  const now = Date.now();
  const start = new Date(b.scheduled_at).getTime();
  const end = new Date(b.end_at).getTime();
  const joinOpen = now >= start - 5 * 60 * 1000 && now <= end + 10 * 60 * 1000;

  const pay = async () => {
    setBusy(true);
    try {
      const intent = await createIntent({ data: { bookingId: id } });
      if (intent.kind === "free" || intent.kind === "already") {
        toast.success(intent.kind === "free" ? "Free session booked" : "Already paid");
        await load();
        return;
      }
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user!.id)
        .maybeSingle();
      await openRazorpay({
        keyId: intent.keyId,
        amount: intent.amount,
        currency: intent.currency,
        orderId: intent.orderId,
        name: "RealMock",
        description: "Mock interview booking",
        prefill: { name: prof?.full_name ?? "", email: user?.email ?? "" },
        onSuccess: async (r) => {
          try {
            await verifyPayment({
              data: {
                bookingId: id,
                orderId: r.razorpay_order_id,
                paymentId: r.razorpay_payment_id,
                signature: r.razorpay_signature,
              },
            });
            toast.success("Payment confirmed");
            load();
          } catch (e) {
            toast.error((e as Error).message);
          }
        },
        onDismiss: () => toast.message("Payment cancelled"),
      });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    try {
      await createMeeting({ data: { bookingId: id } });
      toast.success("Booking confirmed — meeting room ready");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled", cancellation_reason: reason || null })
      .eq("id", id);
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
    else {
      toast.success("Marked completed");
      load();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-12">
        <Link to="/dashboard" className="text-sm text-[color:var(--ink-soft)] hover:text-foreground">
          ← Back to dashboard
        </Link>

        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <h1 className="font-serif text-4xl font-bold">Interview with {otherName}</h1>
          <Badge variant="outline" className="rounded-full capitalize">
            {b.status.replace(/_/g, " ")}
          </Badge>
          <Badge variant="outline" className="rounded-full capitalize">
            {b.payment_status}
          </Badge>
        </div>
        <p className="mt-3 text-[color:var(--ink-soft)]">
          {format(new Date(b.scheduled_at), "EEEE, MMM d • h:mm a")} · {b.duration_minutes} min ·{" "}
          {b.interview_type.replace(/_/g, " ")}
        </p>

        {b.candidate_notes && (
          <Card className="mt-6 p-5">
            <div className="text-xs uppercase tracking-wider text-[color:var(--ink-soft)] mb-2">
              Candidate notes
            </div>
            <p className="text-sm">{b.candidate_notes}</p>
          </Card>
        )}

        {/* Payment for candidate */}
        {isCandidate && b.payment_status === "pending" && b.status !== "cancelled" && (
          <Card className="mt-6 p-6">
            <h2 className="font-serif text-xl font-bold">Complete payment</h2>
            <p className="text-sm text-[color:var(--ink-soft)] mt-1">
              ₹{(b.price_cents / 100).toFixed(0)} · Your first session may be free.
            </p>
            <Button
              onClick={pay}
              disabled={busy}
              className="mt-4 rounded-full bg-[color:var(--accent-warm)] text-[color:var(--accent-warm-foreground)] hover:bg-[color:var(--accent-warm)]/90"
            >
              {busy ? "Processing…" : "Pay & confirm"}
            </Button>
          </Card>
        )}

        {/* Interviewer confirms */}
        {b.status === "pending_confirmation" &&
          isInterviewer &&
          (b.payment_status === "paid" || b.payment_status === "free") && (
            <Card className="mt-6 p-6">
              <h2 className="font-serif text-xl font-bold">Confirm booking</h2>
              <p className="text-sm text-[color:var(--ink-soft)] mt-1">
                We'll create a secure video room. The candidate has already paid.
              </p>
              <Button
                onClick={confirm}
                disabled={busy}
                className="mt-4 rounded-full bg-[color:var(--accent-warm)] text-[color:var(--accent-warm-foreground)] hover:bg-[color:var(--accent-warm)]/90"
              >
                {busy ? "Confirming…" : "Confirm & create room"}
              </Button>
            </Card>
          )}

        {/* Join meeting */}
        {b.status === "confirmed" && b.daily_room_url && (
          <Card className="mt-6 p-6">
            <h2 className="font-serif text-xl font-bold">Live meeting</h2>
            <p className="text-sm text-[color:var(--ink-soft)] mt-1">
              {joinOpen
                ? "The room is open. Join when ready."
                : `Opens 5 min before ${format(new Date(b.scheduled_at), "h:mm a")}.`}
            </p>
            <div className="mt-4 flex gap-3 flex-wrap">
              <Button
                asChild
                disabled={!joinOpen}
                className="rounded-full bg-[color:var(--accent-warm)] text-[color:var(--accent-warm-foreground)] hover:bg-[color:var(--accent-warm)]/90"
              >
                <Link to="/meeting/$id" params={{ id }}>
                  {joinOpen ? "Join meeting" : "Not yet open"}
                </Link>
              </Button>
              {isInterviewer && now >= start && (
                <Button onClick={markCompleted} variant="outline" className="rounded-full">
                  Mark as completed
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Reviews after completion */}
        {b.status === "completed" && (isCandidate || isInterviewer) && (
          <div className="mt-6">
            {myReview ? (
              <Card className="p-6">
                <h2 className="font-serif text-xl font-bold">Your review</h2>
                <div className="mt-3">
                  <StarRating value={myReview.rating} readOnly />
                </div>
                {myReview.feedback && <p className="mt-3 text-sm">{myReview.feedback}</p>}
              </Card>
            ) : (
              <ReviewForm bookingId={id} onDone={load} />
            )}
          </div>
        )}

        {(b.status === "pending_confirmation" || b.status === "confirmed") &&
          (isCandidate || isInterviewer) && (
            <Card className="mt-6 p-6">
              <h2 className="font-serif text-xl font-bold">Cancel</h2>
              <Textarea
                placeholder="Reason (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-3"
                maxLength={300}
              />
              <Button
                onClick={cancel}
                disabled={busy}
                variant="outline"
                className="mt-4 rounded-full text-[color:var(--destructive)] border-[color:var(--destructive)]/30 hover:bg-[color:var(--destructive)]/5"
              >
                Cancel booking
              </Button>
            </Card>
          )}
      </main>
    </div>
  );
}
