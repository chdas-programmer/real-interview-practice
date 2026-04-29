import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { user, signOut, roles } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="border-b border-border/70 bg-background/80 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <Link to="/" className="font-serif text-xl font-bold tracking-tight">
          RealMock<span className="text-[color:var(--accent-warm)]">.</span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-[color:var(--ink-soft)]">
          <Link to="/interviewers" className="hover:text-foreground transition-colors">
            Interviewers
          </Link>
          <Link to="/how-it-works" className="hover:text-foreground transition-colors">
            How it works
          </Link>
          <Link to="/become-interviewer" className="hover:text-foreground transition-colors">
            Become an interviewer
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm" className="rounded-full">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/" });
                }}
              >
                Sign out
              </Button>
              {roles.includes("admin") && (
                <Button asChild size="sm" variant="ghost" className="rounded-full">
                  <a href="/admin">Admin</a>
                </Button>
              )}
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="rounded-full">
                <Link to="/sign-in">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="rounded-full bg-[color:var(--accent-warm)] text-[color:var(--accent-warm-foreground)] hover:bg-[color:var(--accent-warm)]/90">
                <Link to="/sign-up">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
