import { utcTimeToLocalHM as tzUtcTimeToLocalHM } from '../../lib/tz'

export function hoyISO() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function fmtFechaY(iso: string) {
  try {
    return new Intl.DateTimeFormat('es-ES', {
      timeZone: 'America/Bogota',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function utcTimeToLocalHM(value: string) {
  return tzUtcTimeToLocalHM(value)
}

export function hmLocalToMinutes(value: string): number {
  const hm = utcTimeToLocalHM(value)
  const [hours, minutes] = hm.split(':').map(number => parseInt(number, 10))
  return (hours || 0) * 60 + (minutes || 0)
}
