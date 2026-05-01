import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
