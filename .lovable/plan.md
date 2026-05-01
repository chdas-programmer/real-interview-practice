
# Mock Interview Platform — Major Upgrade

Replacing meeting-link flow with **Dyte video**, adding **Razorpay payments** with free-session logic, **reviews**, **no-show cron**, and **UI polish**. Building on existing `bookings` table (renaming/aliasing concepts rather than replacing — preserves data).

---

## 1. Database Schema Changes (one migration)

Extending `bookings` instead of creating a parallel `sessions` table — cleaner and preserves existing rows.

```sql
-- bookings: add Dyte + payment + no-show fields
ALTER TABLE public.bookings
  ADD COLUMN dyte_meeting_id text,
  ADD COLUMN end_at timestamptz,                       -- backfilled from scheduled_at + duration
  ADD COLUMN payment_status text NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending','paid','refunded','free')),
  ADD COLUMN razorpay_order_id text,
  ADD COLUMN razorpay_payment_id text,
  ADD COLUMN candidate_joined_at timestamptz,
  ADD COLUMN interviewer_joined_at timestamptz;

-- backfill end_at, then enforce NOT NULL
UPDATE public.bookings SET end_at = scheduled_at + (duration_minutes || ' minutes')::interval WHERE end_at IS NULL;
ALTER TABLE public.bookings ALTER COLUMN end_at SET NOT NULL;

-- extend booking_status enum: ongoing, missed
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'ongoing';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'missed';

-- free-session tracking
ALTER TABLE public.candidate_profiles ADD COLUMN free_session_used boolean NOT NULL DEFAULT false;
ALTER TABLE public.interviewer_profiles ADD COLUMN free_session_used boolean NOT NULL DEFAULT false;

-- reviews
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL,
  reviewee_id uuid NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback text CHECK (char_length(feedback) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, reviewer_id)
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
-- Policies: SELECT public; INSERT only by participant of a 'completed' booking; no UPDATE/DELETE except admin.

-- helper view for interviewer rating aggregate (avg + count)
CREATE OR REPLACE VIEW public.interviewer_ratings AS
  SELECT reviewee_id AS interviewer_id,
         round(avg(rating)::numeric, 2) AS avg_rating,
         count(*)::int AS review_count
  FROM public.reviews GROUP BY reviewee_id;
```

---

## 2. Dyte Video Integration

**Secrets to add (will request via add_secret):** `DYTE_ORG_ID`, `DYTE_API_KEY`.

**Flow:**

```text
candidate books → bookings row created (status=pending_confirmation)
                   ↓
interviewer confirms → server fn createDyteMeeting()
                   ↓                         (POST /v2/meetings)
              dyte_meeting_id stored, status=confirmed
                   ↓
user clicks "Join" → server fn getDyteToken({booking_id})
                   ↓  validates: is participant + within join window
                       (start - 5min)  ≤ now ≤  (start + 10min)
                   ↓  POST /v2/meetings/{id}/participants
                   ↓  records candidate_joined_at / interviewer_joined_at
              returns auth token
                   ↓
client renders <DyteMeeting/> from @dyte-in/react-ui-kit
                   ↓
on "left" event or end_at reached → mark completed
```

**Files:**
- `src/server/dyte.server.ts` — wraps Dyte REST: `createMeeting()`, `addParticipant()` (Basic auth: `base64(DYTE_ORG_ID:DYTE_API_KEY)`).
- `src/server/dyte.functions.ts` — three `createServerFn`s, all `requireSupabaseAuth` middleware:
  - `createMeetingForBooking({ bookingId })` — interviewer-only, on confirm.
  - `getJoinToken({ bookingId })` — checks role, time window, payment_status; returns `{ authToken, meetingId }`.
  - `markJoined({ bookingId })` — stamps joined_at.
- `src/routes/_authed/booking.$id.tsx` — replace meeting-link UI with **"Join meeting"** button → opens `/_authed/meeting.$id.tsx`.
- `src/routes/_authed/meeting.$id.tsx` — full-screen Dyte UI kit. Auto-end on `end_at`. Refresh re-fetches token (rejoin works).

**Packages:** `@dytesdk/react-web-core`, `@dytesdk/react-ui-kit`.

---

## 3. Razorpay Payments (BYOK)

**Secrets to request:** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.
**Public env (added to .env via build secret):** `VITE_RAZORPAY_KEY_ID`.

**Flow:**

```text
candidate clicks "Request booking"
        ↓
server fn createBookingIntent()
   - if candidate.free_session_used = false AND price > 0:
        → mark payment_status = 'free', set free_session_used = true, status=pending_confirmation
   - else if price = 0:
        → payment_status = 'free'
   - else:
        → create Razorpay order (POST /v1/orders), store razorpay_order_id
        → return { orderId, keyId, amount }
        ↓
client opens Razorpay Checkout (script tag loaded once)
        ↓ on success → server fn verifyPayment({ orderId, paymentId, signature })
   - HMAC-SHA256(orderId|paymentId, KEY_SECRET) === signature
   - update payment_status='paid', razorpay_payment_id
        ↓
booking visible to interviewer for confirm
```

**Webhook:** `src/routes/api/public/webhooks/razorpay.ts` — verifies `x-razorpay-signature`, handles `payment.captured` / `payment.failed` as a fallback to client verify.

**Refunds (admin button on `/admin`):** server fn `refundBooking({ bookingId, reason })` → POST `/v1/payments/{id}/refund` → set `payment_status='refunded'`. Auto-refund hook in no-show cron when interviewer is the no-show.

**Files:**
- `src/server/razorpay.server.ts` — REST wrapper (Basic auth).
- `src/server/payments.functions.ts` — `createBookingIntent`, `verifyPayment`, `refundBooking`.
- `src/components/razorpay-checkout.tsx` — loads `https://checkout.razorpay.com/v1/checkout.js`, opens modal.
- Update `src/routes/interviewers.$id.tsx` to use new intent flow.

---

## 4. No-Show & Auto-Status Cron

`src/routes/api/public/hooks/booking-tick.ts` (POST, validates `apikey` header against anon key):

```text
every minute:
  for bookings where status IN ('confirmed','ongoing'):
    now > end_at                     → status='completed'
    now > start + 10min AND
      neither joined                 → status='missed', refund both fully
    now > start + 10min AND
      only interviewer not joined    → status='missed', full refund to candidate
    now > start + 10min AND
      only candidate not joined      → status='missed', NO refund
    both joined AND now ≥ start      → status='ongoing'
```

Scheduled via `pg_cron` + `pg_net` calling the public hook every minute.

---

## 5. Reviews

- `src/components/review-form.tsx` — 1–5 stars + textarea, posts via `submitReview` server fn (validates booking is completed and user was a participant).
- Show on `/booking/$id` after status=completed, before review exists.
- Display avg rating + count on `/interviewers/$id` (from `interviewer_ratings` view) and in the `/interviewers` directory cards.

---

## 6. Interviewer Profile Enhancements

`/interviewers/$id` already shows most fields. Add:
- ⭐ Avg rating + review count (from view).
- "Total interviews completed" (count from bookings where status=completed).
- Recent reviews list (last 5, with reviewer first name).

---

## 7. UI Polish

- **Landing (`/`)**: company logos strip (Google, Amazon, Microsoft, Meta, Netflix, Stripe — SVGs inline), static testimonials section (3 cards), "Top Interviewers" section (top 3 by avg_rating).
- Remove `meeting_link` references everywhere; replace with "Join meeting" button gated by time window.

---

## 8. Security Hardening

- All Dyte/Razorpay calls go through `createServerFn` with `requireSupabaseAuth`; never call from client.
- `getJoinToken` re-validates: user is participant, payment_status ∈ (paid, free), within join window.
- Razorpay webhook verifies HMAC signature with `timingSafeEqual`.
- Reviews RLS: only insert if `EXISTS (booking where status=completed AND user is participant)`.

---

## Technical Layout

```text
src/
  server/
    dyte.server.ts            (REST wrapper)
    dyte.functions.ts         (createMeeting, getJoinToken, markJoined)
    razorpay.server.ts
    payments.functions.ts     (intent, verify, refund)
    bookings.functions.ts     (submitReview, markCompleted)
  routes/
    _authed/
      meeting.$id.tsx         (NEW — Dyte UI)
      booking.$id.tsx         (rewrite: Join btn + review form)
    api/public/
      hooks/booking-tick.ts   (cron handler)
      webhooks/razorpay.ts
  components/
    razorpay-checkout.tsx
    review-form.tsx
    star-rating.tsx
    company-logos.tsx
    testimonials.tsx
```

---

## Execution Order

1. Migration (schema + RLS + view + enum).
2. Request secrets: Dyte (2), Razorpay (3).
3. Server: Dyte + Razorpay wrappers + server functions.
4. Routes: rewrite booking page, add meeting page.
5. Payment flow on booking request.
6. Cron hook + pg_cron schedule.
7. Reviews UI + profile rating display.
8. Landing page polish.

I'll wait for secrets after step 1 before continuing past step 2.
