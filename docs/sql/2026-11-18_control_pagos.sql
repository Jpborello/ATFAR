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
