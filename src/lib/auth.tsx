import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "candidate" | "interviewer" | "admin";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

 const loadRoles = async (uid: string | undefined) => {
  if (!uid) { setRoles([]); return; }
  try {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    setRoles(data?.map((r) => r.role as AppRole) ?? []);
  } catch {
    setRoles([]); // fail open — don't leave loading stuck
  }
};

  useEffect(() => {
  let lastUserId: string | undefined;

  const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
    setSession(s);

    const newUserId = s?.user?.id;

    // Only fetch if user actually changed
    if (newUserId && newUserId !== lastUserId) {
      lastUserId = newUserId;
      loadRoles(newUserId);
    }

    if (!newUserId) {
      lastUserId = undefined;
      setRoles([]);
    }
  });

  // After (fixed)
supabase.auth.getSession().then(async ({ data }) => {
  const uid = data.session?.user?.id;
  setSession(data.session);
  if (uid) {
    lastUserId = uid;
    await loadRoles(uid); // ← wait for roles before continuing
  }
  setLoading(false); // ← now safe, user + roles are both ready
});

  return () => sub.subscription.unsubscribe();
}, []);

  const value: AuthCtx = {
    user: session?.user ?? null,
    session,
    roles,
    loading,
    signOut: async () => {
      await supabase.auth.signOut();
    },
    refreshRoles: () => loadRoles(session?.user?.id),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}
