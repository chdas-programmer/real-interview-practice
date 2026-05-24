import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase-admin"; // ✅ add this

const verifyInterviewerSchema = z.object({
  interviewerId: z.string().uuid(),
  status: z.enum(["verified", "rejected"]),
  notes: z.string().max(1000).optional(),
});

export const verifyInterviewerApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => verifyInterviewerSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // ✅ Use admin client — bypasses RLS, no has_role() conflict
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin");

    if (!roles?.length) {
      throw new Error("Admin only");
    }

    // ✅ Also use admin client here so the UPDATE isn't blocked by RLS
    const { error } = await supabaseAdmin
      .from("interviewer_profiles")
      .update({
        verification_status: data.status,
        verification_notes: data.notes?.trim() ? data.notes.trim() : null,
      })
      .eq("user_id", data.interviewerId);

    if (error) {
      throw new Error(error.message);
    }

    return { ok: true };
  });