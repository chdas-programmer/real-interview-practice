import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { getJoinToken } from "@/server/daily.functions";
import { DailyMeeting } from "@/components/daily-meeting";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authed/meeting/$id")({
  head: () => ({ meta: [{ title: "Live interview — RealMock" }] }),
  component: MeetingPage,
});

function MeetingPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const join = useServerFn(getJoinToken);
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ready"; url: string; token: string }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession(); // ✅
        if (!session) throw new Error("Not logged in");                  // ✅
        const res = await join({ 
          data: { bookingId: id },
          headers: { Authorization: `Bearer ${session.access_token}` }, // ✅
        });
        if (!mounted) return;
        setState({ status: "ready", url: res.url, token: res.token });
      } catch (e) {
        if (!mounted) return;
        setState({ status: "error", message: (e as Error).message });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id, join]);

  if (state.status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[color:var(--ink)] text-background">
        Joining meeting…
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[color:var(--ink)] text-background p-6">
        <h1 className="font-serif text-2xl">Can't join</h1>
        <p className="text-background/70">{state.message}</p>
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/booking/$id" params={{ id }}>Back to booking</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="h-screen w-screen bg-black">
      <DailyMeeting
        url={state.url}
        token={state.token}
        onLeft={() => {
          toast.success("Left meeting");
          navigate({ to: "/booking/$id", params: { id } });
        }}
      />
    </div>
  );
}
