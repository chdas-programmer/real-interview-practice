DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_candidate_not_interviewer'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_candidate_not_interviewer
      CHECK (candidate_id <> interviewer_id) NOT VALID;
  END IF;
END
$$;
