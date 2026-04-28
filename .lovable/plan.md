
# RealMock — Real human mock interviews

> "You learn anywhere. We test you in reality."

A platform where serious candidates book mock interviews with verified professionals from product-based companies. No courses, no AI, no peers. Interviews happen on external links (Zoom/Meet) pasted by the interviewer at confirmation.

---

## Visual & UX direction

- **Aesthetic:** Warm Professional (selected). Stone/cream background, serif headlines with italic accent, orange (`#C2410C`) as primary action color, sans-serif body, rounded-full buttons.
- **Tone:** Serious, trust-first, editorial. No flashy gradients, no animated hero blobs.
- **Trust signals everywhere:** verified badge, company name + role on every interviewer card, hire/no-hire verdicts, real feedback excerpts.

---

## User roles

1. **Candidate** — books interviews, uploads resume, gets feedback.
2. **Interviewer** — verified pro, sets availability, conducts, gives feedback.
3. **Admin** — verifies interviewers, moderates, handles payouts & abuse.

A single account can opt to apply as interviewer (becomes pending until admin approves).

---

## Phased delivery

Building "everything" in one shot produces a shallow product. Each phase ships a usable product increment.

### Phase 1 — Foundation, profiles, browse & book (no payment, no video yet)

**Auth & accounts**
- Email/password + Google sign-in (Lovable Cloud).
- On signup: pick role (Candidate / Apply as Interviewer).
- Candidate profile: name, target role, target companies, experience level, skills, resume upload (PDF).
- Interviewer profile: company, role, years of experience, expertise tags (DSA, System Design, Frontend, Backend, ML, PM, HR, Behavioral), LinkedIn URL, short bio, hourly rate.

**Browse interviewers**
- Filter by interview type, company tier, experience, price.
- Strict matching rule: candidates targeting product roles only see interviewers from product companies (admin-tagged on company list).
- Interviewer card shows: name, photo, company + role, verified badge, rating, price, availability snippet.

**Booking**
- Interviewer profile page with weekly availability calendar (interviewer sets recurring slots + blocks).
- Candidate picks a slot → selects interview type → confirms.
- Booking states: `pending_confirmation` → `confirmed` (interviewer accepts and pastes meeting link) → `completed` / `cancelled` / `no_show`.
- Reschedule and cancel flows with policy (e.g. free cancel >24h before).
- Email notifications at each state change (Resend).

**Pages in Phase 1**
- Landing
- Sign in / Sign up
- Browse interviewers
- Interviewer public profile
- Candidate dashboard (upcoming, past, resume)
- Interviewer dashboard (requests, upcoming, availability editor, profile)
- Booking detail page (with meeting link once confirmed)

### Phase 2 — Feedback, ratings & reality check dashboard

- After a booking is `completed`, interviewer is prompted to submit feedback:
  - Technical rating (1–5)
  - Communication rating (1–5)
  - **Hire / No Hire / Lean Hire / Lean No Hire** verdict
  - Strengths (free text)
  - Improvements (free text)
  - Optional private notes (admin-only)
- Candidate sees feedback on their dashboard once submitted.
- Candidate rates the interviewer (1–5 + short comment) — average shown on interviewer card.
- **Reality Check Dashboard** for candidates: chart of technical & communication scores over time, hire-rate %, strengths/weakness tag cloud aggregated from feedback.

### Phase 3 — Resume review (real humans)

- Candidate uploads resume + target role + JD link, pays for a review (added in Phase 5; until then free for testing).
- Reviewer queue visible to interviewers who opted in for resume reviews.
- Reviewer submits structured feedback: weak points, suggested rewrites per section, real hiring perspective, overall verdict (interview-worthy / needs work / reject).
- Candidate sees review with annotated sections.

### Phase 4 — Admin panel & verification

- Admin role gated via `user_roles` table + `has_role()` SECURITY DEFINER function (never on profiles table).
- Verification queue: pending interviewer applications with LinkedIn URL, claimed company/role, optional proof upload. Admin approves/rejects with note. Approved → `verified` badge on profile.
- Company directory: admin tags companies as `product_based` / `service_based` / `startup` for the matching rule.
- Users list with search, ban, force-logout.
- Booking monitor: flag no-shows, disputes.
- Quality monitor: list interviewers with avg rating < 3.5 or high cancellation rate.
- Referral abuse review queue (Phase 6).

### Phase 5 — Payments

- Stripe (recommend tool will confirm) seamless integration.
- Dynamic price per interviewer (set on their profile, validated min/max).
- Candidate pays at booking confirmation; held until interview completes.
- Interviewer payout ledger (no automated payout in v1 — admin marks paid).
- Refund policy on cancellation per the rules in Phase 1.
- Resume review purchasable as a one-off.

### Phase 6 — Referral system (smart, anti-abuse)

- Every user gets a unique referral code + link.
- **Candidate referral:** referrer earns reward only after referee's **first paid booking completes**.
- **Interviewer referral:** referrer earns reward only after referee is **verified AND completes first interview**.
- Reward types: wallet credit, % discount on next booking, free resume review at N referrals.
- Wallet system: credits applied at checkout (max % of order configurable).
- **Anti-abuse rules enforced server-side:**
  - Reward only after the qualifying transaction lands.
  - Max N successful referrals per referrer per month (configurable, default 5).
  - Block self-referral (same email domain + name fuzzy match + same IP/device fingerprint).
  - Auto-flag suspicious patterns (>3 referees from same IP, sequential emails) → admin review queue.
- Referral dashboard for users: total referrals, pending, converted, rewards earned, rewards available.

### Phase 7 — Built-in video (deferred, optional)

You chose external links for v1, which is the right call. We can layer in Daily.co or 100ms later behind the same booking flow without changing the data model — the `meeting_link` field just becomes auto-generated. Not building this now.

---

## Key product rules (enforced, not just shown)

- **No peer interviews:** server validates that interviewer's experience level ≥ candidate's target level + buffer. Booking blocked otherwise with a clear message.
- **Product → product matching:** if candidate's target companies are tagged product-based, only product-based interviewers appear in browse and can be booked.
- **Verified-only:** unverified interviewers don't appear in browse and can't accept bookings.

---

## Tech notes (for the technical reader)

- TanStack Start (already scaffolded), Tailwind v4, shadcn/ui.
- Lovable Cloud (Supabase) for DB/auth/storage. Resume PDFs in a private storage bucket; signed URLs.
- Roles via a separate `user_roles` table with `app_role` enum (`candidate`, `interviewer`, `admin`) and a `has_role()` SECURITY DEFINER function. RLS on every table.
- Server functions (`createServerFn` + `requireSupabaseAuth`) for booking creation, slot conflict checks, feedback submission, referral attribution, payment intents, payout ledger writes — never trust client for state transitions or reward grants.
- Email via Resend (will request `RESEND_API_KEY` when Phase 1 wires notifications).
- Stripe via Lovable's seamless integration in Phase 5.
- Routes follow file-based routing under `src/routes/` — separate route per top-level page (landing, browse, interviewers/$id, dashboard/*, admin/*, etc.) so SEO and SSR work properly.

---

## What I'll build first (Phase 1 deliverable)

End of Phase 1 you'll have a working product where:
- A candidate can sign up, fill profile, upload resume, browse verified interviewers, book a slot.
- An interviewer can sign up, apply for verification (admin will manually flip a flag for now until Phase 4), set availability, accept a request, paste a meeting link.
- Both sides see upcoming + past bookings on their dashboard.
- Landing page in the Warm Professional aesthetic with clear CTAs for both audiences.

Phases 2–6 follow as separate iterations after you confirm Phase 1.
