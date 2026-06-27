-- 1. Create Profile Roles Enum
CREATE TYPE user_role AS ENUM ('admin', 'pharmacy_owner', 'employee');

-- 2. Create Profiles Table (extends auth.users)
CREATE TABLE public.profiles (
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
CREATE TABLE public.pharmacies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    cuit TEXT NOT NULL UNIQUE,
    address TEXT NOT NULL,
    latitude FLOAT8,
    longitude FLOAT8,
    registered BOOLEAN DEFAULT false NOT NULL,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    last_checked TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;

-- 4. Create Employees Table
CREATE TABLE public.employees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    cuil TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    entry_date DATE NOT NULL,
    weekly_hours INTEGER DEFAULT 44 NOT NULL,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- 5. Create Benefit Requests Table (for school kits, etc.)
CREATE TABLE public.benefit_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    benefit_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'approved', 'rejected'
    attachment_url TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.benefit_requests ENABLE ROW LEVEL SECURITY;

-- 6. Create Job Applications Table (for CV Board)
CREATE TABLE public.job_applications (
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
-- RLS POLICIES (Row Level Security)
-- ----------------------------------------------------

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Pharmacies Policies
CREATE POLICY "Pharmacies viewable by everyone" ON public.pharmacies
    FOR SELECT USING (true);

CREATE POLICY "Owners can update their own pharmacy" ON public.pharmacies
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Admins can do everything on pharmacies" ON public.pharmacies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Employees Policies
CREATE POLICY "Owners can see their own employees" ON public.employees
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.pharmacies 
            WHERE pharmacies.id = employees.pharmacy_id AND pharmacies.owner_id = auth.uid()
        )
    );

CREATE POLICY "Owners can manage their own employees" ON public.employees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.pharmacies 
            WHERE pharmacies.id = employees.pharmacy_id AND pharmacies.owner_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view and manage all employees" ON public.employees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Benefit Requests Policies
CREATE POLICY "Users can view their own requests" ON public.benefit_requests
    FOR SELECT USING (auth.uid() = employee_id);

CREATE POLICY "Users can create their own requests" ON public.benefit_requests
    FOR INSERT WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Admins can view and update all requests" ON public.benefit_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Job Applications Policies (Bolsa de empleo)
CREATE POLICY "Public can submit applications" ON public.job_applications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Only Admins can view applications" ON public.job_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );


-- ----------------------------------------------------
-- AUTOMATIC PROFILE TRIGGER ON SIGN UP
-- ----------------------------------------------------

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'employee'::user_role)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution
CREATE OR REPLACE TRIGGER on_auth_user_created
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
  ADD COLUMN IF NOT EXISTS hr_alt_email TEXT;


-- ----------------------------------------------------
-- STORAGE BUCKETS CONFIGURATION (Optional - Run manually or configure via Dashboard)
-- ----------------------------------------------------
-- Recuerda habilitar dos Buckets en la sección Storage de Supabase con acceso público:
-- 1. 'cvs' (para la Bolsa de Trabajo)
-- 2. 'receipts' (para los comprobantes de Útiles Escolares)

