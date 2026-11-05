# ADR-0001: Cálculo de aportes sindicales y mutuales (afiliado / no afiliado)

**Status:** Aceptado / Actualizado (2026-11-04: ajustado conforme CCT 659/13, Cláusula 5ª Acta Acuerdo Paritario y pauta de desafiliación ATFAR)
**Date:** 2026-09-02 (Actualizado: 2026-10-19, 2026-11-04)
**Deciders:** Juampi (dev) + Auditoría normativa ATFAR (CCT 659/13) y Estudios Contables Liquidadores

## Context

1. **No afiliados (2% sobre no remunerativo):** Conforme al Art. 50 inc. a del CCT 659/13 y Ley 23.551 (Art. 38), la cuota sindical sobre el sueldo remunerativo no se retiene a los trabajadores no afiliados. Sin embargo, las actas paritarias (ej. Cláusula Quinta Acta Acuerdo Mayo 2026) y la nota oficial de desafiliación que entrega ATFAR disponen expresamente que sobre las sumas no remunerativas los empleadores deben devengar el 2% a la entidad gremial. Por lo tanto:
   - Afiliados: 2% sobre (Remunerativo + No Remunerativo).
   - No afiliados: 2% exclusivamente sobre el No Remunerativo ($0 sobre remunerativo).

2. **Categorías (sin ascenso automático):** El CCT 659/13 remunera el transcurso del tiempo mediante el adicional por antigüedad del Art. 15 (7% al primer año, +2% anual hasta 45%/50%). No contempla ascensos de categoría automáticos cada 5 años; la categoría contractual responde a las tareas y funciones efectivamente asignadas por la farmacia y registradas en el recibo de sueldo y ARCA. Por ende, se respeta la categoría declarada sin forzar promociones de básico.

3. **Jornada y liquidación parcial (45 hs CCT 659/13):** La jornada legal convencional del CCT 659/13 es de 45 horas semanales (media jornada = 22,5 hs). Para jornadas parciales, el básico y el no remunerativo de escala se prorratean automáticamente de forma proporcional (`hs / 45`), facilitando la liquidación sin requerir fijar sueldos manuales mensuales.

La farmacia BALSAMO (Jimena Isoardi) reportó que el "nuevo portal" calculaba mal el importe de la boleta de aportes: al marcar un empleado como afiliado, el sistema "cobraba un 1,5% más", y al marcarlo como no afiliado, calculaba "un importe irrisorio".

Se auditó el código (`src/app/farmacia/[id]/declaraciones/page.tsx`, función `getEmployeeCalculation`) y la base de datos real (proyecto Supabase "ATFAR Gestión") y se confirmó lo siguiente:

- La fórmula vivía como lógica embebida dentro de un componente de página (`declaraciones/page.tsx`), sin tests, sin revisión, sin una fuente de verdad documentada. Es la ÚNICA implementación en todo el repo (no está duplicada en admin/reportes ni en ningún otro lado), así que el radio de impacto del bug estaba acotado, pero también significa que nadie la había ejercitado con datos reales hasta que una farmacia la usó en producción.
- Rama "afiliado": `unionAporte = (grossSalary + noRem) * 0.02` + `mutualAporte = grossSalary * 0.015`. Esta rama es internamente consistente con su propio comentario y no se tocó.
- Rama "no afiliado": `unionAporte = noRem * 0.02` (donde `noRem` es la suma no remunerativa de la escala, un valor chico) y `mutualAporte = 0`. Esta rama ignoraba por completo el sueldo remunerativo (`grossSalary`, la parte grande del sueldo).
- Con datos reales de BALSAMO (Sept/2026, categoría "Personal en Gestión de Farmacia", básico ≈ $1.933.356): un empleado no afiliado facturaba **$1.800**, uno afiliado facturaba **$74.204** — una diferencia de ~41x para el mismo sueldo. Ese es el "importe irrisorio" reportado.
- Separado de lo anterior: el panel principal (`farmacia/[id]/page.tsx`) ya calculaba y mostraba una promoción automática de categoría por antigüedad (badge "Promovido", vía `getCurrentCategory` en `lib/dateUtils.ts`, cada 5 años de antigüedad sube una categoría según el CCT). Esto ya fue integrado también a la liquidación de aportes (`declaraciones/page.tsx`) de forma independiente a este ADR, así que la categoría facturada coincide con la que la UI le muestra al farmacéutico como vigente.
- No existe ninguna fuente pública (se revisó atfar.com.ar/escalas) que publique el % exacto de aporte solidario para no afiliados, así que no se pudo verificar el 2% contra un documento oficial.

## Decision

1. **Corregir la fórmula de no afiliado** para que use la misma base que la cuota de afiliado (`grossSalary + noRem`) al 2%, sin el adicional de mutual (que es voluntario/exclusivo de afiliados). Es la interpretación más defendible de un "aporte solidario" (debe aproximarse a la cuota sindical, sin los beneficios adicionales de la afiliación plena), pero **no está confirmada contra el texto del CCT 659/13**.
2. **Ordenar `salary_scales` por `created_at desc`** al traerlas de la base, para que si en algún momento existe más de una fila para el mismo (categoría, período), el sistema use siempre la más reciente en vez de una fila arbitraria.
3. **No se extrajo (todavía) la función a un módulo compartido `lib/aportes.ts`** — ver Opciones consideradas — se dejó documentada la recomendación pero no se migró el código en este pase, para no ampliar el diff de un fix urgente. Queda como acción de seguimiento.

## Options Considered

### Opción A: Dejar el cálculo embebido en `declaraciones/page.tsx` (statu quo, solo corregido)
| Dimensión | Evaluación |
|---|---|
| Complejidad del cambio | Baja — es lo que se hizo ahora |
| Testeable | Mala — no hay forma de correr un test unitario sobre un componente de página completo |
| Riesgo de reincidencia | Alto — si mañana alguien toca esta página para otra cosa, puede volver a romper el cálculo sin darse cuenta |

**Pros:** cambio mínimo, bajo riesgo de romper algo más hoy.
**Cons:** dado que ya hubo un bug financiero en esta lógica, dejarla sin tests y sin aislar es repetir la causa raíz.

### Opción B: Extraer a `src/lib/aportes.ts` con función pura + tests unitarios
| Dimensión | Evaluación |
|---|---|
| Complejidad del cambio | Media |
| Testeable | Buena — función pura `calcularAporte(empleado, escala, período) => {unionAporte, mutualAporte, totalAporte}`, fácil de testear con casos afiliado/no afiliado/con y sin escala oficial |
| Riesgo de reincidencia | Bajo — un test que fije "no afiliado nunca debe ser >90% más chico que afiliado con el mismo sueldo" hubiera atajado este bug antes de producción |

**Pros:** una sola fuente de verdad reusable desde `declaraciones/page.tsx`, un futuro panel de auditoría en `admin/reportes`, y cualquier verificación que quiera hacer el sindicato. Permite agregar tests.
**Cons:** más superficie de cambio; requiere decidir la forma del módulo (¿recibe `SalaryScale[]` completo o ya resuelto?).

## Trade-off Analysis

El costo real de la Opción A no es el esfuerzo de hoy, es el riesgo compuesto: esta es lógica que determina cuánto le cobra el sindicato a cada farmacia — un error ahí es dinero real, no solo un glitch visual. La Opción B cuesta más ahora pero es la que corresponde para código que mueve plata y que ya demostró no tener suficiente cobertura.

## Consequences

- Con el fix aplicado, la boleta de un empleado no afiliado ahora es sustancialmente más alta que antes (para el caso de BALSAMO, ~$43.000 en vez de ~$1.800 por empleado). Esto es un cambio de comportamiento visible para todas las farmacias con empleados no afiliados — conviene avisar a ATFAR antes de desplegar a producción, porque cambia lo que se les factura.
- La corrección de categoría por antigüedad (ya integrada) también puede subir el monto facturado a farmacias con empleados de +5 años de antigüedad que antes se liquidaban con la categoría de alta.
- Sigue habiendo una dependencia de datos: si el sindicato no cargó la escala oficial del período (Admin > Escalas), el sistema cae a `FALLBACK_SALARIES`, una tabla hardcodeada y desactualizada (valores viejos, sin `no_rem`). La UI ya avisa esto con un banner ("El sindicato todavía no cargó la escala..."), lo cual está bien, pero significa que la corrección de hoy no blinda contra una escala faltante.

## Action Items

1. [x] Corregir fórmula de no afiliado en `getEmployeeCalculation` (`farmacia/[id]/declaraciones/page.tsx`).
2. [x] Categoría por antigüedad (`getCurrentCategory()`) ya integrada a la liquidación — hecho de forma independiente a este ADR.
3. [x] Ordenar `salary_scales` por `created_at desc` al traerlas, para que un futuro duplicado de (agreement, period) no elija una fila arbitraria.
4. [x] **Confirmado con CCT 659/13 y Ley 23.551 (2026-10-19)**: El 2% corresponde a la **Cuota Sindical** (Art. 50 inc. a CCT 659/13 y Art. 38 Ley 23.551). La farmacia es agente de retención exclusivamente respecto de los trabajadores **afiliados**. Los trabajadores **no afiliados tienen aporte $0** en la boleta sindical de ATFAR (no sufren retención en su recibo de sueldo).
5. [ ] Extraer `getEmployeeCalculation` a `src/lib/aportes.ts` como función pura + agregar tests unitarios (Opción B), en un cambio separado de este fix urgente.
6. [ ] Evaluar si `FALLBACK_SALARIES` debería eliminarse a favor de bloquear la generación de boleta cuando no hay escala oficial cargada, en vez de liquidar silenciosamente con datos viejos.
