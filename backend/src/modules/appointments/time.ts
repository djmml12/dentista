/** Lógica de horarios de citas, pura y testeable (sin acceso a BD). */

/** Un intervalo es válido si termina estrictamente después de empezar. */
export function isValidInterval(startsAt: Date, endsAt: Date): boolean {
  return endsAt.getTime() > startsAt.getTime();
}

/**
 * Dos intervalos [aStart, aEnd) y [bStart, bEnd) se solapan si cada uno empieza
 * antes de que termine el otro. Es la misma regla que aplica la consulta de
 * `assertNoOverlap` en SQL (startsAt < otherEnd AND endsAt > otherStart).
 */
export function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}
