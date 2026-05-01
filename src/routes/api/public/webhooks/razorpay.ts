import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyWebhookSignature } from "@/server/razorpay.server";

export const Route = createFileRoute("/api/public/webhooks/razorpay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get("x-razorpay-signature");
        const body = await request.text();
        if (!signature || !verifyWebhookSignature(body, signature)) {
          return new Response("Invalid signature", { status: 401 });
        }
        const payload = JSON.parse(body) as {
          event: string;
          payload: { payment: { entity: { order_id: string; id: string; status: string } } };
        };

        if (payload.event === "payment.captured") {
          const { order_id, id: payment_id } = payload.payload.payment.entity;
          await supabaseAdmin
            .from("bookings")
            .update({ payment_status: "paid", razorpay_payment_id: payment_id })
            .eq("razorpay_order_id", order_id)
            .eq("payment_status", "pending");
        }

        return Response.json({ ok: true });
      },
    },
  },
});
