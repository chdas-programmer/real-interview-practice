import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 mt-24">
      <div className="mx-auto max-w-6xl px-6 py-12 grid gap-8 md:grid-cols-4 text-sm">
        <div>
          <div className="font-serif text-lg font-bold">
            RealMock<span className="text-[color:var(--accent-warm)]">.</span>
          </div>
          <p className="mt-2 text-[color:var(--ink-soft)] max-w-xs">
            No courses. No AI. No peers. Just real interviews with real engineers.
          </p>
        </div>
        <div>
          <div className="font-medium mb-3">For candidates</div>
          <ul className="space-y-2 text-[color:var(--ink-soft)]">
            <li><Link to="/interviewers" className="hover:text-foreground">Find an interviewer</Link></li>
            <li><Link to="/how-it-works" className="hover:text-foreground">How it works</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-medium mb-3">For pros</div>
          <ul className="space-y-2 text-[color:var(--ink-soft)]">
            <li><Link to="/become-interviewer" className="hover:text-foreground">Become an interviewer</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-medium mb-3">Account</div>
          <ul className="space-y-2 text-[color:var(--ink-soft)]">
            <li><Link to="/sign-in" className="hover:text-foreground">Sign in</Link></li>
            <li><Link to="/sign-up" className="hover:text-foreground">Sign up</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/70 py-6 text-center text-xs text-[color:var(--ink-soft)]">
        © {new Date().getFullYear()} RealMock. Practice like it's real.
      </div>
    </footer>
  );
}
