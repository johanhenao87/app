export async function postJSON<T>(url: string, data: any): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    let msg = 'Error de red'
    try {
      const j = await res.json()
      msg = j.error || JSON.stringify(j)
    } catch {}
    throw new Error(msg)
  }
  return res.json()
}

// Tipo de sesión del conductor
export type ConductorSession = {
  id: number
  nombre: string
  cedula: string
  tipo_vehiculo?: string | null   // ✅ agregado
}

export function saveSession(user: ConductorSession) {
  localStorage.setItem('conductor', JSON.stringify(user))
}

export function loadSession(): ConductorSession | null {
  const raw = localStorage.getItem('conductor')
  return raw ? JSON.parse(raw) : null
}

export function clearSession() {
  localStorage.removeItem('conductor')
}
