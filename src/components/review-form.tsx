import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { submitReview } from "@/server/bookings.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "./star-rating";

export function ReviewForm({ bookingId, onDone }: { bookingId: string; onDone?: () => void }) {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = useServerFn(submitReview);

  const send = async () => {
    if (rating < 1) {
      toast.error("Pick a rating");
      return;
    }
    setBusy(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      await submit({
        data: { bookingId, rating, feedback: feedback || undefined },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      toast.success("Review submitted");
      onDone?.();
    } catch (e) {
      const msg =
        e instanceof Response
          ? await e.text().catch(() => e.statusText || "Request failed")
          : e instanceof Error
            ? e.message
            : String(e);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="font-serif text-xl font-bold">Leave a review</h2>
      <p className="text-sm text-[color:var(--ink-soft)] mt-1">
        Your honest feedback helps the community.
      </p>
      <div className="mt-4">
        <StarRating value={rating} onChange={setRating} size={28} />
      </div>
      <Textarea
        className="mt-4"
        placeholder="Optional feedback…"
        maxLength={2000}
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
      />
      <Button
        onClick={send}
        disabled={busy}
        className="mt-4 rounded-full bg-[color:var(--accent-warm)] text-[color:var(--accent-warm-foreground)] hover:bg-[color:var(--accent-warm)]/90"
      >
        {busy ? "Submitting…" : "Submit review"}
      </Button>
    </Card>
  );
}
