import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";
import type { SerializeOptions } from "cookie";
import type { Database } from "./types";

type CookieToSet = {
  name: string;
  value: string;
  options: SerializeOptions;
};

export function createSupabaseServerClient(
  requestHeaders: Headers,
  responseHeaders: Headers
) {
  return createServerClient<Database>(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll(): { name: string; value: string }[] {
          return parseCookieHeader(requestHeaders.get("Cookie") ?? "")
            .filter((c): c is { name: string; value: string } =>
              typeof c.value === "string"
            );
        },
        setAll(cookies: CookieToSet[]) {
          cookies.forEach(({ name, value, options }) => {
            responseHeaders.append(
              "Set-Cookie",
              serializeCookieHeader(name, value, options)
            );
          });
        },
      },
    }
  );
}