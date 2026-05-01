import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createOrder, refundPayment, verifyCheckoutSignature } from "./razorpay.server";

const intentSchema = z.object({ bookingId: z.string().uuid() });

export const createBookingIntent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => intentSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: b, error } = await supabaseAdmin
      .from("bookings")
      .select("id, candidate_id, price_cents, payment_status, razorpay_order_id")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (error || !b) throw new Error("Booking not found");
    if (b.candidate_id !== userId) throw new Error("Not your booking");

    if (b.payment_status === "paid" || b.payment_status === "free") {
      return { kind: "already" as const };
    }

    // free first session
    const { data: cp } = await supabaseAdmin
      .from("candidate_profiles")
      .select("free_session_used")
      .eq("user_id", userId)
      .maybeSingle();

    if (!cp?.free_session_used && b.price_cents > 0) {
      await supabaseAdmin
        .from("candidate_profiles")
        .update({ free_session_used: true })
        .eq("user_id", userId);
      await supabaseAdmin
        .from("bookings")
        .update({ payment_status: "free" })
        .eq("id", b.id);
      return { kind: "free" as const };
    }

    if (b.price_cents === 0) {
      await supabaseAdmin.from("bookings").update({ payment_status: "free" }).eq("id", b.id);
      return { kind: "free" as const };
    }

    // price_cents is INR paise in this app (we store rupee*100)
    const order = await createOrder({
      amountInPaise: b.price_cents,
      receipt: `bk_${b.id.slice(0, 20)}`,
      notes: { booking_id: b.id },
    });
    await supabaseAdmin
      .from("bookings")
      .update({ razorpay_order_id: order.id })
      .eq("id", b.id);

    return {
      kind: "order" as const,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID!,
    };
  });

const verifySchema = z.object({
  bookingId: z.string().uuid(),
  orderId: z.string(),
  paymentId: z.string(),
  signature: z.string(),
});

export const verifyBookingPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => verifySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    if (!verifyCheckoutSignature(data.orderId, data.paymentId, data.signature)) {
      throw new Error("Invalid payment signature");
    }
    const { data: b } = await supabaseAdmin
      .from("bookings")
      .select("candidate_id, razorpay_order_id")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!b || b.candidate_id !== userId) throw new Error("Not your booking");
    if (b.razorpay_order_id !== data.orderId) throw new Error("Order mismatch");

    const { error } = await supabaseAdmin
      .from("bookings")
      .update({ payment_status: "paid", razorpay_payment_id: data.paymentId })
      .eq("id", data.bookingId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const refundSchema = z.object({ bookingId: z.string().uuid(), reason: z.string().max(500).optional() });

export const refundBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => refundSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    // admin only
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (!roles?.some((r) => r.role === "admin")) throw new Error("Admin only");

    const { data: b } = await supabaseAdmin
      .from("bookings")
      .select("razorpay_payment_id, payment_status, price_cents")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!b) throw new Error("Booking not found");
    if (!b.razorpay_payment_id) throw new Error("No payment to refund");
    if (b.payment_status === "refunded") return { ok: true };

    await refundPayment(b.razorpay_payment_id, b.price_cents);
    await supabaseAdmin
      .from("bookings")
      .update({ payment_status: "refunded", cancellation_reason: data.reason ?? null })
      .eq("id", data.bookingId);
    return { ok: true };
  });
