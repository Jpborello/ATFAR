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
    cuil TEXT NOT NULL,
    category TEXT, -- Modified to support registration without initial category
    entry_date DATE, -- Modified to support registration without initial entry_date
    weekly_hours NUMERIC DEFAULT 45 NOT NULL,
    active BOOLEAN DEFAULT true NOT NULL,
    receipt_url TEXT,
    receipt_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT employees_pharmacy_cuil_key UNIQUE (pharmacy_id, cuil)
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

-- Prep for online payment gateway integration (Plus Pagos / Banco de Santa Fe)
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_provider TEXT; -- 'transfer' | 'plus_pagos'
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS external_reference TEXT; -- id at the gateway, used to reconcile webhooks
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS checkout_url TEXT; -- pending online checkout link

CREATE INDEX IF NOT EXISTS idx_payments_external_reference ON public.payments(external_reference);

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
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS is_affiliate BOOLEAN DEFAULT true NOT NULL;
-- (2026-10-21) Por defecto afiliado: la farmacia marca "NO es afiliado" para quedar exenta del 2%.
ALTER TABLE public.employees ALTER COLUMN is_affiliate SET DEFAULT true;

-- 10. Migration: Sueldo personalizado / override para casos extraordinarios (jornada reducida, licencias, etc.)
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS custom_salary NUMERIC DEFAULT NULL;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS custom_no_rem NUMERIC DEFAULT NULL;

-- 11. Migration: Reserva de puesto (art. 211 LCT) / licencia sin goce. El empleado sigue en nómina
-- pero no cobra sueldo, así que no genera aporte sindical ni se le exige recibo. NULL = trabajando.
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS job_reserve_since DATE DEFAULT NULL;

-- 12. Migration: Detalle de la DDJJ presentada online (liquidación por empleado + observaciones),
-- para que el sindicato pueda auditar cada declaración desde el admin.
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS ddjj_detail JSONB DEFAULT NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS ddjj_observations TEXT DEFAULT NULL;

-- 13. Migration: Matrícula profesional del farmacéutico. La categoría Farmacéutico depende del
-- título y la matrícula (auditorías de farmacia), nunca de la antigüedad. Reemplaza al flag
-- has_pharmacist_title, que queda sin uso.
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS pharmacist_license TEXT DEFAULT NULL;

-- 14. Almanaque de pagos por farmacia: marca manual del admin para cada mes
-- (pago por fuera del sistema, o corrección de una boleta), con nota y quién lo marcó.
-- Si el mes tiene boleta, la boleta manda; la marca guarda el registro para auditoría.
CREATE TABLE IF NOT EXISTS public.pharmacy_month_marks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    period DATE NOT NULL, -- primer día del mes (ej. 2026-09-01)
    paid BOOLEAN NOT NULL,
    note TEXT,
    marked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    marked_by_name TEXT,
    marked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT pharmacy_month_marks_unique UNIQUE (pharmacy_id, period)
);
CREATE INDEX IF NOT EXISTS idx_pharmacy_month_marks_pharmacy ON public.pharmacy_month_marks(pharmacy_id);
ALTER TABLE public.pharmacy_month_marks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage month marks" ON public.pharmacy_month_marks;
CREATE POLICY "Admins manage month marks" ON public.pharmacy_month_marks
    FOR ALL USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
DROP POLICY IF EXISTS "Members view their month marks" ON public.pharmacy_month_marks;
CREATE POLICY "Members view their month marks" ON public.pharmacy_month_marks
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.pharmacy_members pm
        WHERE pm.pharmacy_id = pharmacy_month_marks.pharmacy_id AND pm.user_id = (SELECT auth.uid())
    ));

-- 15. Migration: Permitir decimales en horas semanales (ej. 22.5 hs para media jornada CCT 659/13).
ALTER TABLE public.employees ALTER COLUMN weekly_hours TYPE NUMERIC;

-- ----------------------------------------------------
-- MULTI-PHARMACY MEMBERSHIP (un usuario puede gestionar varias farmacias,
-- ej. estudios contables que llevan varias farmacias con un solo login)
-- ----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.pharmacy_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT DEFAULT 'owner' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (pharmacy_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_members_user_id ON public.pharmacy_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_members_pharmacy_id ON public.pharmacy_members(pharmacy_id);

ALTER TABLE public.pharmacy_members ENABLE ROW LEVEL SECURITY;

-- Backfill: cada owner_id actual pasa a ser miembro 'owner' de su farmacia
INSERT INTO public.pharmacy_members (pharmacy_id, user_id, role)
SELECT id, owner_id, 'owner' FROM public.pharmacies
WHERE owner_id IS NOT NULL
ON CONFLICT (pharmacy_id, user_id) DO NOTHING;

-- Policies for pharmacy_members
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.pharmacy_members;
-- OJO: no agregar aca un EXISTS que vuelva a consultar pharmacy_members
-- (ej. para ver "otros miembros de mi farmacia") - Postgres lo detecta
-- como "infinite recursion detected in policy for relation
-- pharmacy_members" y rompe la carga de "Mis Farmacias" para todos.
CREATE POLICY "Users can view their own memberships" ON public.pharmacy_members
    FOR SELECT USING (auth.uid() = user_id);

-- Un usuario solo puede auto-vincularse a una farmacia sin dueño (o donde ya
-- figura como owner_id), nunca a una que ya pertenece a otro usuario.
-- Vincular a una farmacia ya reclamada por otro requiere que un admin lo haga.
DROP POLICY IF EXISTS "Users can add themselves to a pharmacy" ON public.pharmacy_members;
DROP POLICY IF EXISTS "Users can claim an unclaimed pharmacy" ON public.pharmacy_members;
CREATE POLICY "Users can claim an unclaimed pharmacy" ON public.pharmacy_members
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.pharmacies p
            WHERE p.id = pharmacy_members.pharmacy_id
            AND (p.owner_id IS NULL OR p.owner_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can remove their own membership" ON public.pharmacy_members;
CREATE POLICY "Users can remove their own membership" ON public.pharmacy_members
    FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can do everything on pharmacy_members" ON public.pharmacy_members;
CREATE POLICY "Admins can do everything on pharmacy_members" ON public.pharmacy_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Pharmacies UPDATE: allow claiming unowned rows, or updates by any member
DROP POLICY IF EXISTS "Owners can update their own pharmacy" ON public.pharmacies;
DROP POLICY IF EXISTS "Members can update their pharmacy" ON public.pharmacies;
CREATE POLICY "Members can update their pharmacy" ON public.pharmacies
    FOR UPDATE USING (
        owner_id IS NULL
        OR auth.uid() = owner_id
        OR EXISTS (
            SELECT 1 FROM public.pharmacy_members pm
            WHERE pm.pharmacy_id = pharmacies.id AND pm.user_id = auth.uid()
        )
    )
    WITH CHECK (
        auth.uid() = owner_id
        OR EXISTS (
            SELECT 1 FROM public.pharmacy_members pm
            WHERE pm.pharmacy_id = pharmacies.id AND pm.user_id = auth.uid()
        )
    );

-- Employees: replace owner_id checks with membership checks
DROP POLICY IF EXISTS "Owners can see their own employees" ON public.employees;
DROP POLICY IF EXISTS "Members can see their pharmacy employees" ON public.employees;
CREATE POLICY "Members can see their pharmacy employees" ON public.employees
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.pharmacy_members pm
            WHERE pm.pharmacy_id = employees.pharmacy_id AND pm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Owners can manage their own employees" ON public.employees;
DROP POLICY IF EXISTS "Members can manage their pharmacy employees" ON public.employees;
CREATE POLICY "Members can manage their pharmacy employees" ON public.employees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.pharmacy_members pm
            WHERE pm.pharmacy_id = employees.pharmacy_id AND pm.user_id = auth.uid()
        )
    );

-- Payments: replace owner_id checks with membership checks
DROP POLICY IF EXISTS "Owners can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Members can view their pharmacy payments" ON public.payments;
CREATE POLICY "Members can view their pharmacy payments" ON public.payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.pharmacy_members pm
            WHERE pm.pharmacy_id = payments.pharmacy_id AND pm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Owners can manage own payments" ON public.payments;
DROP POLICY IF EXISTS "Members can manage their pharmacy payments" ON public.payments;
CREATE POLICY "Members can manage their pharmacy payments" ON public.payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.pharmacy_members pm
            WHERE pm.pharmacy_id = payments.pharmacy_id AND pm.user_id = auth.uid()
        )
    );


-- ----------------------------------------------------
-- EXCEPCION MANUAL DE DEUDA + PERIODO DE GRACIA
--
-- Nota: `has_debt` ya se mantenia sincronizado por un trigger en
-- `payments` (trg_recompute_pharmacy_debt) mas un job diario de pg_cron
-- (recompute_all_pharmacy_debt, corre a las 6am) armados antes de este
-- archivo, por eso no estan documentados mas arriba. Este bloque solo
-- actualiza esas dos funciones para sumar:
--   1) una excepcion manual que el admin puede activar por farmacia
--      (para las que ya pagaron por fuera del sistema durante la
--      transicion), que se auto-vence sola a fin del mes en curso;
--   2) un margen de 7 dias de gracia antes de que una DDJJ recien
--      presentada y ya vencida cuente como "deuda" de verdad.
-- ----------------------------------------------------

ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS debt_override_until DATE;

CREATE OR REPLACE FUNCTION public.recompute_pharmacy_debt(p_pharmacy_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.pharmacies p
  SET has_debt = (
    CASE
      WHEN p.debt_override_until IS NOT NULL AND p.debt_override_until >= CURRENT_DATE THEN false
      WHEN NOT EXISTS (SELECT 1 FROM public.payments pay WHERE pay.pharmacy_id = p_pharmacy_id) THEN true
      WHEN EXISTS (
        SELECT 1 FROM public.payments pay
        WHERE pay.pharmacy_id = p_pharmacy_id
          AND pay.status IN ('impago', 'unpaid')
          AND pay.due_date < (CURRENT_DATE - INTERVAL '7 days')
      ) THEN true
      ELSE false
    END
  )
  WHERE p.id = p_pharmacy_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recompute_all_pharmacy_debt()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  UPDATE public.pharmacies p
  SET has_debt = sub.should_have_debt
  FROM (
    SELECT ph.id,
      CASE
        WHEN ph.debt_override_until IS NOT NULL AND ph.debt_override_until >= CURRENT_DATE THEN false
        WHEN NOT EXISTS (SELECT 1 FROM public.payments pay WHERE pay.pharmacy_id = ph.id) THEN true
        WHEN EXISTS (
          SELECT 1 FROM public.payments pay
          WHERE pay.pharmacy_id = ph.id AND pay.status IN ('impago', 'unpaid') AND pay.due_date < (CURRENT_DATE - INTERVAL '7 days')
        ) THEN true
        ELSE false
      END AS should_have_debt
    FROM public.pharmacies ph
    WHERE ph.registered = true
  ) sub
  WHERE p.id = sub.id AND p.has_debt IS DISTINCT FROM sub.should_have_debt;
$function$;

-- RPC para que un admin marque/desmarque la excepcion desde el panel.
-- Pone la fecha limite al ultimo dia del mes en curso automaticamente.
CREATE OR REPLACE FUNCTION public.set_pharmacy_debt_override(p_pharmacy_id uuid, p_clear boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo un administrador puede marcar esta excepcion.';
  END IF;

  UPDATE public.pharmacies
  SET debt_override_until = CASE
    WHEN p_clear THEN NULL
    ELSE (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::date
  END
  WHERE id = p_pharmacy_id;

  PERFORM public.recompute_pharmacy_debt(p_pharmacy_id);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.set_pharmacy_debt_override(uuid, boolean) TO authenticated;

-- ----------------------------------------------------
-- SALARY SCALES DOCS: vincular cada PDF con su acuerdo y guardar el
-- texto de firma (representantes/fecha), para que la grilla publica
-- de /escalas se arme sola a partir de la ultima paritaria cargada.
-- ----------------------------------------------------
ALTER TABLE public.salary_scales_docs ADD COLUMN IF NOT EXISTS signing_note TEXT;
ALTER TABLE public.salary_scales_docs ADD COLUMN IF NOT EXISTS agreement TEXT;


-- ============================================================================
-- CONTROL DE PAGOS (2026-11-18)
--
-- 1) Guarda quién aprobó cada pago y cuándo (approved_at / approved_by /
--    approved_by_name). Lo completa un trigger, así funciona igual sin importar
--    desde qué pantalla se apruebe (Vista General, Declaraciones, Almanaque) o
--    si lo confirma el banco (Plus Pagos, que corre con la service role).
-- 2) Blindaje: una farmacia NO puede marcar su propia boleta como "pagado"
--    (salvo boletas en $0, que nacen pagadas). Solo ATFAR o el banco.
--
-- Es idempotente: se puede correr más de una vez sin romper nada.
-- ============================================================================

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS approved_by_name TEXT;

CREATE OR REPLACE FUNCTION public.payments_track_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
  v_name text;
BEGIN
  IF NEW.status = 'pagado' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'pagado') THEN
    IF v_uid IS NOT NULL THEN
      SELECT (role = 'admin'), full_name INTO v_is_admin, v_name
      FROM public.profiles WHERE id = v_uid;
      v_is_admin := COALESCE(v_is_admin, false);

      -- Una farmacia no puede darse por pagada a sí misma (boletas en $0 sí).
      IF NOT v_is_admin AND COALESCE(NEW.amount, 0) > 0 THEN
        RAISE EXCEPTION 'Solo ATFAR puede marcar una boleta como pagada.'
          USING ERRCODE = '42501';
      END IF;
    END IF;

    NEW.approved_at := now();
    NEW.approved_by := v_uid;
    NEW.approved_by_name := CASE
      WHEN v_uid IS NULL AND NEW.payment_provider = 'plus_pagos' THEN 'Banco Santa Fe (pago online)'
      WHEN v_uid IS NULL THEN 'Sistema'
      WHEN NOT v_is_admin THEN 'Automático (boleta en $0)'
      ELSE COALESCE(NULLIF(v_name, ''), 'ATFAR')
    END;
  ELSIF NEW.status IS DISTINCT FROM 'pagado' AND TG_OP = 'UPDATE' AND OLD.status = 'pagado' THEN
    -- Si se desmarca el pago, se borra la aprobación.
    NEW.approved_at := NULL;
    NEW.approved_by := NULL;
    NEW.approved_by_name := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payments_track_approval ON public.payments;
CREATE TRIGGER trg_payments_track_approval
  BEFORE INSERT OR UPDATE OF status ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.payments_track_approval();


-- ============================================================================
-- REGLA ÚNICA DE DEUDA (2026-11-20)
--
-- Una farmacia tiene deuda si tiene al menos un mes adeudado:
--   1) Boleta impaga cuyo vencimiento ya pasó (sin días extra de gracia).
--   2) Mes marcado por ATFAR en el almanaque como "Debe" (sin boleta).
--   3) Mes SIN DDJJ presentada, posterior a la primera DDJJ de la farmacia,
--      cuyo plazo ya venció (día 20 del mes siguiente).
-- Los meses anteriores a la primera DDJJ no cuentan como deuda (hasta que
-- ATFAR los marque como "Debe" en el almanaque). Una farmacia sin ninguna
-- DDJJ no tiene deuda automática.
-- La excepción manual de ATFAR (debt_override_until) sigue funcionando.
--
-- Es la ÚNICA fuente de verdad: las pantallas ya no escriben has_debt a mano,
-- piden este cálculo. Es idempotente: se puede correr más de una vez.
-- ============================================================================

-- "Octubre 2026" -> 2026-10-01 (NULL si no se puede leer)
CREATE OR REPLACE FUNCTION public.period_label_to_month(p_label text)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_names text[] := ARRAY['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  v_month int;
  v_year int;
BEGIN
  v_month := array_position(v_names, lower(split_part(trim(coalesce(p_label, '')), ' ', 1)));
  BEGIN
    v_year := split_part(trim(coalesce(p_label, '')), ' ', 2)::int;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;
  IF v_month IS NULL OR v_year IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN make_date(v_year, v_month, 1);
END;
$$;

-- Meses adeudados de una farmacia (uso interno, sin control de permisos).
CREATE OR REPLACE FUNCTION public._pharmacy_debt_months(p_pharmacy_id uuid)
RETURNS TABLE(month date, reason text, due date)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH today AS (
    SELECT (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date AS d
  ),
  pays AS (
    SELECT public.period_label_to_month(period) AS m, status, due_date
    FROM public.payments
    WHERE pharmacy_id = p_pharmacy_id
  ),
  marks AS (
    SELECT date_trunc('month', period)::date AS m, paid
    FROM public.pharmacy_month_marks
    WHERE pharmacy_id = p_pharmacy_id
  ),
  first_ddjj AS (
    SELECT min(m) AS m FROM pays WHERE m IS NOT NULL
  )
  -- 1) Boletas impagas vencidas
  SELECT coalesce(p.m, date_trunc('month', p.due_date)::date), 'boleta_impaga', p.due_date
  FROM pays p, today t
  WHERE p.status IN ('impago', 'unpaid') AND p.due_date < t.d
  UNION ALL
  -- 2) Meses marcados "Debe" por ATFAR (sin boleta de ese mes)
  SELECT mk.m, 'marcado_debe', NULL::date
  FROM marks mk
  WHERE mk.paid = false AND NOT EXISTS (SELECT 1 FROM pays p WHERE p.m = mk.m)
  UNION ALL
  -- 3) Meses sin DDJJ después de la primera, con el plazo (día 20) vencido
  SELECT s.m::date, 'sin_ddjj', (s.m + interval '1 month' + interval '19 days')::date
  FROM first_ddjj f, today t,
       generate_series(f.m + interval '1 month', date_trunc('month', t.d) - interval '1 month', interval '1 month') AS s(m)
  WHERE f.m IS NOT NULL
    AND (s.m + interval '1 month' + interval '19 days')::date < t.d
    AND NOT EXISTS (SELECT 1 FROM pays p WHERE p.m = s.m::date)
    AND NOT EXISTS (SELECT 1 FROM marks mk WHERE mk.m = s.m::date);
$$;

-- Versión para las pantallas: solo ATFAR o los miembros de la farmacia.
CREATE OR REPLACE FUNCTION public.pharmacy_debt_months(p_pharmacy_id uuid)
RETURNS TABLE(month date, reason text, due date)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.is_admin()
     AND NOT EXISTS (
       SELECT 1 FROM public.pharmacy_members pm
       WHERE pm.pharmacy_id = p_pharmacy_id AND pm.user_id = auth.uid()
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.pharmacies ph
       WHERE ph.id = p_pharmacy_id AND ph.owner_id = auth.uid()
     )
  THEN
    RETURN;
  END IF;
  RETURN QUERY SELECT * FROM public._pharmacy_debt_months(p_pharmacy_id) ORDER BY 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.recompute_pharmacy_debt(p_pharmacy_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.pharmacies p
  SET has_debt = CASE
    WHEN p.debt_override_until IS NOT NULL
         AND p.debt_override_until >= (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date THEN false
    ELSE EXISTS (SELECT 1 FROM public._pharmacy_debt_months(p_pharmacy_id))
  END
  WHERE p.id = p_pharmacy_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.recompute_all_pharmacy_debt()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.pharmacies p
  SET has_debt = sub.should_have_debt
  FROM (
    SELECT ph.id,
      CASE
        WHEN ph.debt_override_until IS NOT NULL
             AND ph.debt_override_until >= (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date THEN false
        ELSE EXISTS (SELECT 1 FROM public._pharmacy_debt_months(ph.id))
      END AS should_have_debt
    FROM public.pharmacies ph
    WHERE ph.registered = true
  ) sub
  WHERE p.id = sub.id AND p.has_debt IS DISTINCT FROM sub.should_have_debt;
$$;

-- Recalcular también cuando ATFAR marca/desmarca un mes en el almanaque.
CREATE OR REPLACE FUNCTION public.trg_month_marks_recompute_debt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.recompute_pharmacy_debt(COALESCE(NEW.pharmacy_id, OLD.pharmacy_id));
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_month_marks_recompute_debt ON public.pharmacy_month_marks;
CREATE TRIGGER trg_month_marks_recompute_debt
  AFTER INSERT OR UPDATE OR DELETE ON public.pharmacy_month_marks
  FOR EACH ROW EXECUTE FUNCTION public.trg_month_marks_recompute_debt();

REVOKE ALL ON FUNCTION public._pharmacy_debt_months(uuid) FROM PUBLIC, anon, authenticated;
-- Las funciones nacen abiertas a todos (PUBLIC): solo usuarios logueados.
REVOKE ALL ON FUNCTION public.pharmacy_debt_months(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.recompute_pharmacy_debt(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pharmacy_debt_months(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_pharmacy_debt(uuid) TO authenticated;

-- Las pantallas ponían una "excepción" automática hasta el 31/12 que tapaba
-- deudas nuevas. Las excepciones manuales de ATFAR vencen a fin de mes, así
-- que las del 31/12 son todas automáticas: se limpian.
UPDATE public.pharmacies SET debt_override_until = NULL WHERE debt_override_until = '2026-12-31';

-- Recalcular todas las farmacias con la regla nueva.
SELECT public.recompute_all_pharmacy_debt();
