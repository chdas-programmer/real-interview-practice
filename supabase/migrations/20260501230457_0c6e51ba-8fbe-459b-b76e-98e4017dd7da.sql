CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- unschedule any prior version
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'booking-tick') THEN
    PERFORM cron.unschedule('booking-tick');
  END IF;
END $$;

SELECT cron.schedule(
  'booking-tick',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--f16f37b1-94ac-49ea-88be-7c9b5e02d9b5.lovable.app/api/public/hooks/booking-tick',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3enJnZmNzc2dubGZ4cGVjem1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczOTc4NTksImV4cCI6MjA5Mjk3Mzg1OX0.h8sFNuJiXuSfeL3JKyuHWxtDtwlal0WPixNe4op69z4'
    ),
    body := '{}'::jsonb
  );
  $$
);