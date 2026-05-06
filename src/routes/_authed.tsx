// src/routes/_authed.tsx
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getServerSession } from "@/lib/auth-server";

export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ location }) => {
    console.log("[_authed] checking auth...");

    const session = await getServerSession();

    if (!session?.user) {
      console.log("[_authed] no session → redirecting");
      throw redirect({
        to: "/sign-in",
        search: { redirect: location.href } as never,
      });
    }

    console.log("[_authed] ✅ confirmed →", session.user.email);
  },
  component: () => <Outlet />,
});