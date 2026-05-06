import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck } from "lucide-react";
import { StarRating } from "@/components/star-rating";
import { createBookingRequest } from "@/server/bookings.functions";

export const Route = createFileRoute("/interviewers/$id")({
  head: () => ({ meta: [{ title: "Interviewer profile — RealMock" }] }),
  component: InterviewerDetail,
});

type Slot = { id: string; start_at: string; end_at: string; is_booked: boolean };
type Review = { id: string; rating: number; feedback: string | null; reviewer_id: string; created_at: string; reviewer_name?: string };

function InterviewerDetail() {
  const { id } = Route.useParams();
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const createBooking = useServerFn(createBookingRequest);
  const [profile, setProfile] = useState<any | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [pickedSlot, setPickedSlot] = useState<string | null>(null);
  const [type, setType] = useState("dsa");
  const [notes, setNotes] = useState("");
  const [booking, setBooking] = useState(false);
  const [stats, setStats] = useState<{ avg: number; count: number; completed: number }>({ avg: 0, count: 0, completed: 0 });
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: ip }, { data: prof }, { data: s }, { data: rv }, { count: completedCount }] = await Promise.all([
        supabase.from("interviewer_profiles").select("*").eq("user_id", id).maybeSingle(),
        supabase.from("profiles").select("full_name, headline").eq("id", id).maybeSingle(),
        supabase.from("availability_slots").select("*").eq("interviewer_id", id).eq("is_booked", false).order("start_at"),
        supabase.from("reviews").select("id, rating, feedback, reviewer_id, created_at").eq("reviewee_id", id).order("created_at", { ascending: false }).limit(5),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("interviewer_id", id).eq("status", "completed"),
      ]);
      setProfile({ ...ip, full_name: prof?.full_name, headline: prof?.headline });
      setSlots((s ?? []).filter((x) => new Date(x.start_at).getTime() > Date.now()));

      const reviewerIds = Array.from(new Set((rv ?? []).map((r) => r.reviewer_id)));
      const { data: rprofs } = reviewerIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", reviewerIds)
        : { data: [] as { id: string; full_name: string | null }[] };
      const nameMap = new Map((rprofs ?? []).map((p) => [p.id, p.full_name ?? "Anonymous"]));
      const enriched = (rv ?? []).map((r) => ({ ...r, reviewer_name: nameMap.get(r.reviewer_id) }));
      setReviews(enriched);

      const ratings = (rv ?? []).map((r) => r.rating);
      const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
      // total review count from a separate query for accuracy
      const { count: totalReviews } = await supabase
        .from("reviews")
        .select("id", { count: "exact", head: true })
        .eq("reviewee_id", id);
      setStats({ avg, count: totalReviews ?? 0, completed: completedCount ?? 0 });
    })();
  }, [id]);


  const book = async () => {
    if (!user) {
      navigate({ to: "/sign-in" });
      return;
    }
    if (user.id === id) {
      toast.error("You cannot book yourself");
      return;
    }
    if (!roles.includes("candidate")) {
      toast.error("Only candidate accounts can book");
      return;
    }
    if (!pickedSlot) {
      toast.error("Pick a slot");
      return;
    }
    const slot = slots.find((s) => s.id === pickedSlot);
    if (!slot) return;
    setBooking(true);
    let createdId: string | null = null;
    let errorMessage: string | null = null;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const res = await createBooking({
        data: {
          interviewerId: id,
          slotId: slot.id,
          interviewType: type as
            | "dsa"
            | "system_design"
            | "frontend"
            | "backend"
            | "ml"
            | "behavioral"
            | "hr"
            | "pm",
          notes: notes || undefined,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      createdId = res.id;
    } catch (e) {
      errorMessage = (e as Error).message;
    }
    setBooking(false);
    if (errorMessage || !createdId) {
      toast.error(errorMessage ?? "Failed to create booking");
      return;
    }
    toast.success("Booking requested");
    navigate({ to: "/booking/$id", params: { id: createdId } });
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-4xl px-6 py-16 text-[color:var(--ink-soft)]">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-12">
        <div className="grid lg:grid-cols-[1fr_360px] gap-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="rounded-full gap-1 text-xs">
                <ShieldCheck className="h-3 w-3" /> Verified
              </Badge>
              <Badge variant="secondary" className="rounded-full text-xs capitalize">{profile.company_tier?.replace(/_/g, " ")}</Badge>
            </div>
            <h1 className="font-serif text-4xl md:text-5xl font-bold">{profile.full_name}</h1>
            <p className="mt-2 text-[color:var(--ink-soft)] text-lg">{profile.job_role} @ {profile.company} · {profile.years_experience}+ yrs</p>
            <div className="mt-4 flex items-center gap-4 flex-wrap">
              {stats.count > 0 && (
                <div className="flex items-center gap-2">
                  <StarRating value={Math.round(stats.avg)} readOnly size={16} />
                  <span className="text-sm font-medium">{stats.avg.toFixed(1)}</span>
                  <span className="text-sm text-[color:var(--ink-soft)]">({stats.count} reviews)</span>
                </div>
              )}
              {stats.completed > 0 && (
                <span className="text-sm text-[color:var(--ink-soft)]">· {stats.completed} interviews completed</span>
              )}
            </div>
            {profile.bio && <p className="mt-6 leading-relaxed">{profile.bio}</p>}
            <div className="mt-6 flex flex-wrap gap-2">
              {(profile.expertise as string[]).map((e) => (
                <Badge key={e} variant="secondary" className="rounded-full capitalize">{e.replace(/_/g, " ")}</Badge>
              ))}
            </div>

            {reviews.length > 0 && (
              <div className="mt-10">
                <h2 className="font-serif text-2xl font-bold">Recent reviews</h2>
                <div className="mt-4 space-y-3">
                  {reviews.map((r) => (
                    <Card key={r.id} className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">{r.reviewer_name}</div>
                        <StarRating value={r.rating} readOnly size={14} />
                      </div>
                      {r.feedback && <p className="mt-2 text-sm text-[color:var(--ink-soft)]">{r.feedback}</p>}
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>


          <Card className="p-6 h-fit lg:sticky lg:top-24">
            <div className="font-serif text-2xl font-bold">${(profile.hourly_rate / 100).toFixed(0)}<span className="text-sm font-sans font-normal text-[color:var(--ink-soft)]">/hr</span></div>
            <div className="mt-5">
              <label className="text-xs uppercase tracking-wider text-[color:var(--ink-soft)]">Interview type</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="mt-1.5 h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(profile.expertise as string[]).map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="mt-4">
              <label className="text-xs uppercase tracking-wider text-[color:var(--ink-soft)]">Pick a slot</label>
              <div className="mt-2 max-h-60 overflow-y-auto space-y-1.5">
                {slots.length === 0 ? (
                  <p className="text-sm text-[color:var(--ink-soft)]">No open slots right now.</p>
                ) : slots.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setPickedSlot(s.id)}
                    className={`w-full text-left text-sm rounded-xl border px-3 py-2 transition ${pickedSlot === s.id ? "border-[color:var(--accent-warm)] bg-[color:var(--accent-warm)]/10" : "border-border hover:border-[color:var(--ink-soft)]"}`}
                  >
                    {format(new Date(s.start_at), "EEE, MMM d • h:mm a")}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <label className="text-xs uppercase tracking-wider text-[color:var(--ink-soft)]">Notes (optional)</label>
              <Textarea placeholder="What you want to focus on" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1.5" maxLength={500} />
            </div>
            <Button onClick={book} disabled={booking || slots.length === 0 || user?.id === id} className="mt-5 w-full rounded-full h-11 bg-[color:var(--accent-warm)] text-[color:var(--accent-warm-foreground)] hover:bg-[color:var(--accent-warm)]/90">
              {booking ? "Requesting…" : user?.id === id ? "Cannot book yourself" : "Request booking"}
            </Button>
            <p className="mt-3 text-xs text-[color:var(--ink-soft)] text-center">
              {user
                ? user.id === id
                  ? "Switch to another account to test this interviewer profile."
                  : "You'll get a confirmation when they accept."
                : <Link to="/sign-in" className="underline">Sign in to book</Link>}
            </p>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
