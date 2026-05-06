import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const createBookingSchema = z.object({
  interviewerId: z.string().uuid(),
  slotId: z.string().uuid(),
  interviewType: z.enum(["dsa", "system_design", "frontend", "backend", "ml", "behavioral", "hr", "pm"]),
  notes: z.string().max(500).optional(),
});

export const createBookingRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createBookingSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    if (userId === data.interviewerId) {
      throw new Error("You cannot book yourself");
    }

    const { data: roleRows } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "candidate");
    if (!roleRows?.length) {
      throw new Error("Only candidate accounts can book");
    }

    const [{ data: slot }, { data: interviewer }] = await Promise.all([
      supabaseAdmin
        .from("availability_slots")
        .select("id, interviewer_id, start_at, end_at, is_booked")
        .eq("id", data.slotId)
        .maybeSingle(),
      supabaseAdmin
        .from("interviewer_profiles")
        .select("hourly_rate")
        .eq("user_id", data.interviewerId)
        .maybeSingle(),
    ]);

    if (!slot || slot.interviewer_id !== data.interviewerId) {
      throw new Error("Selected slot is invalid");
    }
    if (slot.is_booked) {
      throw new Error("Selected slot is no longer available");
    }
    if (new Date(slot.start_at).getTime() <= Date.now()) {
      throw new Error("Selected slot must be in the future");
    }
    if (!interviewer) {
      throw new Error("Interviewer profile not found");
    }

    const duration = Math.round(
      (new Date(slot.end_at).getTime() - new Date(slot.start_at).getTime()) / 60000,
    );

    const { data: booking, error: insertError } = await supabaseAdmin
      .from("bookings")
      .insert({
        candidate_id: userId,
        interviewer_id: data.interviewerId,
        slot_id: slot.id,
        interview_type: data.interviewType as never,
        scheduled_at: slot.start_at,
        end_at: slot.end_at,
        duration_minutes: duration,
        candidate_notes: data.notes || null,
        price_cents: Math.round((interviewer.hourly_rate ?? 0) * (duration / 60)),
      })
      .select("id")
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    const { error: slotError } = await supabaseAdmin
      .from("availability_slots")
      .update({ is_booked: true })
      .eq("id", slot.id)
      .eq("is_booked", false);

    if (slotError) {
      // Best-effort rollback to avoid orphan pending booking if slot lock fails.
      await supabaseAdmin.from("bookings").delete().eq("id", booking.id);
      throw new Error("Failed to reserve slot");
    }

    return { id: booking.id };
  });

const reviewSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(2000).optional(),
});

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reviewSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const { data: b } = await supabase
      .from("bookings")
      .select("id, candidate_id, interviewer_id, status")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!b) throw new Error("Booking not found");
    if (b.status !== "completed") throw new Error("Booking not completed");

    const reviewee_id =
      b.candidate_id === userId ? b.interviewer_id : b.interviewer_id === userId ? b.candidate_id : null;
    if (!reviewee_id) throw new Error("Not a participant");

    const { error } = await supabase.from("reviews").insert({
      booking_id: b.id,
      reviewer_id: userId,
      reviewee_id,
      rating: data.rating,
      feedback: data.feedback || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
