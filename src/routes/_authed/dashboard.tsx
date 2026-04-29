import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authed/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — RealMock" }] }),
  component: DashboardPage,
});

type Booking = {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  interview_type: string;
  meeting_link: string | null;
  candidate_id: string;
  interviewer_id: string;
  other_name?: string;
};

function DashboardPage() {
  const { user, roles, loading, refreshRoles } = useAuth();
  const isInterviewer = roles.includes("interviewer");
  const isCandidate = roles.includes("candidate");
  const isAdmin = roles.includes("admin");
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [past, setPast] = useState<Booking[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [noAdminsExist, setNoAdminsExist] = useState(false);

  useEffect(() => {
    if (isAdmin) { setNoAdminsExist(false); return; }
    (async () => {
      const { count } = await supabase
        .from("user_roles")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "admin");
      setNoAdminsExist((count ?? 0) === 0);
    })();
  }, [isAdmin]);

  const claimAdmin = async () => {
    const { error } = await supabase.rpc("bootstrap_first_admin");
    if (error) return toast.error(error.message);
    toast.success("You are now admin");
    await refreshRoles();
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingData(true);
      const { data: rows } = await supabase
        .from("bookings")
        .select("id, scheduled_at, duration_minutes, status, interview_type, meeting_link, candidate_id, interviewer_id")
        .order("scheduled_at", { ascending: false });

      const otherIds = Array.from(
        new Set(
          (rows ?? []).map((b) => (b.candidate_id === user.id ? b.interviewer_id : b.candidate_id))
        )
      );
      const { data: profs } = otherIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", otherIds)
        : { data: [] as { id: string; full_name: string | null }[] };
      const nameById = new Map((profs ?? []).map((p) => [p.id, p.full_name ?? "User"]));

      const enriched: Booking[] = (rows ?? []).map((b) => ({
        ...b,
        other_name: nameById.get(b.candidate_id === user.id ? b.interviewer_id : b.candidate_id) ?? "User",
      }));
      const now = Date.now();
      setUpcoming(enriched.filter((b) => new Date(b.scheduled_at).getTime() >= now && b.status !== "cancelled").reverse());
      setPast(enriched.filter((b) => new Date(b.scheduled_at).getTime() < now || b.status === "cancelled"));
      setLoadingData(false);
    })();
  }, [user]);

  if (loading) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-6xl w-full px-6 py-12">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--ink-soft)] mb-2">Dashboard</div>
            <h1 className="font-serif text-4xl font-bold">Welcome back.</h1>
          </div>
          <div className="flex gap-2">
            {isCandidate && (
              <Button asChild className="rounded-full bg-[color:var(--accent-warm)] text-[color:var(--accent-warm-foreground)] hover:bg-[color:var(--accent-warm)]/90">
                <Link to="/interviewers">Book a mock</Link>
              </Button>
            )}
            {isCandidate && (
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/profile">My profile</Link>
              </Button>
            )}
            {isInterviewer && (
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/interviewer">Interviewer hub</Link>
              </Button>
            )}
            {!isInterviewer && (
              <Button asChild variant="ghost" className="rounded-full">
                <Link to="/interviewer/setup">Apply as interviewer</Link>
              </Button>
            )}
          </div>
        </div>

        {noAdminsExist && !isAdmin && (
          <Card className="mt-6 p-5 border-[color:var(--accent-warm)]/40 bg-[color:var(--accent-warm)]/5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-medium">No admin yet</div>
              <p className="text-sm text-[color:var(--ink-soft)]">
                Claim the admin role for this workspace. Available only because no admin exists.
              </p>
            </div>
            <Button onClick={claimAdmin} className="rounded-full">Claim admin</Button>
          </Card>
        )}

        <section className="mt-10">
          <h2 className="font-serif text-2xl font-bold mb-4">Upcoming</h2>
          {loadingData ? (
            <div className="text-[color:var(--ink-soft)]">Loading…</div>
          ) : upcoming.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-[color:var(--ink-soft)]">No upcoming interviews yet.</p>
              {isCandidate && (
                <Button asChild className="mt-4 rounded-full bg-[color:var(--accent-warm)] text-[color:var(--accent-warm-foreground)] hover:bg-[color:var(--accent-warm)]/90">
                  <Link to="/interviewers">Browse interviewers</Link>
                </Button>
              )}
            </Card>
          ) : (
            <div className="space-y-3">
              {upcoming.map((b) => <BookingRow key={b.id} b={b} />)}
            </div>
          )}
        </section>

        <section className="mt-12">
          <h2 className="font-serif text-2xl font-bold mb-4">Past</h2>
          {past.length === 0 ? (
            <p className="text-[color:var(--ink-soft)]">Nothing here yet.</p>
          ) : (
            <div className="space-y-3">
              {past.map((b) => <BookingRow key={b.id} b={b} />)}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function statusColor(s: string) {
  return s === "confirmed" ? "default"
    : s === "pending_confirmation" ? "secondary"
    : s === "completed" ? "outline"
    : "destructive";
}

function BookingRow({ b }: { b: Booking }) {
  return (
    <Card className="p-5 flex items-center justify-between flex-wrap gap-4">
      <div className="flex-1 min-w-[200px]">
        <div className="flex items-center gap-2">
          <div className="font-medium">{b.other_name}</div>
          <Badge variant={statusColor(b.status) as never} className="rounded-full text-xs">
            {b.status.replace(/_/g, " ")}
          </Badge>
        </div>
        <div className="text-sm text-[color:var(--ink-soft)] mt-1">
          {format(new Date(b.scheduled_at), "EEE, MMM d • h:mm a")} · {b.duration_minutes} min · {b.interview_type.replace(/_/g, " ")}
        </div>
      </div>
      <div className="flex gap-2">
        {b.status === "confirmed" && b.meeting_link && (
          <Button asChild size="sm" className="rounded-full bg-[color:var(--accent-warm)] text-[color:var(--accent-warm-foreground)] hover:bg-[color:var(--accent-warm)]/90">
            <a href={b.meeting_link} target="_blank" rel="noreferrer">Join</a>
          </Button>
        )}
        <Button asChild size="sm" variant="outline" className="rounded-full">
          <Link to="/booking/$id" params={{ id: b.id }}>Details</Link>
        </Button>
      </div>
    </Card>
  );
}
