'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { postJSON } from '../lib/api'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    cedula:'', nombre:'', telefono:'', correo:'', password:'', confirm:'', tipo_vehiculo:''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)
  const [ok, setOk] = useState<string|null>(null)

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm({ ...form, [k]: v })
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setOk(null)
    if (form.password !== form.confirm) {
      setError('Las contraseñas no coinciden'); return
    }
    if (!form.tipo_vehiculo) {
      setError('Debes seleccionar un tipo de vehículo'); return
    }
    setLoading(true)
    try {
      await postJSON('/api/auth/register', {
        cedula: form.cedula,
        nombre: form.nombre,
        telefono: form.telefono,
        correo: form.correo,
        password: form.password,
        tipo_vehiculo: form.tipo_vehiculo
      })
      setOk('¡Registro exitoso! Serás redirigido para iniciar sesión.')
      setTimeout(()=>router.push('/login'), 1500)
    } catch (e:any) {
      setError(e.message || 'Error al registrarse. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 sm:p-8 transform transition-all duration-300 hover:scale-[1.01]">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Registro de Conductor</h1>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Campo Cédula */}
          <div>
            <label htmlFor="cedula" className="block text-sm font-medium text-gray-700 mb-1">Cédula</label>
            <input
              id="cedula"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
              placeholder="Ej. 123456789"
              value={form.cedula}
              onChange={e=>set('cedula',e.target.value)}
              required
            />
          </div>

          {/* Campo Nombre */}
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
            <input
              id="nombre"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
              placeholder="Ej. Juan Pérez"
              value={form.nombre}
              onChange={e=>set('nombre',e.target.value)}
              required
            />
          </div>

          {/* Campo Teléfono */}
          <div>
            <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input
              id="telefono"
              type="tel"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
              placeholder="Ej. 555-1234567"
              value={form.telefono}
              onChange={e=>set('telefono',e.target.value)}
            />
          </div>

          {/* Campo Correo */}
          <div>
            <label htmlFor="correo" className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
            <input
              id="correo"
              type="email"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
              placeholder="Ej. correo@ejemplo.com"
              value={form.correo}
              onChange={e=>set('correo',e.target.value)}
            />
          </div>

          {/* Campo Tipo de Vehículo */}
          <div>
            <label htmlFor="tipo_vehiculo" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Vehículo
            </label>
            <select
              id="tipo_vehiculo"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
              value={form.tipo_vehiculo}
              onChange={e => set('tipo_vehiculo', e.target.value)}
              required
            >
              <option value="">Selecciona una opción</option>
              <option value="SEN">SEN</option>
              <option value="TM">TM</option>
              <option value="CB">CB</option>
              <option value="DLL">DLL</option>
              <option value="XL">XL</option>
              <option value="MM">MM</option>
            </select>
          </div>

          {/* Campo Contraseña */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              id="password"
              type="password"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
              placeholder="Crea una contraseña segura"
              value={form.password}
              onChange={e=>set('password',e.target.value)}
              required
            />
          </div>

          {/* Campo Confirmar Contraseña */}
          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
            <input
              id="confirm"
              type="password"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
              placeholder="Repite tu contraseña"
              value={form.confirm}
              onChange={e=>set('confirm',e.target.value)}
              required
            />
          </div>

          {/* Mensajes */}
          {error && <p className="text-red-600 text-sm text-center mt-3">{error}</p>}
          {ok && <p className="text-green-600 text-sm text-center mt-3">{ok}</p>}

          {/* Botón Registrarme */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl px-5 py-2.5 bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Registrando…' : 'Registrarme'}
          </button>

          {/* Botón Ir a Login */}
          <button
            type="button"
            onClick={()=>router.push('/login')}
            className="w-full rounded-xl px-4 py-2 bg-gray-100 text-blue-600 font-medium hover:bg-gray-200 transition-colors duration-200"
          >
            Ya tengo cuenta, ir a Iniciar Sesión
          </button>
        </form>
      </div>
    </div>
  )
}
