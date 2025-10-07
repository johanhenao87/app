/** Fecha hoy en Bogotá -> YYYY-MM-DD (en-CA) */
export function hoyISO() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function fmtFechaY(esISO: string) {
  try {
    return new Intl.DateTimeFormat('es-ES', {
      timeZone: 'America/Bogota',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(esISO))
  } catch { return esISO }
}

/** Normaliza a "HH:mm" local Bogotá */
export function utcTimeToLocalHM(utcOrHM: string): string {
  // si ya parece HH:mm, devuélvelo
  if (/^\d{2}:\d{2}$/.test(utcOrHM)) return utcOrHM
  const d = new Date(utcOrHM)
  // Bogotá UTC-5 sin DST
  const H = (d.getUTCHours() - 5 + 24) % 24
  const M = d.getUTCMinutes()
  const hh = String(H).padStart(2,'0')
  const mm = String(M).padStart(2,'0')
  return `${hh}:${mm}`
}

/** Convierte HH:mm a minutos desde 00:00 (usado para ordenar) */
export function hmLocalToMinutes(utcOrHM: string): number {
  const hm = utcTimeToLocalHM(utcOrHM);
  const [H, M] = hm.split
