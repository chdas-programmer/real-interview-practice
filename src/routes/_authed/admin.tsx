import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authed/admin")({
  head: () => ({ meta: [{ title: "Admin — RealMock" }] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) throw redirect({ to: "/sign-in", search: { redirect: "/admin" } as never });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) throw redirect({ to: "/dashboard" });
  },
  component: AdminPage,
});

type ProfileRow = {
  id: string;
  full_name: string | null;
  headline: string | null;
  created_at: string;
};
type RoleRow = { user_id: string; role: "candidate" | "interviewer" | "admin" };
type InterviewerRow = {
  user_id: string;
  job_role: string;
  company: string;
  years_experience: number;
  bio: string | null;
  linkedin_url: string | null;
  expertise: string[];
  verification_status: "pending" | "verified" | "rejected";
  verification_notes: string | null;
  created_at: string;
};
type BookingRow = {
  id: string;
  status: string;
  scheduled_at: string;
  interview_type: string;
  candidate_id: string;
  interviewer_id: string;
  meeting_link: string | null;
  created_at: string;
};

function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [interviewers, setInterviewers] = useState<InterviewerRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);

  const [search, setSearch] = useState("");
  const [reviewing, setReviewing] = useState<InterviewerRow | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const loadAll = async () => {
    setLoading(true);
    const [p, r, i, b] = await Promise.all([
      supabase.from("profiles").select("id, full_name, headline, created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase
        .from("interviewer_profiles")
        .select("user_id, job_role, company, years_experience, bio, linkedin_url, expertise, verification_status, verification_notes, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("bookings")
        .select("id, status, scheduled_at, interview_type, candidate_id, interviewer_id, meeting_link, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    if (p.error || r.error || i.error || b.error) {
      toast.error("Failed to load admin data");
    }
    setProfiles((p.data as ProfileRow[]) ?? []);
    setRoles((r.data as RoleRow[]) ?? []);
    setInterviewers((i.data as InterviewerRow[]) ?? []);
    setBookings((b.data as BookingRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const profileById = useMemo(() => {
    const m = new Map<string, ProfileRow>();
    profiles.forEach((p) => m.set(p.id, p));
    return m;
  }, [profiles]);

  const rolesByUser = useMemo(() => {
    const m = new Map<string, string[]>();
    roles.forEach((r) => {
      const a = m.get(r.user_id) ?? [];
      a.push(r.role);
      m.set(r.user_id, a);
    });
    return m;
  }, [roles]);

  const stats = useMemo(() => {
    const pending = interviewers.filter((i) => i.verification_status === "pending").length;
    const verified = interviewers.filter((i) => i.verification_status === "verified").length;
    const rejected = interviewers.filter((i) => i.verification_status === "rejected").length;
    const totalBookings = bookings.length;
    const completed = bookings.filter((b) => b.status === "completed").length;
    const cancelled = bookings.filter((b) => b.status === "cancelled" || b.status === "declined").length;
    const upcoming = bookings.filter(
      (b) => b.status === "confirmed" && new Date(b.scheduled_at) > new Date(),
    ).length;
    const noLink = bookings.filter(
      (b) => b.status === "confirmed" && !b.meeting_link,
    ).length;
    return { pending, verified, rejected, totalBookings, completed, cancelled, upcoming, noLink };
  }, [interviewers, bookings]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(
      (p) =>
        (p.full_name ?? "").toLowerCase().includes(q) ||
        (p.headline ?? "").toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q),
    );
  }, [profiles, search]);

  const verifyInterviewer = async (status: "verified" | "rejected") => {
    if (!reviewing) return;
    const { error } = await supabase
      .from("interviewer_profiles")
      .update({ verification_status: status, verification_notes: reviewNotes || null })
      .eq("user_id", reviewing.user_id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Interviewer ${status}`);
    setReviewing(null);
    setReviewNotes("");
    await loadAll();
  };

  const toggleAdmin = async (uid: string, makeAdmin: boolean) => {
    if (uid === user?.id && !makeAdmin) {
      toast.error("You cannot remove your own admin role here");
      return;
    }
    if (makeAdmin) {
      const { error } = await supabase.from("user_roles").insert({ user_id: uid, role: "admin" });
      if (error) return toast.error(error.message);
      toast.success("Admin role granted");
    } else {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", uid)
        .eq("role", "admin");
      if (error) return toast.error(error.message);
      toast.success("Admin role revoked");
    }
    await loadAll();
  };

  const pendingQueue = interviewers.filter((i) => i.verification_status === "pending");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold">Admin console</h1>
            <p className="text-sm text-[color:var(--ink-soft)] mt-1">
              Verify interviewers, manage users, monitor session quality.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </div>

        {/* Overview widgets */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Pending review" value={stats.pending} accent />
          <StatCard label="Verified interviewers" value={stats.verified} />
          <StatCard label="Total users" value={profiles.length} />
          <StatCard label="Total bookings" value={stats.totalBookings} />
          <StatCard label="Upcoming sessions" value={stats.upcoming} />
          <StatCard label="Completed" value={stats.completed} />
          <StatCard label="Cancelled / Declined" value={stats.cancelled} />
          <StatCard label="Confirmed w/o link" value={stats.noLink} warn={stats.noLink > 0} />
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="overview">
              Verification queue {pendingQueue.length > 0 && <Badge className="ml-2">{pendingQueue.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
          </TabsList>

          {/* Verification queue */}
          <TabsContent value="overview" className="mt-6">
            {pendingQueue.length === 0 ? (
              <Card className="p-10 text-center text-sm text-[color:var(--ink-soft)]">
                Inbox zero. No interviewers waiting for review.
              </Card>
            ) : (
              <div className="space-y-3">
                {pendingQueue.map((iv) => {
                  const p = profileById.get(iv.user_id);
                  return (
                    <Card key={iv.user_id} className="p-5">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold">{p?.full_name ?? "Unnamed"}</h3>
                            <Badge variant="secondary">{iv.years_experience}y exp</Badge>
                          </div>
                          <p className="text-sm text-[color:var(--ink-soft)]">
                            {iv.job_role} @ {iv.company}
                          </p>
                          {iv.bio && <p className="text-sm max-w-2xl line-clamp-3">{iv.bio}</p>}
                          <div className="flex flex-wrap gap-1.5">
                            {iv.expertise.map((e) => (
                              <Badge key={e} variant="outline" className="text-xs">
                                {e}
                              </Badge>
                            ))}
                          </div>
                          {iv.linkedin_url && (
                            <a
                              href={iv.linkedin_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-[color:var(--accent-warm)] underline"
                            >
                              LinkedIn ↗
                            </a>
                          )}
                          <p className="text-xs text-[color:var(--ink-soft)]">
                            Applied {formatDistanceToNow(new Date(iv.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            onClick={() => {
                              setReviewing(iv);
                              setReviewNotes(iv.verification_notes ?? "");
                            }}
                          >
                            Review
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Users */}
          <TabsContent value="users" className="mt-6">
            <div className="mb-4">
              <Input
                placeholder="Search by name, headline, or user id…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-md"
              />
            </div>
            <Card className="overflow-hidden">
              <div className="divide-y">
                <div className="grid grid-cols-12 px-4 py-2.5 text-xs font-medium text-[color:var(--ink-soft)] bg-muted/40">
                  <div className="col-span-4">User</div>
                  <div className="col-span-3">Roles</div>
                  <div className="col-span-3">Joined</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
                {filteredUsers.slice(0, 100).map((p) => {
                  const userRoles = rolesByUser.get(p.id) ?? [];
                  const isAdmin = userRoles.includes("admin");
                  return (
                    <div key={p.id} className="grid grid-cols-12 px-4 py-3 items-center text-sm">
                      <div className="col-span-4">
                        <div className="font-medium">{p.full_name ?? "Unnamed"}</div>
                        <div className="text-xs text-[color:var(--ink-soft)] truncate">
                          {p.headline ?? p.id}
                        </div>
                      </div>
                      <div className="col-span-3 flex flex-wrap gap-1">
                        {userRoles.length === 0 ? (
                          <span className="text-xs text-[color:var(--ink-soft)]">—</span>
                        ) : (
                          userRoles.map((r) => (
                            <Badge
                              key={r}
                              variant={r === "admin" ? "default" : "outline"}
                              className="text-xs"
                            >
                              {r}
                            </Badge>
                          ))
                        )}
                      </div>
                      <div className="col-span-3 text-xs text-[color:var(--ink-soft)]">
                        {format(new Date(p.created_at), "MMM d, yyyy")}
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <Button
                          size="sm"
                          variant={isAdmin ? "outline" : "ghost"}
                          onClick={() => toggleAdmin(p.id, !isAdmin)}
                        >
                          {isAdmin ? "Revoke admin" : "Make admin"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-[color:var(--ink-soft)]">
                    No users match your search.
                  </div>
                )}
              </div>
            </Card>
            {filteredUsers.length > 100 && (
              <p className="text-xs text-[color:var(--ink-soft)] mt-2">
                Showing first 100 of {filteredUsers.length}. Refine your search.
              </p>
            )}
          </TabsContent>

          {/* Bookings */}
          <TabsContent value="bookings" className="mt-6">
            <Card className="overflow-hidden">
              <div className="divide-y">
                <div className="grid grid-cols-12 px-4 py-2.5 text-xs font-medium text-[color:var(--ink-soft)] bg-muted/40">
                  <div className="col-span-3">When</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-3">Participants</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2 text-right">Link</div>
                </div>
                {bookings.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-[color:var(--ink-soft)]">
                    No bookings yet.
                  </div>
                )}
                {bookings.map((b) => {
                  const cand = profileById.get(b.candidate_id)?.full_name ?? "—";
                  const intv = profileById.get(b.interviewer_id)?.full_name ?? "—";
                  const isPast = new Date(b.scheduled_at) < new Date();
                  const flagged = b.status === "confirmed" && !b.meeting_link;
                  return (
                    <Link
                      key={b.id}
                      to="/booking/$id"
                      params={{ id: b.id }}
                      className="grid grid-cols-12 px-4 py-3 items-center text-sm hover:bg-muted/30 transition-colors"
                    >
                      <div className="col-span-3">
                        <div>{format(new Date(b.scheduled_at), "MMM d, p")}</div>
                        <div className="text-xs text-[color:var(--ink-soft)]">
                          {isPast ? "past" : formatDistanceToNow(new Date(b.scheduled_at), { addSuffix: true })}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <Badge variant="outline" className="text-xs">{b.interview_type}</Badge>
                      </div>
                      <div className="col-span-3 text-xs">
                        <div>👤 {cand}</div>
                        <div>🎓 {intv}</div>
                      </div>
                      <div className="col-span-2">
                        <StatusBadge status={b.status} />
                      </div>
                      <div className="col-span-2 text-right text-xs">
                        {b.meeting_link ? (
                          <span className="text-[color:var(--accent-warm)]">✓ set</span>
                        ) : flagged ? (
                          <span className="text-destructive">⚠ missing</span>
                        ) : (
                          <span className="text-[color:var(--ink-soft)]">—</span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <SiteFooter />

      {/* Verification dialog */}
      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review interviewer</DialogTitle>
            <DialogDescription>
              {reviewing?.job_role} @ {reviewing?.company} —{" "}
              {profileById.get(reviewing?.user_id ?? "")?.full_name ?? "Unnamed"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {reviewing?.bio && (
              <div>
                <div className="text-xs font-medium mb-1">Bio</div>
                <p className="text-sm text-[color:var(--ink-soft)]">{reviewing.bio}</p>
              </div>
            )}
            {reviewing?.linkedin_url && (
              <a
                href={reviewing.linkedin_url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-[color:var(--accent-warm)] underline block"
              >
                Open LinkedIn ↗
              </a>
            )}
            <div>
              <label className="text-xs font-medium">Internal notes (optional)</label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Reason for decision…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => verifyInterviewer("rejected")}>
              Reject
            </Button>
            <Button onClick={() => verifyInterviewer("verified")}>Verify</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  warn,
}: {
  label: string;
  value: number;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <Card
      className={`p-4 ${
        accent ? "border-[color:var(--accent-warm)]/40 bg-[color:var(--accent-warm)]/5" : ""
      } ${warn ? "border-destructive/40 bg-destructive/5" : ""}`}
    >
      <div className="text-xs text-[color:var(--ink-soft)]">{label}</div>
      <div className="text-2xl font-serif font-semibold mt-1">{value}</div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending_confirmation: "bg-amber-100 text-amber-900",
    confirmed: "bg-emerald-100 text-emerald-900",
    completed: "bg-blue-100 text-blue-900",
    cancelled: "bg-stone-200 text-stone-700",
    declined: "bg-red-100 text-red-900",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${map[status] ?? "bg-muted"}`}>
      {status.replace("_", " ")}
    </span>
  );
}
