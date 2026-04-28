
CREATE TYPE public.app_role AS ENUM ('candidate', 'interviewer', 'admin');
CREATE TYPE public.experience_level AS ENUM ('entry', 'junior', 'mid', 'senior', 'staff', 'principal');
CREATE TYPE public.verification_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE public.interview_type AS ENUM ('dsa', 'system_design', 'frontend', 'backend', 'ml', 'behavioral', 'hr', 'pm');
CREATE TYPE public.booking_status AS ENUM ('pending_confirmation', 'confirmed', 'completed', 'cancelled', 'no_show');
CREATE TYPE public.company_tier AS ENUM ('product_based', 'service_based', 'startup', 'other');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  headline TEXT,
  referral_code TEXT UNIQUE NOT NULL DEFAULT substr(md5(random()::text), 1, 8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.candidate_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  target_role TEXT,
  target_companies TEXT[] DEFAULT '{}',
  target_company_tier company_tier DEFAULT 'product_based',
  experience_level experience_level DEFAULT 'entry',
  skills TEXT[] DEFAULT '{}',
  resume_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.interviewer_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  company_tier company_tier NOT NULL DEFAULT 'product_based',
  job_role TEXT NOT NULL,
  years_experience INTEGER NOT NULL DEFAULT 0 CHECK (years_experience >= 0 AND years_experience <= 50),
  experience_level experience_level NOT NULL DEFAULT 'mid',
  expertise interview_type[] NOT NULL DEFAULT '{}',
  linkedin_url TEXT,
  bio TEXT,
  hourly_rate INTEGER NOT NULL DEFAULT 1500 CHECK (hourly_rate >= 0 AND hourly_rate <= 100000),
  verification_status verification_status NOT NULL DEFAULT 'pending',
  accepts_resume_reviews BOOLEAN NOT NULL DEFAULT FALSE,
  verification_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.interviewer_profiles ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_interviewer_verified ON public.interviewer_profiles(verification_status) WHERE verification_status = 'verified';

CREATE TABLE public.availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  is_booked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_avail_interviewer ON public.availability_slots(interviewer_id, start_at);

CREATE OR REPLACE FUNCTION public.validate_slot()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.end_at <= NEW.start_at THEN
    RAISE EXCEPTION 'end_at must be after start_at';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validate_slot BEFORE INSERT OR UPDATE ON public.availability_slots
  FOR EACH ROW EXECUTE FUNCTION public.validate_slot();

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  interviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  slot_id UUID REFERENCES public.availability_slots(id) ON DELETE SET NULL,
  interview_type interview_type NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes BETWEEN 15 AND 180),
  status booking_status NOT NULL DEFAULT 'pending_confirmation',
  meeting_link TEXT,
  candidate_notes TEXT,
  cancellation_reason TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_bookings_candidate ON public.bookings(candidate_id, scheduled_at DESC);
CREATE INDEX idx_bookings_interviewer ON public.bookings(interviewer_id, scheduled_at DESC);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_touch_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_touch_candidate BEFORE UPDATE ON public.candidate_profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_touch_interviewer BEFORE UPDATE ON public.interviewer_profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_touch_bookings BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE desired_role app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  ) ON CONFLICT (id) DO NOTHING;

  desired_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'candidate');
  IF desired_role = 'admin' THEN desired_role := 'candidate'; END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, desired_role) ON CONFLICT DO NOTHING;
  IF desired_role = 'candidate' THEN
    INSERT INTO public.candidate_profiles (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS POLICIES
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles_admin_manage" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles_self_insert_interviewer" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND role = 'interviewer');

CREATE POLICY "candidate_select_own" ON public.candidate_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "candidate_insert_own" ON public.candidate_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "candidate_update_own" ON public.candidate_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "candidate_select_interviewer_for_booking" ON public.candidate_profiles FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.candidate_id = candidate_profiles.user_id AND b.interviewer_id = auth.uid()));

CREATE POLICY "interviewer_select_verified" ON public.interviewer_profiles FOR SELECT TO authenticated
USING (verification_status = 'verified' OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "interviewer_insert_own" ON public.interviewer_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "interviewer_update_own" ON public.interviewer_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "interviewer_admin_all" ON public.interviewer_profiles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger to prevent self-promotion to verified
CREATE OR REPLACE FUNCTION public.guard_interviewer_verification()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change verification_status';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_guard_verification BEFORE UPDATE ON public.interviewer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_interviewer_verification();

CREATE POLICY "slots_select_all" ON public.availability_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "slots_insert_own" ON public.availability_slots FOR INSERT TO authenticated
WITH CHECK (auth.uid() = interviewer_id AND public.has_role(auth.uid(), 'interviewer'));
CREATE POLICY "slots_update_own" ON public.availability_slots FOR UPDATE TO authenticated USING (auth.uid() = interviewer_id);
CREATE POLICY "slots_delete_own" ON public.availability_slots FOR DELETE TO authenticated USING (auth.uid() = interviewer_id);

CREATE POLICY "bookings_select_participants" ON public.bookings FOR SELECT TO authenticated
USING (auth.uid() = candidate_id OR auth.uid() = interviewer_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "bookings_insert_candidate" ON public.bookings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = candidate_id AND public.has_role(auth.uid(), 'candidate'));
CREATE POLICY "bookings_update_participants" ON public.bookings FOR UPDATE TO authenticated
USING (auth.uid() = candidate_id OR auth.uid() = interviewer_id);
CREATE POLICY "bookings_admin_all" ON public.bookings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "resumes_owner_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "resumes_owner_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "resumes_owner_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "resumes_owner_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "resumes_interviewer_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'resumes' AND EXISTS (
  SELECT 1 FROM public.bookings b WHERE b.interviewer_id = auth.uid() AND b.candidate_id::text = (storage.foldername(name))[1]
));
