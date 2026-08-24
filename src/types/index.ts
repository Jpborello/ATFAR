export type UserRole = 'admin' | 'pharmacy_owner' | 'employee';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole | null;
  full_name: string | null;
  phone?: string | null;
  seen_tutorial?: boolean;
  created_at?: string;
}

export interface Pharmacy {
  id: string;
  name?: string;
  nombre_fantasia?: string;
  razon_social?: string;
  cuit?: string;
  address?: string;
  declared_addresses?: string;
  latitude?: number | null;
  longitude?: number | null;
  whatsapp?: string | null;
  phone_alt?: string | null;
  registered?: boolean;
  owner_id?: string | null;
  has_debt?: boolean;
  debt_override_until?: string | null;
  resp_name?: string | null;
  resp_email?: string | null;
  resp_phone?: string | null;
  resp_alt_email?: string | null;
  hr_name?: string | null;
  hr_role?: string | null;
  hr_email?: string | null;
  hr_phone?: string | null;
  hr_alt_email?: string | null;
  created_at?: string;
}

export interface Employee {
  id: string;
  pharmacy_id?: string;
  full_name: string;
  fullName?: string;
  cuil: string;
  category: string;
  entry_date: string;
  entryDate?: string;
  weekly_hours?: number;
  active: boolean;
  is_affiliate: boolean;
  isAffiliate?: boolean;
  receipt_url?: string;
  receiptUrl?: string;
  receipt_date?: string;
  receiptDate?: string;
  created_at?: string;
}

export interface Payment {
  id: string;
  pharmacy_id: string;
  invoice_number?: string;
  period: string;
  amount: number;
  status: 'pagado' | 'impago' | 'en_revision';
  due_date?: string;
  pay_date?: string;
  transaction_code?: string;
  receipt_url?: string | null;
  payment_provider?: 'transfer' | 'plus_pagos' | null;
  external_reference?: string | null;
  checkout_url?: string | null;
  created_at?: string;
}

export interface BenefitRequestChild {
  fullName: string;
  age: string;
  schoolLevel: string;
}

export interface BenefitRequestMetadata {
  affiliate_name?: string;
  affiliate_cuil?: string;
  affiliate_email?: string;
  affiliate_phone?: string;
  children?: BenefitRequestChild[];
}

export interface BenefitRequest {
  id: string;
  employee_id?: string;
  benefit_type: string;
  status: 'pending' | 'approved' | 'rejected';
  attachment_url?: string;
  metadata?: BenefitRequestMetadata;
  created_at?: string;
}

export interface JobApplication {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  position: string;
  message?: string;
  cv_url: string;
  created_at?: string;
}

export interface SalaryScale {
  id: string;
  category: string;
  base_salary?: number;
  basic?: number;
  non_remunerative?: number;
  no_rem?: number;
  is_additional?: boolean;
  period?: string;
  effective_date?: string;
  created_at?: string;
}

export interface Announcement {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: 'Gremiales' | 'Beneficios' | 'Capacitación' | 'Institucional';
  visibility: 'public' | 'pharmacy';
  image_url?: string;
  created_at?: string;
}
