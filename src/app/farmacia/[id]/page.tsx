/* eslint-disable @next/next/no-img-element */
'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  Users, 
  FileText, 
  CreditCard, 
  LogOut, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  MapPin,
  Plus,
  Loader2,
  Briefcase,
  Clock,
  Info,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { getPharmacyDebtStatus, PharmacyDebtStatus, PHARMACIST_CATEGORY } from '@/lib/dateUtils';
import { getLatestPeriod } from '@/lib/constants/calendar';
import { confirmDialog } from '@/components/shared/ConfirmDialog';
import SupportContact from '@/components/shared/SupportContact';
import { Employee } from '@/types';
import ProfileModal, { PharmacyProfileData } from '@/components/farmacia/ProfileModal';
import AddEmployeeModal from '@/components/farmacia/AddEmployeeModal';
import EditEmployeeModal from '@/components/farmacia/EditEmployeeModal';
import UpdateReceiptModal from '@/components/farmacia/UpdateReceiptModal';
import TutorialGuideModal from '@/components/farmacia/TutorialGuideModal';
import EmployeeTable from '@/components/farmacia/EmployeeTable';

export default function FarmaciaDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id: pharmacyId } = use(params);
  const [loading, setLoading] = useState(true);
  const [hasMultiplePharmacies, setHasMultiplePharmacies] = useState(false);
  const [pharmacyName, setPharmacyName] = useState('...');
  const [pharmacyCuit, setPharmacyCuit] = useState('...');
  const [pharmacyAddress, setPharmacyAddress] = useState('...');
  const [debtStatus, setDebtStatus] = useState<{ status: PharmacyDebtStatus; label: string }>({ status: 'al_dia', label: 'Al Día' });
  const [lastDeclaredPeriod, setLastDeclaredPeriod] = useState<string | null>(null);
  
  // Tutorial states
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Modals state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<'empresa' | 'contactos'>('empresa');

  // Receipt Upload States
  const [newEmpReceiptFile, setNewEmpReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [selectedEmpForReceipt, setSelectedEmpForReceipt] = useState<Employee | null>(null);
  const [isUpdateReceiptModalOpen, setIsUpdateReceiptModalOpen] = useState(false);
  const [updateReceiptFile, setUpdateReceiptFile] = useState<File | null>(null);

  // Detailed profile state
  const [profileData, setProfileData] = useState<PharmacyProfileData>({
    cuit: '',
    razonSocial: '',
    nombreFantasia: '',
    whatsapp: '',
    actividadEconomica: '',
    initialPeriod: '',
    declaredEmployeeCount: 0,
    branches: '',
    notes: '',
    declaredAddresses: '',
    respEmail: '',
    respPhone: '',
    respAltEmail: '',
    hrEmail: '',
    hrPhone: '',
    hrAltEmail: '',
    hrName: '',
    hrRole: ''
  });

  // Employee Add form state
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpCuil, setNewEmpCuil] = useState('');
  const [newEmpCategory, setNewEmpCategory] = useState('Personal en Gestión de Farmacia');
  const [newEmpEntryDate, setNewEmpEntryDate] = useState('');
  const [newEmpWeeklyHours, setNewEmpWeeklyHours] = useState(45);
  // Por defecto todo empleado es afiliado (paga el 2%); la farmacia tiene que
  // marcar a propósito "NO es afiliado" para que quede exento.
  const [newEmpIsAffiliate, setNewEmpIsAffiliate] = useState(true);
  const [newEmpSalaryType, setNewEmpSalaryType] = useState<'automatico' | 'manual'>('automatico');
  const [newEmpCustomSalary, setNewEmpCustomSalary] = useState('');
  const [newEmpCustomNoRem, setNewEmpCustomNoRem] = useState('0');
  const [newEmpPharmacistLicense, setNewEmpPharmacistLicense] = useState('');

  // Employee Edit form state
  const [isEditEmployeeModalOpen, setIsEditEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editEmpName, setEditEmpName] = useState('');
  const [editEmpCuil, setEditEmpCuil] = useState('');
  const [editEmpCategory, setEditEmpCategory] = useState('Personal en Gestión de Farmacia');
  const [editEmpEntryDate, setEditEmpEntryDate] = useState('');
  const [editEmpWeeklyHours, setEditEmpWeeklyHours] = useState(45);
  const [editEmpIsAffiliate, setEditEmpIsAffiliate] = useState(false);
  const [editEmpSalaryType, setEditEmpSalaryType] = useState<'automatico' | 'manual'>('automatico');
  const [editEmpCustomSalary, setEditEmpCustomSalary] = useState('');
  const [editEmpCustomNoRem, setEditEmpCustomNoRem] = useState('0');
  const [editEmpPharmacistLicense, setEditEmpPharmacistLicense] = useState('');
  const [editEmpOnJobReserve, setEditEmpOnJobReserve] = useState(false);
  const [editEmpJobReserveSince, setEditEmpJobReserveSince] = useState('');
  const [savingEditEmployee, setSavingEditEmployee] = useState(false);

  const [employees, setEmployees] = useState<Employee[]>([]);

  const [announcements, setAnnouncements] = useState<{ id: string; title: string; summary: string; date: string }[]>([
    { id: '1', title: 'Nueva Homologación CCT 659/13', summary: 'Se informa a las farmacias la escala de Julio 2026 vigente para liquidaciones.', date: '25 Jun 2026' }
  ]);

  useEffect(() => {
    const fetchPharmacy = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          window.location.href = '/login';
          return;
        }

        setUserId(session.user.id);

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, seen_tutorial')
          .eq('id', session.user.id)
          .single();

        if (profile?.role !== 'pharmacy_owner' && profile?.role !== 'admin') {
          window.location.href = '/login';
          return;
        }

        if (profile?.role === 'pharmacy_owner' && !profile?.seen_tutorial) {
          setShowTutorial(true);
        }

        const { data: pharmacy } = await supabase
          .from('pharmacies')
          .select('*')
          .eq('id', pharmacyId)
          .maybeSingle();

        // Cuántas farmacias gestiona este usuario (para mostrar u ocultar el link "Mis Farmacias")
        const { count: membershipCount } = await supabase
          .from('pharmacy_members')
          .select('pharmacy_id', { count: 'exact', head: true })
          .eq('user_id', session.user.id);
        setHasMultiplePharmacies((membershipCount || 0) > 1);

        if (!pharmacy) {
          toast.error('No tenés acceso a esta farmacia.', {
            description: 'Puede que ya no exista o que no esté vinculada a tu cuenta.',
          });
          window.location.href = '/farmacia';
          return;
        }

        if (pharmacy) {
          // El estado de deuda (has_debt) ya lo calcula la base (trigger +
          // job diario, con margen de gracia y excepción manual del admin).
          // Acá solo lo leemos y buscamos los pagos para poder distinguir
          // "Al Día" de "En Proceso" (gracia/excepción) en el badge.
          try {
            const { data: payments } = await supabase
              .from('payments')
              .select('status, due_date, period')
              .eq('pharmacy_id', pharmacy.id);

            setDebtStatus(getPharmacyDebtStatus(pharmacy, payments || []));
            setLastDeclaredPeriod(getLatestPeriod((payments || []).map((p) => p.period)));
          } catch (syncErr) {
            console.error("Error calculando estado de deuda:", syncErr);
            setDebtStatus(getPharmacyDebtStatus(pharmacy, []));
          }

          setPharmacyName(pharmacy.nombre_fantasia || pharmacy.name || pharmacy.razon_social);
          setPharmacyCuit(pharmacy.cuit);
          setPharmacyAddress(pharmacy.declared_addresses || pharmacy.address);

          setProfileData({
            cuit: pharmacy.cuit || '',
            razonSocial: pharmacy.razon_social || pharmacy.name || '',
            nombreFantasia: pharmacy.nombre_fantasia || pharmacy.name || '',
            whatsapp: pharmacy.whatsapp || '',
            actividadEconomica: pharmacy.actividad_economica || '',
            initialPeriod: pharmacy.initial_period || '',
            declaredEmployeeCount: pharmacy.declared_employee_count || 0,
            branches: pharmacy.branches || '',
            notes: pharmacy.notes || '',
            declaredAddresses: pharmacy.declared_addresses || pharmacy.address || '',
            respEmail: pharmacy.resp_email || '',
            respPhone: pharmacy.resp_phone || '',
            respAltEmail: pharmacy.resp_alt_email || '',
            hrEmail: pharmacy.hr_email || '',
            hrPhone: pharmacy.hr_phone || '',
            hrAltEmail: pharmacy.hr_alt_email || '',
            hrName: pharmacy.hr_name || '',
            hrRole: pharmacy.hr_role || ''
          });

          // Fetch registered employees
          const { data: list } = await supabase
            .from('employees')
            .select('*')
            .eq('pharmacy_id', pharmacy.id);

          if (list) {
            setEmployees(list.map(emp => ({
              id: emp.id,
              fullName: emp.full_name,
              cuil: emp.cuil,
              category: emp.category,
              entryDate: emp.entry_date,
              weeklyHours: emp.weekly_hours !== null && emp.weekly_hours !== undefined ? Number(emp.weekly_hours) : 45,
              active: emp.active,
              isAffiliate: !!emp.is_affiliate,
              receiptUrl: emp.receipt_url,
              receiptDate: emp.receipt_date,
              customSalary: emp.custom_salary ? Number(emp.custom_salary) : null,
              customNoRem: emp.custom_no_rem !== null && emp.custom_no_rem !== undefined ? Number(emp.custom_no_rem) : null,
              pharmacistLicense: emp.pharmacist_license ?? null,
              jobReserveSince: emp.job_reserve_since ?? null
            })));
          } else {
            setEmployees([]);
          }

          // Fetch announcements
          const { data: annData } = await supabase
            .from('announcements')
            .select('*')
            .eq('visibility', 'pharmacy')
            .order('created_at', { ascending: false });

          if (annData && annData.length > 0) {
            setAnnouncements(annData.map(a => ({
              id: a.id,
              title: a.title,
              summary: a.summary,
              date: new Date(a.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
            })));
          }
        }
      } catch (err) {
        console.error('Error loading pharmacy dashboard:', err);
        toast.error('No pudimos cargar los datos de tu farmacia.', {
          description: 'Revisá tu conexión y volvé a intentarlo recargando la página.',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPharmacy();
  }, [pharmacyId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const handleProfileFieldChange = (field: keyof PharmacyProfileData, value: string | number) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const isConfigured = 
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
      !!process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (isConfigured) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { error } = await supabase
          .from('pharmacies')
          .update({
            name: profileData.nombreFantasia || profileData.razonSocial,
            cuit: profileData.cuit,
            address: profileData.declaredAddresses,
            initial_period: profileData.initialPeriod || null,
            razon_social: profileData.razonSocial,
            nombre_fantasia: profileData.nombreFantasia,
            whatsapp: profileData.whatsapp,
            actividad_economica: profileData.actividadEconomica,
            declared_employee_count: profileData.declaredEmployeeCount,
            branches: profileData.branches,
            notes: profileData.notes,
            declared_addresses: profileData.declaredAddresses,
            resp_email: profileData.respEmail,
            resp_phone: profileData.respPhone,
            resp_alt_email: profileData.respAltEmail,
            hr_email: profileData.hrEmail,
            hr_phone: profileData.hrPhone,
            hr_alt_email: profileData.hrAltEmail,
            hr_name: profileData.hrName,
            hr_role: profileData.hrRole,
          })
          .eq('id', pharmacyId);

        if (error) {
          toast.error('Error al guardar', { description: error.message });
          return;
        }
      }
    }

    setPharmacyName(profileData.nombreFantasia || profileData.razonSocial);
    setPharmacyCuit(profileData.cuit);
    setPharmacyAddress(profileData.declaredAddresses);
    setIsProfileModalOpen(false);
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName || !newEmpCuil || !newEmpEntryDate) {
      toast.warning('Completá todos los campos requeridos.');
      return;
    }
    const newPharmacistLicense = newEmpCategory === PHARMACIST_CATEGORY ? newEmpPharmacistLicense.trim() : '';
    if (newEmpCategory === PHARMACIST_CATEGORY && !newPharmacistLicense) {
      toast.warning('Para la categoría Farmacéutico ingresá el número de matrícula profesional.');
      return;
    }

    setUploadingReceipt(true);
    let uploadedReceiptUrl = '';
    const nowIso = new Date().toISOString();

    const isConfigured = 
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
      !!process.env.NEXT_PUBLIC_SUPABASE_URL;

    try {
      if (isConfigured && newEmpReceiptFile) {
        const ext = newEmpReceiptFile.name.split('.').pop();
        const filePath = `receipts/emp_${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('receipts')
          .upload(filePath, newEmpReceiptFile);

        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage
            .from('receipts')
            .getPublicUrl(filePath);
          uploadedReceiptUrl = publicUrl;
        }
      }

      const parsedCustomSalary = newEmpSalaryType === 'manual' && newEmpCustomSalary ? Number(newEmpCustomSalary) : null;
      const parsedCustomNoRem = newEmpSalaryType === 'manual' && newEmpCustomNoRem !== '' ? Number(newEmpCustomNoRem) : null;
      if (newEmpSalaryType === 'manual' && (!newEmpCustomSalary || Number(newEmpCustomSalary) <= 0)) {
        toast.warning('Ingresá un sueldo bruto válido para el cálculo manual.');
        setUploadingReceipt(false);
        return;
      }

      let newId = Math.random().toString();

      if (isConfigured && pharmacyId) {
        const { data, error } = await supabase
          .from('employees')
          .insert({
            pharmacy_id: pharmacyId,
            full_name: newEmpName,
            cuil: newEmpCuil,
            category: newEmpCategory,
            entry_date: newEmpEntryDate,
            weekly_hours: Number(newEmpWeeklyHours) || 45,
            active: true,
            is_affiliate: newEmpIsAffiliate,
            custom_salary: parsedCustomSalary,
            custom_no_rem: parsedCustomNoRem,
            pharmacist_license: newPharmacistLicense || null,
            receipt_url: uploadedReceiptUrl || null,
            receipt_date: uploadedReceiptUrl ? nowIso : null
          })
          .select()
          .single();

        if (error) {
          toast.error('Error al guardar empleado', { description: error.message });
          return;
        }
        if (data) {
          newId = data.id;
        }
      }

      setEmployees(prev => [
        ...prev,
        {
          id: newId,
          fullName: newEmpName,
          cuil: newEmpCuil,
          category: newEmpCategory,
          entryDate: newEmpEntryDate,
          weeklyHours: newEmpWeeklyHours,
          active: true,
          isAffiliate: newEmpIsAffiliate,
          receiptUrl: uploadedReceiptUrl || undefined,
          receiptDate: uploadedReceiptUrl ? nowIso : undefined,
          customSalary: parsedCustomSalary,
          customNoRem: parsedCustomNoRem,
          pharmacistLicense: newPharmacistLicense || null
        }
      ]);

      // reset fields
      setNewEmpName('');
      setNewEmpCuil('');
      setNewEmpCategory('Personal en Gestión de Farmacia');
      setNewEmpEntryDate('');
      setNewEmpWeeklyHours(45);
      setNewEmpIsAffiliate(true);
      setNewEmpSalaryType('automatico');
      setNewEmpCustomSalary('');
      setNewEmpCustomNoRem('0');
      setNewEmpPharmacistLicense('');
      setNewEmpReceiptFile(null);
      setIsEmployeeModalOpen(false);
    } catch (err: unknown) {
      console.error(err);
      toast.error('Ocurrió un error al procesar el recibo de sueldo.');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleOpenEditEmployee = (emp: Employee) => {
    const customSal = emp.customSalary ?? emp.custom_salary;
    const customNoR = emp.customNoRem ?? emp.custom_no_rem;
    const jobRes = emp.jobReserveSince ?? emp.job_reserve_since ?? '';
    setEditingEmployee(emp);
    setEditEmpName(emp.fullName || emp.full_name || '');
    setEditEmpCuil(emp.cuil);
    setEditEmpCategory(emp.category);
    setEditEmpEntryDate(emp.entryDate || emp.entry_date || '');
    setEditEmpWeeklyHours(emp.weeklyHours ?? emp.weekly_hours ?? 45);
    setEditEmpIsAffiliate(emp.isAffiliate ?? emp.is_affiliate ?? false);
    if (customSal && Number(customSal) > 0) {
      setEditEmpSalaryType('manual');
      setEditEmpCustomSalary(customSal.toString());
      setEditEmpCustomNoRem(customNoR !== null && customNoR !== undefined ? customNoR.toString() : '0');
    } else {
      setEditEmpSalaryType('automatico');
      setEditEmpCustomSalary('');
      setEditEmpCustomNoRem('0');
    }
    setEditEmpPharmacistLicense(emp.pharmacistLicense ?? emp.pharmacist_license ?? '');
    setEditEmpOnJobReserve(Boolean(jobRes));
    setEditEmpJobReserveSince(jobRes);
    setIsEditEmployeeModalOpen(true);
  };

  const handleSaveEditEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    const parsedCustomSalary = editEmpSalaryType === 'manual' && editEmpCustomSalary ? Number(editEmpCustomSalary) : null;
    const parsedCustomNoRem = editEmpSalaryType === 'manual' && editEmpCustomNoRem !== '' ? Number(editEmpCustomNoRem) : null;
    if (editEmpSalaryType === 'manual' && (!editEmpCustomSalary || Number(editEmpCustomSalary) <= 0)) {
      toast.warning('Ingresá un sueldo bruto válido para el cálculo manual.');
      return;
    }
    if (editEmpOnJobReserve && !editEmpJobReserveSince) {
      toast.warning('Indicá desde qué fecha está en reserva de puesto.');
      return;
    }
    const parsedJobReserveSince = editEmpOnJobReserve ? editEmpJobReserveSince : null;
    const parsedPharmacistLicense = editEmpCategory === PHARMACIST_CATEGORY ? editEmpPharmacistLicense.trim() : '';
    if (editEmpCategory === PHARMACIST_CATEGORY && !parsedPharmacistLicense) {
      toast.warning('Para la categoría Farmacéutico ingresá el número de matrícula profesional.');
      return;
    }

    setSavingEditEmployee(true);
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' &&
      !!process.env.NEXT_PUBLIC_SUPABASE_URL;

    try {
      if (isConfigured) {
        const { error } = await supabase
          .from('employees')
          .update({
            full_name: editEmpName,
            cuil: editEmpCuil,
            category: editEmpCategory,
            entry_date: editEmpEntryDate,
            weekly_hours: Number(editEmpWeeklyHours) || 45,
            is_affiliate: editEmpIsAffiliate,
            custom_salary: parsedCustomSalary,
            custom_no_rem: parsedCustomNoRem,
            job_reserve_since: parsedJobReserveSince,
            pharmacist_license: parsedPharmacistLicense || null
          })
          .eq('id', editingEmployee.id);

        if (error) {
          toast.error('Error al actualizar empleado', { description: error.message });
          return;
        }
      }

      setEmployees(prev => prev.map(emp => emp.id === editingEmployee.id ? {
        ...emp,
        fullName: editEmpName,
        cuil: editEmpCuil,
        category: editEmpCategory,
        entryDate: editEmpEntryDate,
        weeklyHours: editEmpWeeklyHours,
        isAffiliate: editEmpIsAffiliate,
        customSalary: parsedCustomSalary,
        customNoRem: parsedCustomNoRem,
        jobReserveSince: parsedJobReserveSince,
        pharmacistLicense: parsedPharmacistLicense || null
      } : emp));

      toast.success('Empleado y régimen de sueldo actualizados exitosamente.');
      setIsEditEmployeeModalOpen(false);
    } catch (err: unknown) {
      console.error(err);
      toast.error('Ocurrió un error al guardar los cambios.');
    } finally {
      setSavingEditEmployee(false);
    }
  };

  const handleUpdateSingleReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpForReceipt || !updateReceiptFile) {
      toast.warning('Seleccioná un archivo de recibo válido.');
      return;
    }

    setUploadingReceipt(true);
    const nowIso = new Date().toISOString();

    try {
      const isConfigured = 
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
        !!process.env.NEXT_PUBLIC_SUPABASE_URL;

      let publicUrl = '';
      if (isConfigured) {
        const ext = updateReceiptFile.name.split('.').pop();
        const filePath = `receipts/emp_${selectedEmpForReceipt.id}_${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('receipts')
          .upload(filePath, updateReceiptFile);

        if (uploadErr) throw uploadErr;

        const { data: pubData } = supabase.storage
          .from('receipts')
          .getPublicUrl(filePath);
        publicUrl = pubData.publicUrl;

        const { error: updateErr } = await supabase
          .from('employees')
          .update({
            receipt_url: publicUrl,
            receipt_date: nowIso
          })
          .eq('id', selectedEmpForReceipt.id);

        if (updateErr) throw updateErr;
      }

      setEmployees(prev => prev.map(emp => {
        if (emp.id === selectedEmpForReceipt.id) {
          return {
            ...emp,
            receiptUrl: publicUrl || emp.receiptUrl || 'simulated_receipt.pdf',
            receiptDate: nowIso
          };
        }
        return emp;
      }));

      toast.success('Recibo de sueldo actualizado exitosamente.');
      setIsUpdateReceiptModalOpen(false);
      setSelectedEmpForReceipt(null);
      setUpdateReceiptFile(null);
    } catch (err: unknown) {
      console.error(err);
      toast.error('Ocurrió un error al subir el recibo de sueldo.');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    const confirmed = await confirmDialog({
      title: 'Dar de baja empleado',
      message: '¿Seguro que deseas dar de baja a este empleado de la nómina activa? (Las declaraciones juradas presentadas en períodos anteriores se conservan intactas en tu historial).',
      confirmLabel: 'Confirmar Baja',
      danger: true,
    });
    if (confirmed) {
      const isConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' &&
        !!process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (isConfigured) {
        const { error } = await supabase
          .from('employees')
          .delete()
          .eq('id', id);

        if (error) {
          toast.error('Error al eliminar empleado', { description: error.message });
          return;
        }
      }
      setEmployees(prev => prev.filter(e => e.id !== id));
      toast.success('Empleado eliminado.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cargando Portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-[#1e293b] font-sans">
      {/* Top Header */}
      <header className="bg-card border-b border-border/80 py-4 px-6 flex items-center justify-between shadow-premium">
        <div className="flex items-center gap-3">
          <img src="/images/logo.jpg" alt="Logo" className="h-9 w-auto object-contain bg-white p-0.5 rounded border border-border" />
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-primary block leading-none">ATFAR</span>
            <span className="text-[9px] text-muted-foreground block font-bold">Portal de Farmacias</span>
          </div>
        </div>

        {hasMultiplePharmacies && (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-primary text-xs font-bold max-w-xs truncate">
            <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">Estás gestionando: {pharmacyName}</span>
          </span>
        )}

        <div className="flex items-center gap-3">
          <SupportContact />
          <Link
            href="/farmacia?manage=1"
            title="Ver todas tus farmacias o vincular una nueva"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer bg-white"
          >
            <Building2 className="w-4 h-4 text-primary" />
            <span>Mis Farmacias</span>
          </Link>
          <button
          onClick={handleLogout}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border text-red-500 hover:bg-red-50/50 text-xs font-bold transition-all cursor-pointer bg-white"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* Main container */}
      <main className="flex-grow max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        
        {/* Pharmacy Details card */}
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-primary/5 text-primary border border-primary/10 rounded-2xl">
              <Building2 className="w-8 h-8 text-secondary" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-black text-[#0f172a]">{pharmacyName}</h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-slate-500">
                <span>CUIT: {pharmacyCuit}</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-secondary" />
                  {pharmacyAddress}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/farmacia?manage=1"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-secondary/30 bg-secondary/10 text-secondary hover:bg-secondary/20 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
            >
              <Building2 className="w-4 h-4" />
              <span>Mis Farmacias</span>
            </Link>
            <Link
              href="/farmacia/postulantes"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-slate-800 hover:bg-slate-50 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer bg-white shadow-sm"
            >
              <Briefcase className="w-4 h-4 text-primary" />
              <span>Bolsa de Empleo</span>
            </Link>
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-slate-800 hover:bg-slate-50 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer bg-white shadow-sm"
            >
              <Building2 className="w-4 h-4 text-primary" />
              <span>Editar Perfil</span>
            </button>
            {debtStatus.status === 'con_deuda' ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-red-500/10 text-red-600 text-xs font-bold shadow-sm animate-pulse">
                <AlertTriangle className="w-4 h-4" />
                <span>Con Deuda</span>
              </span>
            ) : debtStatus.status === 'en_proceso' ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-amber-500/10 text-amber-600 text-xs font-bold shadow-sm">
                <Clock className="w-4 h-4" />
                <span>En Proceso</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold shadow-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Al Día</span>
              </span>
            )}
          </div>
        </div>

        {/* Shortcut panel cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* DDJJ link */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-premium hover:shadow-premium-lg transition-all space-y-4 flex flex-col justify-between glass">
            <div className="space-y-3">
              <div className="p-3 bg-primary/5 text-primary rounded-xl inline-block border border-primary/10">
                <FileText className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="font-bold text-lg text-[#0f172a]">Declaraciones Juradas</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Presentá la planilla mensual obligatoria informando la nómina del CCT correspondiente a tu local.
              </p>
            </div>
            <div className="pt-4">
              <Link
                href={`/farmacia/${pharmacyId}/declaraciones`}
                className="w-full inline-flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:bg-primary/95 transition-all shadow-premium"
              >
                <span>Nueva DDJJ</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Payments link */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-premium hover:shadow-premium-lg transition-all space-y-4 flex flex-col justify-between glass">
            <div className="space-y-3">
              <div className="p-3 bg-primary/5 text-primary rounded-xl inline-block border border-primary/10">
                <CreditCard className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="font-bold text-lg text-[#0f172a]">Pagos de Aportes</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Consultá tu estado de cuenta corriente, descargá recibos y pagá aportes vencidos con Mercado Pago.
              </p>
            </div>
            <div className="pt-4">
              <Link
                href={`/farmacia/${pharmacyId}/pagos`}
                className="w-full inline-flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:bg-primary/95 transition-all shadow-premium"
              >
                <span>Ver Cuentas y Pagar</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Summary metrics card */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-premium glass space-y-4">
            <h3 className="font-bold text-[#0f172a] text-sm border-b border-border pb-2">Estado del Período</h3>
            
            <div className="space-y-3 text-xs font-bold text-slate-500">
              <div className="flex justify-between">
                <span>Último Período Declarado:</span>
                <span className="text-[#0f172a]">{lastDeclaredPeriod || 'Ninguno todavía'}</span>
              </div>
              <div className="flex justify-between">
                <span>Personal en Nómina:</span>
                <span className="text-[#0f172a]">{employees.length} empleados</span>
              </div>
              <div className="flex justify-between">
                <span>Estado de Pago Aportes:</span>
                {debtStatus.status === 'con_deuda' ? (
                  <span className="text-red-600 font-bold bg-red-500/10 px-2.5 py-0.5 rounded">Con Deuda</span>
                ) : debtStatus.status === 'en_proceso' ? (
                  <span className="text-amber-600 font-bold bg-amber-500/10 px-2.5 py-0.5 rounded">En Proceso</span>
                ) : (
                  <span className="text-emerald-600 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded">Al Día</span>
                )}
              </div>
            </div>
            <div className="pt-3 border-t border-border/80">
              <Link
                href="/farmacia/acuerdos/acta-mayo-2026"
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-700 transition-all shadow-sm"
              >
                <FileText className="w-4 h-4 text-secondary" />
                <span>Acta Acuerdo Mayo 2026</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Main Grid split for Staff and Announcements */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Staff Table Summary */}
          <div className="lg:col-span-8 bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="font-bold text-[#0f172a] text-md flex items-center gap-2">
                <Users className="w-5 h-5 text-secondary" />
                Nómina de Empleados Declarada
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsEmployeeModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:bg-primary/95 transition-all shadow-premium cursor-pointer"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  <span>Agregar Empleado</span>
                </button>
              </div>
            </div>

            {/* Avisos explicativos para contadores / farmacias */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
              <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-amber-950 text-xs shadow-2xs">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1 leading-relaxed">
                  <p className="font-bold">
                    <span className="text-amber-800 uppercase tracking-wider text-[10px] font-black mr-1">Régimen Salarial:</span>
                    Cálculo automático con escala CCT 659/13 y antigüedad acumulada.
                  </p>
                  <p className="text-[11px] text-amber-900/80 font-medium">
                    Para situaciones extraordinarias (jornada reducida, adicionales pactados), hacé clic en el botón <strong className="text-amber-950">Editar (✏️)</strong> para fijar su sueldo bruto manual pactado. Si el empleado está con <strong className="text-amber-950">reserva de puesto</strong> o licencia sin goce de haberes, marcalo desde allí: queda en nómina con aporte $0.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/25 rounded-2xl text-blue-950 text-xs shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1.5 leading-relaxed">
                  <p className="font-bold">
                    <span className="text-blue-800 uppercase tracking-wider text-[10px] font-black mr-1">Criterio de Cuota Sindical (2%):</span>
                  </p>
                  <div className="space-y-1 text-[11px] text-blue-900/90 font-medium">
                    <p>
                      <strong className="text-emerald-800 font-bold">✓ Afiliado (Sí):</strong> Retención del <strong>2%</strong> sobre todo haber percibido (Remunerativo + No Remunerativo, Art. 50 inc. a CCT 659/13).
                    </p>
                    <p>
                      <strong className="text-amber-800 font-bold">✗ No Afiliado (No):</strong> Retención <strong>$0</strong> en remunerativo. Devenga el <strong>2% exclusivamente sobre sumas No Remunerativas</strong> (Cláusula 5ª Acta Acuerdo Paritario).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <EmployeeTable
              employees={employees}
              onEdit={handleOpenEditEmployee}
              onOpenReceiptModal={(emp) => {
                setSelectedEmpForReceipt(emp);
                setIsUpdateReceiptModalOpen(true);
              }}
              onDelete={handleDeleteEmployee}
            />
          </div>

          {/* Announcements Card (Pharmacy Exclusives) */}
          <div className="lg:col-span-4 bg-card border border-border rounded-3xl p-6 shadow-premium glass space-y-6">
            <div className="border-b border-border pb-4">
              <h3 className="font-bold text-[#0f172a] text-md flex items-center gap-2">
                <FileText className="w-5 h-5 text-secondary" />
                Circulares y Acuerdos
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1 block">Exclusivo para Farmacias</p>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
              {announcements.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground font-semibold">
                  No hay comunicados gremiales en este momento.
                </div>
              ) : (
                announcements.map((ann) => (
                  <div key={ann.id} className="p-3.5 border border-border rounded-2xl bg-slate-50/50 hover:bg-slate-100/50 transition-colors space-y-1.5">
                    <span className="text-[9px] bg-secondary/15 text-secondary font-black px-2 py-0.5 rounded uppercase tracking-wider block w-max">
                      {ann.date}
                    </span>
                    <h4 className="font-bold text-xs text-[#0f172a] leading-snug">{ann.title}</h4>
                    <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">{ann.summary}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </main>

      {/* Edit Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profileData={profileData}
        onFieldChange={handleProfileFieldChange}
        onSave={handleSaveProfile}
        profileTab={profileTab}
        setProfileTab={setProfileTab}
      />

      {/* Add Employee Modal */}
      <AddEmployeeModal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        name={newEmpName}
        setName={setNewEmpName}
        cuil={newEmpCuil}
        setCuil={setNewEmpCuil}
        entryDate={newEmpEntryDate}
        setEntryDate={setNewEmpEntryDate}
        category={newEmpCategory}
        setCategory={setNewEmpCategory}
        pharmacistLicense={newEmpPharmacistLicense}
        setPharmacistLicense={setNewEmpPharmacistLicense}
        isAffiliate={newEmpIsAffiliate}
        setIsAffiliate={setNewEmpIsAffiliate}
        weeklyHours={newEmpWeeklyHours}
        setWeeklyHours={setNewEmpWeeklyHours}
        salaryType={newEmpSalaryType}
        setSalaryType={setNewEmpSalaryType}
        customSalary={newEmpCustomSalary}
        setCustomSalary={setNewEmpCustomSalary}
        customNoRem={newEmpCustomNoRem}
        setCustomNoRem={setNewEmpCustomNoRem}
        onReceiptFileChange={setNewEmpReceiptFile}
        onSubmit={handleAddEmployee}
        uploadingReceipt={uploadingReceipt}
      />
      {/* Edit Employee Modal */}
      <EditEmployeeModal
        isOpen={isEditEmployeeModalOpen && !!editingEmployee}
        onClose={() => setIsEditEmployeeModalOpen(false)}
        name={editEmpName}
        setName={setEditEmpName}
        cuil={editEmpCuil}
        setCuil={setEditEmpCuil}
        entryDate={editEmpEntryDate}
        setEntryDate={setEditEmpEntryDate}
        category={editEmpCategory}
        setCategory={setEditEmpCategory}
        pharmacistLicense={editEmpPharmacistLicense}
        setPharmacistLicense={setEditEmpPharmacistLicense}
        isAffiliate={editEmpIsAffiliate}
        setIsAffiliate={setEditEmpIsAffiliate}
        weeklyHours={editEmpWeeklyHours}
        setWeeklyHours={setEditEmpWeeklyHours}
        onJobReserve={editEmpOnJobReserve}
        setOnJobReserve={setEditEmpOnJobReserve}
        jobReserveSince={editEmpJobReserveSince}
        setJobReserveSince={setEditEmpJobReserveSince}
        salaryType={editEmpSalaryType}
        setSalaryType={setEditEmpSalaryType}
        customSalary={editEmpCustomSalary}
        setCustomSalary={setEditEmpCustomSalary}
        customNoRem={editEmpCustomNoRem}
        setCustomNoRem={setEditEmpCustomNoRem}
        onSubmit={handleSaveEditEmployee}
        saving={savingEditEmployee}
      />

      {/* Update Receipt Modal */}
      <UpdateReceiptModal
        isOpen={isUpdateReceiptModalOpen && !!selectedEmpForReceipt}
        onClose={() => {
          setIsUpdateReceiptModalOpen(false);
          setSelectedEmpForReceipt(null);
        }}
        employeeName={selectedEmpForReceipt?.fullName || selectedEmpForReceipt?.full_name || ''}
        employeeCuil={selectedEmpForReceipt?.cuil || ''}
        onFileChange={setUpdateReceiptFile}
        onSubmit={handleUpdateSingleReceipt}
        uploading={uploadingReceipt}
      />

      {/* Tutorial Guide Modal */}
      <TutorialGuideModal
        isOpen={showTutorial}
        onClose={async () => {
          try {
            if (userId) {
              await supabase.from('profiles').update({ seen_tutorial: true }).eq('id', userId);
            }
          } catch (e) {
            console.error(e);
          }
          setShowTutorial(false);
        }}
        step={tutorialStep}
        onNext={() => setTutorialStep((prev) => prev + 1)}
        onPrev={() => setTutorialStep((prev) => prev - 1)}
        onFinish={async () => {
          try {
            if (userId) {
              await supabase.from('profiles').update({ seen_tutorial: true }).eq('id', userId);
            }
          } catch (e) {
            console.error(e);
          }
          setShowTutorial(false);
        }}
      />
    </div>
  );
}