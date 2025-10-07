'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { postJSON, saveSession } from '../lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [cedula, setCedula] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const resp = await postJSON<{
        message: string
        conductor: { id: number; nombre: string; cedula: string; tipo_vehiculo?: string | null }
      }>('/api/auth/login', { cedula, password })

      // Guardar sesión incluyendo tipo_vehiculo
      saveSession({
        id: resp.conductor.id,
        nombre: resp.conductor.nombre,
        cedula: resp.conductor.cedula,
        tipo_vehiculo: resp.conductor.tipo_vehiculo ?? null,
      })

      router.push('/panel')
    } catch (err: any) {
      setError(err?.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 sm:p-8 transform transition-all duration-300 hover:scale-[1.01]">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          Agendamiento de Turnos Planta 1
        </h1>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label htmlFor="cedula" className="block text-sm font-medium text-gray-700 mb-1">
              Cédula
            </label>
            <input
              id="cedula"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-gray-800 placeholder-gray-400"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              required
              placeholder="Ingresa tu cédula"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-gray-800 placeholder-gray-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Ingresa tu contraseña"
            />
          </div>

          {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl px-5 py-2.5 bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <div className="flex flex-col sm:flex-row gap-3 mt-5">
          <button
            onClick={() => router.push('/register')}
            className="w-full sm:w-1/2 rounded-xl px-4 py-2 bg-gray-100 text-blue-600 font-medium hover:bg-gray-200 transition-colors duration-200"
          >
            Registrarme
          </button>
          <button
            onClick={() => router.push('/reset')}
            className="w-full sm:w-1/2 rounded-xl px-4 py-2 bg-gray-100 text-blue-600 font-medium hover:bg-gray-200 transition-colors duration-200"
          >
            Olvidé mi contraseña
          </button>
        </div>
      </div>
    </div>
  )
}
