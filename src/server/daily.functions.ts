import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createDailyRoom, createMeetingToken, roomNameFromUrl } from "./daily.server";

const idSchema = z.object({ bookingId: z.string().uuid() });

export const createMeetingForBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: b, error } = await supabaseAdmin
      .from("bookings")
      .select("id, interviewer_id, candidate_id, scheduled_at, end_at, daily_room_url, status")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (error || !b) throw new Error("Booking not found");
    if (b.interviewer_id !== userId) throw new Error("Only interviewer can create meeting");
    if (b.daily_room_url) return { url: b.daily_room_url };

    const room = await createDailyRoom({
      startAt: new Date(b.scheduled_at),
      endAt: new Date(b.end_at),
    });

    const { error: upErr } = await supabaseAdmin
      .from("bookings")
      .update({ daily_room_url: room.url, status: "confirmed" })
      .eq("id", b.id);
    if (upErr) throw new Error(upErr.message);
    return { url: room.url };
  });

export const getJoinToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const { data: b, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (error || !b) throw new Error("Booking not found");

    const isCandidate = b.candidate_id === userId;
    const isInterviewer = b.interviewer_id === userId;
    if (!isCandidate && !isInterviewer) throw new Error("Not a participant");

    if (!b.daily_room_url) throw new Error("Meeting not yet created");
    if (!["paid", "free"].includes(b.payment_status))
      throw new Error("Payment required");

    const now = Date.now();
    const start = new Date(b.scheduled_at).getTime();
    const end = new Date(b.end_at).getTime();
    if (now < start - 5 * 60 * 1000) throw new Error("Too early to join (opens 5 min before start)");
    if (now > end + 10 * 60 * 1000) throw new Error("Meeting has ended");

    // get display name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();

    const token = await createMeetingToken({
      roomName: roomNameFromUrl(b.daily_room_url),
      userName: profile?.full_name ?? (isInterviewer ? "Interviewer" : "Candidate"),
      userId,
      isOwner: isInterviewer,
      expiresAt: new Date(end + 15 * 60 * 1000),
    });

    // stamp joined_at
    const stamp = isCandidate
      ? { candidate_joined_at: new Date().toISOString() }
      : { interviewer_joined_at: new Date().toISOString() };
    await supabaseAdmin.from("bookings").update(stamp).eq("id", b.id);

    return { token, url: b.daily_room_url };
  });
