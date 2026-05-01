-- 1. Extend bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS dyte_meeting_id text,
  ADD COLUMN IF NOT EXISTS end_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending','paid','refunded','free')),
  ADD COLUMN IF NOT EXISTS razorpay_order_id text,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id text,
  ADD COLUMN IF NOT EXISTS candidate_joined_at timestamptz,
  ADD COLUMN IF NOT EXISTS interviewer_joined_at timestamptz;

UPDATE public.bookings
  SET end_at = scheduled_at + (duration_minutes || ' minutes')::interval
  WHERE end_at IS NULL;

ALTER TABLE public.bookings ALTER COLUMN end_at SET NOT NULL;

-- 2. Free-session flags
ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS free_session_used boolean NOT NULL DEFAULT false;
ALTER TABLE public.interviewer_profiles
  ADD COLUMN IF NOT EXISTS free_session_used boolean NOT NULL DEFAULT false;

-- 3. Reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL,
  reviewee_id uuid NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback text CHECK (feedback IS NULL OR char_length(feedback) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, reviewer_id)
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY reviews_select_all ON public.reviews
  FOR SELECT TO authenticated USING (true);

CREATE POLICY reviews_insert_participant ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.status = 'completed'
        AND ((b.candidate_id = auth.uid() AND b.interviewer_id = reviewee_id)
          OR (b.interviewer_id = auth.uid() AND b.candidate_id = reviewee_id))
    )
  );

CREATE POLICY reviews_admin_all ON public.reviews
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. View for ratings
CREATE OR REPLACE VIEW public.interviewer_ratings AS
  SELECT reviewee_id AS interviewer_id,
         round(avg(rating)::numeric, 2) AS avg_rating,
         count(*)::int AS review_count
  FROM public.reviews
  GROUP BY reviewee_id;

GRANT SELECT ON public.interviewer_ratings TO authenticated, anon;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS bookings_status_end_at_idx ON public.bookings(status, end_at);
CREATE INDEX IF NOT EXISTS reviews_reviewee_idx ON public.reviews(reviewee_id);