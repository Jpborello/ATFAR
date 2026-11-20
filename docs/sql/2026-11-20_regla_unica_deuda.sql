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
