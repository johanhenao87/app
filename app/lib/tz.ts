// app/lib/tz.ts
const TZ = 'America/Bogota' as const;

/** Convierte 'YYYY-MM-DD' (local Bogota) a un Date UTC (00:00 local -> instante UTC). */
export function localDateToUTC(dateISO: string): Date {
  return new Date(`${dateISO}T00:00:00-05:00`);
}

/** Convierte 'HH:mm' (local Bogota) a un Date UTC anclado al 1-ene-1970. */
export function localTimeToUTC(hhmm: string): Date {
  const [hh, mm = '00'] = String(hhmm).split(':');
  const H = `${hh}`.padStart(2, '0');
  const M = `${mm}`.padStart(2, '0');
  return new Date(`1970-01-01T${H}:${M}:00-05:00`); // <-- AJUSTE: antes decía ...00Z
}

/** Formatea un Date (UTC) a 'YYYY-MM-DD' en zona Bogota. */
export function utcDateToLocalYMD(d: Date | string | number): string {
  const dt = toDateSafe(d);
  if (!dt) return '';
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'
  });
  return fmt.format(dt);
}

/**
 * Formatea un instante (UTC) a 'HH:mm' en zona Bogotá.
 * Acepta: Date | ISO | epoch | 'HH:mm' (lo interpretamos como 1970-01-01THH:mm:00-05:00)
 */
export function utcTimeToLocalHM(d: Date | string | number): string {
  const dt = toDateSafe(d, /*acceptHHmm*/ true);
  if (!dt) return '--:--';
  const parts = new Intl.DateTimeFormat('es-CO', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(dt);
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '00';
  return `${get('hour')}:${get('minute')}`;
}

/** Helpers UI */
export function formatLocalDate(d: Date | string | number): string {
  const dt = toDateSafe(d);
  if (!dt) return '';
  return new Intl.DateTimeFormat('es-CO', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric' }).format(dt);
}
export function formatLocalTime(d: Date | string | number): string {
  const dt = toDateSafe(d, /*acceptHHmm*/ true);
  if (!dt) return '--:--';
  return new Intl.DateTimeFormat('es-CO', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(dt);
}

/** NUEVO: combina 'YYYY-MM-DD' + 'HH:mm' (ambos en Bogotá) y devuelve ISO en UTC canónico */
export function bogotaLocalToUtcISO(localDateYMD: string, localTimeHM: string): string {
  const [y, m, d] = localDateYMD.split('-').map(n => parseInt(n, 10));
  const [H, M] = localTimeHM.split(':').map(n => parseInt(n, 10));
  // Bogotá -05:00 -> sumamos 5 horas para llegar a UTC
  const utc = new Date(Date.UTC(y, m - 1, d, H + 5, M, 0, 0));
  return utc.toISOString();
}

/** --------------------------------
 * Normaliza varias entradas a Date seguro.
 * - Si viene 'HH:mm' y acceptHHmm=true, lo convierte a 1970-01-01THH:mm:00-05:00 (Bogotá)
 * - Devuelve null si no se puede parsear.
 * --------------------------------*/
function toDateSafe(
  value: Date | string | number | null | undefined,
  acceptHHmm = false
): Date | null {
  if (value == null) return null;

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  // string
  const s = String(value).trim();
  if (!s) return null;

  // 'HH:mm' -> anclar a 1970-01-01T... en Bogotá (NO en Z)
  if (acceptHHmm && /^\d{1,2}:\d{2}$/.test(s)) {
    const [hh, mm] = s.split(':');
    const H = hh.padStart(2, '0');
    const M = mm.padStart(2, '0');
    const d = new Date(`1970-01-01T${H}:${M}:00-05:00`); // <-- AJUSTE: antes decía ...00Z
    return isNaN(d.getTime()) ? null : d;
  }

  // ISO u otros
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
