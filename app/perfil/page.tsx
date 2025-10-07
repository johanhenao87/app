'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadSession, postJSON } from '../lib/api'

type Perfil = {
  id: number
  cedula: string
  nombre: string
  telefono?: string
  correo?: string
  tipo_vehiculo?: string
}

export default function PerfilPage() {
  const router = useRouter()

  // Perfil
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Password
  const [oldPass, setOldPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [newPass2, setNewPass2] = useState('')
  const [pwdMsg, setPwdMsg] = useState<string | null>(null)
  const [pwdErr, setPwdErr] = useState<string | null>(null)
  const [pwdLoading, setPwdLoading] = useState(false)

  useEffect(() => {
    const u = loadSession()
    if (!u) { router.replace('/login'); return }
    // Usamos los datos en sesión para prellenar
    setPerfil({
      id: u.id,
      cedula: u.cedula,
      nombre: u.nombre,
      telefono: u.telefono,
      correo: u.correo,
      tipo_vehiculo: u.tipo_vehiculo,
    })
    setLoading(false)
  }, [router])

  // Guardar cambios de contacto / tipo
  async function guardarCambios() {
    if (!perfil) return
    setLoading(true); setError(null); setMsg(null)
    try {
      const resp = await postJSON('/api/usuarios/actualizar', {
        conductorId: perfil.id,
        telefono: perfil.telefono,
        correo: perfil.correo,
        tipo_vehiculo: perfil.tipo_vehiculo,
      })
      setMsg('Perfil actualizado correctamente.')
      // Actualiza la sesión con los nuevos datos devueltos por el backend
      localStorage.setItem('session', JSON.stringify(resp.perfil))
    } catch (e: any) {
      setError(e.message || 'No fue posible actualizar el perfil.')
    } finally {
      setLoading(false)
    }
  }

  // Cambiar contraseña
  async function cambiarPassword() {
    setPwdErr(null); setPwdMsg(null)

    if (!perfil) { setPwdErr('Sesión no válida.'); return }
    if (!oldPass || !newPass || !newPass2) {
      setPwdErr('Completa todos los campos.'); return
    }
    if (newPass.length < 8) {
      setPwdErr('La nueva contraseña debe tener al menos 8 caracteres.'); return
    }
    if (newPass !== newPass2) {
      setPwdErr('Las contraseñas nuevas no coinciden.'); return
    }

    setPwdLoading(true)
    try {
      await postJSON('/api/usuarios/cambiar-password', {
        conductorId: perfil.id,
        oldPassword: oldPass,
        newPassword: newPass
      })
      setPwdMsg('Contraseña actualizada correctamente.')
      setOldPass(''); setNewPass(''); setNewPass2('')
    } catch (e: any) {
      setPwdErr(e.message || 'No fue posible cambiar la contraseña.')
    } finally {
      setPwdLoading(false)
    }
  }

  if (loading) return <p className="p-6 text-center text-gray-600">Cargando perfil…</p>

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Card: Datos de perfil */}
        <div className="bg-white rounded-3xl shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Mi Perfil</h1>

          {error && <p className="bg-red-100 text-red-700 p-3 rounded-lg mb-3">{error}</p>}
          {msg && <p className="bg-green-100 text-green-700 p-3 rounded-lg mb-3">{msg}</p>}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={perfil?.nombre || ''}
                disabled
                className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-100 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cédula</label>
              <input
                type="text"
                value={perfil?.cedula || ''}
                disabled
                className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-100 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                type="text"
                value={perfil?.telefono || ''}
                onChange={e=> setPerfil({ ...perfil!, telefono: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
              <input
                type="email"
                value={perfil?.correo || ''}
                onChange={e=> setPerfil({ ...perfil!, correo: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de vehículo</label>
              <select
                value={perfil?.tipo_vehiculo || ''}
                onChange={e=> setPerfil({ ...perfil!, tipo_vehiculo: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="">Selecciona…</option>
                <option value="SEN">SEN</option>
                <option value="TM">TM</option>
                <option value="CB">CB</option>
                <option value="DLL">DLL</option>
                <option value="XL">XL</option>
                <option value="MM">MM</option>
              </select>
            </div>

            <button
              onClick={guardarCambios}
              disabled={loading}
              className="w-full mt-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Guardando…' : 'Guardar Cambios'}
            </button>
          </div>
        </div>

        {/* Card: Cambiar contraseña */}
        <div className="bg-white rounded-3xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Cambiar contraseña</h2>

          {pwdErr && <p className="bg-red-100 text-red-700 p-3 rounded-lg mb-3">{pwdErr}</p>}
          {pwdMsg && <p className="bg-green-100 text-green-700 p-3 rounded-lg mb-3">{pwdMsg}</p>}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña actual</label>
              <input
                type="password"
                value={oldPass}
                onChange={e=> setOldPass(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                autoComplete="current-password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
              <input
                type="password"
                value={newPass}
                onChange={e=> setNewPass(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                autoComplete="new-password"
              />
              <p className="text-xs text-gray-500 mt-1">Mínimo 8 caracteres.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Repetir nueva contraseña</label>
              <input
                type="password"
                value={newPass2}
                onChange={e=> setNewPass2(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                autoComplete="new-password"
              />
            </div>

            <button
              onClick={cambiarPassword}
              disabled={pwdLoading}
              className="w-full mt-2 px-5 py-2.5 rounded-xl bg-black text-white font-semibold shadow-md hover:opacity-90 disabled:opacity-50"
            >
              {pwdLoading ? 'Actualizando…' : 'Actualizar contraseña'}
            </button>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => router.push('/panel')}
            className="text-blue-600 hover:underline"
          >
            ← Volver al panel
          </button>
        </div>
      </div>
    </div>
  )
}
