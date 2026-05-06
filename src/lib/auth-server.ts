// src/lib/auth-server.ts
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders, getResponseHeaders } from "@tanstack/react-start/server";
import { createSupabaseServerClient } from "@/integrations/supabase/server";

export const getServerSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const requestHeaders = new Headers(getRequestHeaders());
    const responseHeaders = getResponseHeaders();

    const supabase = createSupabaseServerClient(requestHeaders, responseHeaders);

    const { data: { session } } = await supabase.auth.getSession();

    console.log("[getServerSession] session →", session?.user?.email ?? "NULL");

    return session ?? null;
  }
);