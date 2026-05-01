import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { refundPayment } from "@/server/razorpay.server";

// Called every minute by pg_cron. Auth via Supabase anon key in `apikey` header.
export const Route = createFileRoute("/api/public/hooks/booking-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (!apiKey || !expected || apiKey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const now = new Date();
        const nowIso = now.toISOString();

        // 1. transition confirmed -> ongoing when both joined and start has passed
        await supabaseAdmin
          .from("bookings")
          .update({ status: "ongoing" })
          .eq("status", "confirmed")
          .lte("scheduled_at", nowIso)
          .not("candidate_joined_at", "is", null)
          .not("interviewer_joined_at", "is", null);

        // 2. confirmed/ongoing past end_at -> completed
        await supabaseAdmin
          .from("bookings")
          .update({ status: "completed" })
          .in("status", ["confirmed", "ongoing"])
          .lt("end_at", nowIso)
          .not("candidate_joined_at", "is", null)
          .not("interviewer_joined_at", "is", null);

        // 3. handle no-shows: status confirmed, > start + 10min, at least one not joined
        const cutoff = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
        const { data: noShows } = await supabaseAdmin
          .from("bookings")
          .select("id, candidate_joined_at, interviewer_joined_at, payment_status, razorpay_payment_id, price_cents")
          .in("status", ["confirmed", "pending_confirmation"])
          .lt("scheduled_at", cutoff);

        for (const b of noShows ?? []) {
          const candidateJoined = !!b.candidate_joined_at;
          const interviewerJoined = !!b.interviewer_joined_at;
          if (candidateJoined && interviewerJoined) continue;

          let refund = false;
          // both no-show OR only interviewer didn't show -> refund candidate
          if (!interviewerJoined) refund = true;
          // only candidate no-show -> no refund

          if (refund && b.payment_status === "paid" && b.razorpay_payment_id) {
            try {
              await refundPayment(b.razorpay_payment_id, b.price_cents);
              await supabaseAdmin
                .from("bookings")
                .update({ status: "missed", payment_status: "refunded" })
                .eq("id", b.id);
            } catch (e) {
              console.error("Refund failed for booking", b.id, e);
              await supabaseAdmin.from("bookings").update({ status: "missed" }).eq("id", b.id);
            }
          } else {
            await supabaseAdmin.from("bookings").update({ status: "missed" }).eq("id", b.id);
          }
        }

        return Response.json({ ok: true, processed: noShows?.length ?? 0 });
      },
    },
  },
});
