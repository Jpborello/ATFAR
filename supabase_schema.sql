-- 1. Create Profile Roles Enum Safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'pharmacy_owner', 'employee');
    END IF;
END$$;

-- 2. Create Profiles Table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    role user_role DEFAULT 'employee',
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create Pharmacies Table
CREATE TABLE IF NOT EXISTS public.pharmacies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    cuit TEXT NOT NULL UNIQUE,
    address TEXT NOT NULL,
    latitude FLOAT8,
    longitude FLOAT8,
    cross_streets TEXT,
    phone_alt TEXT,
    registered BOOLEAN DEFAULT false NOT NULL,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    last_checked TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;

-- 4. Create Employees Table (Safely check column nullability or defaults if inserting from registration)
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    cuil TEXT NOT NULL UNIQUE,
    category TEXT, -- Modified to support registration without initial category
    entry_date DATE, -- Modified to support registration without initial entry_date
    weekly_hours INTEGER DEFAULT 44 NOT NULL,
    active BOOLEAN DEFAULT true NOT NULL,
    receipt_url TEXT,
    receipt_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- 5. Create Benefit Requests Table (for school kits, etc.)
CREATE TABLE IF NOT EXISTS public.benefit_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    benefit_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'approved', 'rejected'
    attachment_url TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.benefit_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert on benefit_requests" ON public.benefit_requests;
CREATE POLICY "Allow public insert on benefit_requests" ON public.benefit_requests
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow admins all access on benefit_requests" ON public.benefit_requests;
CREATE POLICY "Allow admins all access on benefit_requests" ON public.benefit_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 6. Create Job Applications Table (for CV Board)
CREATE TABLE IF NOT EXISTS public.job_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    message TEXT,
    cv_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------
-- RLS POLICIES (Row Level Security) - Dropped first to avoid "already exists" errors
-- ----------------------------------------------------

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Pharmacies Policies
DROP POLICY IF EXISTS "Pharmacies viewable by everyone" ON public.pharmacies;
CREATE POLICY "Pharmacies viewable by everyone" ON public.pharmacies
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners can update their own pharmacy" ON public.pharmacies;
CREATE POLICY "Owners can update their own pharmacy" ON public.pharmacies
    FOR UPDATE USING (auth.uid() = owner_id OR owner_id IS NULL)
    WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Enable insert for pharmacies" ON public.pharmacies;
CREATE POLICY "Enable insert for pharmacies" ON public.pharmacies
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Admins can do everything on pharmacies" ON public.pharmacies;
CREATE POLICY "Admins can do everything on pharmacies" ON public.pharmacies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Employees Policies
DROP POLICY IF EXISTS "Owners can see their own employees" ON public.employees;
CREATE POLICY "Owners can see their own employees" ON public.employees
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.pharmacies 
            WHERE pharmacies.id = employees.pharmacy_id AND pharmacies.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Owners can manage their own employees" ON public.employees;
CREATE POLICY "Owners can manage their own employees" ON public.employees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.pharmacies 
            WHERE pharmacies.id = employees.pharmacy_id AND pharmacies.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can view and manage all employees" ON public.employees;
CREATE POLICY "Admins can view and manage all employees" ON public.employees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Benefit Requests Policies
DROP POLICY IF EXISTS "Users can view their own requests" ON public.benefit_requests;
CREATE POLICY "Users can view their own requests" ON public.benefit_requests
    FOR SELECT USING (auth.uid() = employee_id);

DROP POLICY IF EXISTS "Users can create their own requests" ON public.benefit_requests;
CREATE POLICY "Users can create their own requests" ON public.benefit_requests
    FOR INSERT WITH CHECK (auth.uid() = employee_id);

DROP POLICY IF EXISTS "Admins can view and update all requests" ON public.benefit_requests;
CREATE POLICY "Admins can view and update all requests" ON public.benefit_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Job Applications Policies (Bolsa de empleo)
DROP POLICY IF EXISTS "Public can submit applications" ON public.job_applications;
CREATE POLICY "Public can submit applications" ON public.job_applications
    FOR INSERT WITH CHECK (
        full_name IS NOT NULL AND 
        email IS NOT NULL AND 
        phone IS NOT NULL AND 
        cv_url IS NOT NULL
    );

DROP POLICY IF EXISTS "Only Admins can view applications" ON public.job_applications;
DROP POLICY IF EXISTS "Admins and Pharmacy Owners can view applications" ON public.job_applications;
CREATE POLICY "Admins and Pharmacy Owners can view applications" ON public.job_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'pharmacy_owner')
        )
    );


-- ----------------------------------------------------
-- AUTOMATIC PROFILE TRIGGER ON SIGN UP
-- ----------------------------------------------------

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role public.user_role := 'employee'::public.user_role;
  assigned_role public.user_role;
  raw_role_text text;
BEGIN
  -- Extraemos el rol de los metadatos como texto simple
  raw_role_text := new.raw_user_meta_data->>'role';
  
  -- Intentamos convertirlo de manera segura (evitamos que metadatos del cliente puedan definir un 'admin')
  IF raw_role_text = 'pharmacy_owner' THEN
    assigned_role := 'pharmacy_owner'::public.user_role;
  ELSE
    assigned_role := default_role;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, phone)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    assigned_role,
    new.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger execution
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ----------------------------------------------------
-- DATABASE EXTENSIONS (MIGRATION FOR NEW PHARMACY FIELDS)
-- ----------------------------------------------------
ALTER TABLE public.pharmacies
  ADD COLUMN IF NOT EXISTS initial_period DATE,
  ADD COLUMN IF NOT EXISTS razon_social TEXT,
  ADD COLUMN IF NOT EXISTS nombre_fantasia TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS actividad_economica TEXT,
  ADD COLUMN IF NOT EXISTS declared_employee_count INTEGER,
  ADD COLUMN IF NOT EXISTS branches TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS declared_addresses TEXT,
  ADD COLUMN IF NOT EXISTS resp_email TEXT,
  ADD COLUMN IF NOT EXISTS resp_phone TEXT,
  ADD COLUMN IF NOT EXISTS resp_alt_email TEXT,
  ADD COLUMN IF NOT EXISTS hr_email TEXT,
  ADD COLUMN IF NOT EXISTS hr_phone TEXT,
  ADD COLUMN IF NOT EXISTS hr_alt_email TEXT,
  ADD COLUMN IF NOT EXISTS hr_name TEXT,
  ADD COLUMN IF NOT EXISTS hr_role TEXT,
  ADD COLUMN IF NOT EXISTS has_debt BOOLEAN DEFAULT true NOT NULL;


-- ----------------------------------------------------
-- STORAGE BUCKETS CONFIGURATION (cvs & receipts)
-- ----------------------------------------------------

-- 1. Create buckets safely
INSERT INTO storage.buckets (id, name, public)
VALUES ('cvs', 'cvs', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage security policies
DROP POLICY IF EXISTS "Public Access to CVs" ON storage.objects;
CREATE POLICY "Public Access to CVs" ON storage.objects
    FOR SELECT USING (bucket_id = 'cvs');

DROP POLICY IF EXISTS "Allow Public Upload to CVs" ON storage.objects;
CREATE POLICY "Allow Public Upload to CVs" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'cvs');

DROP POLICY IF EXISTS "Public Access to Receipts" ON storage.objects;
CREATE POLICY "Public Access to Receipts" ON storage.objects
    FOR SELECT USING (bucket_id = 'receipts');

DROP POLICY IF EXISTS "Allow Public Upload to Receipts" ON storage.objects;
CREATE POLICY "Allow Public Upload to Receipts" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'receipts');


-- ----------------------------------------------------
-- PAYMENTS TABLE CONFIGURATION
-- ----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE NOT NULL,
    invoice_number TEXT NOT NULL,
    period TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    status TEXT DEFAULT 'impago' NOT NULL, -- 'pagado', 'impago', 'en_revision'
    due_date DATE NOT NULL,
    pay_date DATE,
    transaction_code TEXT,
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Owners can view own payments" ON public.payments;
CREATE POLICY "Owners can view own payments" ON public.payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.pharmacies 
            WHERE pharmacies.id = payments.pharmacy_id AND pharmacies.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Owners can manage own payments" ON public.payments;
CREATE POLICY "Owners can manage own payments" ON public.payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.pharmacies 
            WHERE pharmacies.id = payments.pharmacy_id AND pharmacies.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can view and manage all payments" ON public.payments;
CREATE POLICY "Admins can view and manage all payments" ON public.payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );


-- ----------------------------------------------------
-- ANNOUNCEMENTS TABLE CONFIGURATION
-- ----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL, -- 'Gremiales', 'Beneficios', 'Capacitación', 'Institucional'
    visibility TEXT DEFAULT 'public' NOT NULL, -- 'public' o 'pharmacy'
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Everyone can view public announcements" ON public.announcements;
CREATE POLICY "Everyone can view public announcements" ON public.announcements
    FOR SELECT USING (visibility = 'public');

DROP POLICY IF EXISTS "Owners can view pharmacy announcements" ON public.announcements;
CREATE POLICY "Owners can view pharmacy announcements" ON public.announcements
    FOR SELECT USING (
        visibility = 'pharmacy' AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND (profiles.role = 'pharmacy_owner' OR profiles.role = 'admin')
        )
    );

DROP POLICY IF EXISTS "Admins can view and manage all announcements" ON public.announcements;
CREATE POLICY "Admins can view and manage all announcements" ON public.announcements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Salary Scales Table
CREATE TABLE IF NOT EXISTS public.salary_scales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category TEXT NOT NULL,
    basic NUMERIC(12,2) NOT NULL,
    no_rem NUMERIC(12,2) DEFAULT 0,
    description TEXT,
    agreement TEXT NOT NULL, -- 'may2026', 'feb2026'
    period TEXT NOT NULL, -- 'may', 'june', 'july', 'feb', 'march', 'april'
    is_additional BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.salary_scales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Scales viewable by everyone" ON public.salary_scales;
CREATE POLICY "Scales viewable by everyone" ON public.salary_scales
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can do everything on scales" ON public.salary_scales;
CREATE POLICY "Admins can do everything on scales" ON public.salary_scales
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Add onboarding tutorial status tracker to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS seen_tutorial BOOLEAN DEFAULT false;

-- 8. Create Salary Scales Documents Table (for uploaded PDF/Images)
CREATE TABLE IF NOT EXISTS public.salary_scales_docs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    period TEXT NOT NULL,
    file_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.salary_scales_docs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Scales docs viewable by everyone" ON public.salary_scales_docs;
CREATE POLICY "Scales docs viewable by everyone" ON public.salary_scales_docs
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can do everything on scales docs" ON public.salary_scales_docs;
CREATE POLICY "Admins can do everything on scales docs" ON public.salary_scales_docs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 9. Migration: Calculation based on affiliation
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS is_affiliate BOOLEAN DEFAULT false NOT NULL;

