'use client'

import { useState } from 'react'
import { postJSON } from '../lib/api'
import { useRouter } from 'next/navigation'

export default function ResetPage() {
  const router = useRouter()
  const [step, setStep] = useState<1|2>(1)
  const [cedula, setCedula] = useState('')
  const [code, setCode] = useState('')
  const [pass1, setPass1] = useState('')
  const [pass2, setPass2] = useState('')
  const [msg, setMsg] = useState<string|null>(null)
  const [error, setError] = useState<string|null>(null)
  const [loading, setLoading] = useState(false)

  async function requestCode() {
    setLoading(true); setError(null); setMsg(null)
    try {
      const r = await postJSON<{message:string, code?:string, expires_at?:string}>('/api/auth/request-reset', { cedula })
      setMsg(`Código enviado a tu número de teléfono registrado. (Pruebas: código ${r.code ?? 'enviado'})`) // Mensaje más descriptivo
      setStep(2)
    } catch (e:any) {
      setError(e.message || 'Error solicitando código. Verifica tu cédula.') // Mensaje de error más útil
    } finally {
      setLoading(false)
    }
  }

  async function changePassword() {
    if (pass1 !== pass2) { setError('Las contraseñas no coinciden'); return }
    setLoading(true); setError(null); setMsg(null)
    try {
      await postJSON('/api/auth/reset-password', { cedula, code, newPassword: pass1 })
      setMsg('¡Contraseña actualizada con éxito! Serás redirigido para iniciar sesión.') // Mensaje más claro
      setTimeout(()=>router.push('/login'), 1500) // Aumentamos el tiempo para que el usuario pueda leer el mensaje
    } catch (e:any) {
      setError(e.message || 'No se pudo cambiar la contraseña. Revisa el código y las contraseñas.') // Mensaje de error más útil
    } finally {
      setLoading(false)
    }
  }

  return (
    // Contenedor principal: Fondo de color suave, altura completa, centrado
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      {/* Contenedor del formulario: Fondo blanco, esquinas redondeadas, sombra pronunciada, padding responsivo */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 sm:p-8 transform transition-all duration-300 hover:scale-[1.01]">
        {/* Título: Texto más oscuro, margen inferior aumentado */}
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Restablecer Contraseña</h1>

        {step===1 && (
          // Primer paso: Solicitar código
          <div className="space-y-4"> {/* Aumentado el espacio entre elementos */}
            <p className="text-gray-600 text-center mb-4">Ingresa tu cédula para recibir un código de verificación.</p>
            <div>
              <label htmlFor="cedula-reset" className="block text-sm font-medium text-gray-700 mb-1">Cédula</label>
              <input
                id="cedula-reset"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-gray-800 placeholder-gray-400"
                placeholder="Ingresa tu cédula"
                value={cedula}
                onChange={e=>setCedula(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-red-600 text-sm text-center mt-3">{error}</p>}
            {msg && <p className="text-green-600 text-sm text-center mt-3">{msg}</p>}

            <button
              onClick={requestCode}
              disabled={loading}
              className="w-full rounded-xl px-5 py-2.5 bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enviando…' : 'Solicitar código'}
            </button>
            <button
              onClick={()=>router.push('/login')}
              className="w-full rounded-xl px-4 py-2 bg-gray-100 text-blue-600 font-medium hover:bg-gray-200 transition-colors duration-200"
            >
              Cancelar y volver a Iniciar Sesión
            </button>
          </div>
        )}

        {step===2 && (
          // Segundo paso: Cambiar contraseña
          <div className="space-y-4"> {/* Aumentado el espacio entre elementos */}
            <p className="text-gray-600 text-center mb-4">Ingresa el código que te enviamos y tu nueva contraseña.</p>
            <div>
              <label htmlFor="cedula-confirm" className="block text-sm font-medium text-gray-700 mb-1">Cédula</label>
              <input
                id="cedula-confirm"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-gray-800 placeholder-gray-400"
                placeholder="Tu cédula"
                value={cedula}
                onChange={e=>setCedula(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">Código de Verificación</label>
              <input
                id="code"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-gray-800 placeholder-gray-400"
                placeholder="Código de 6 dígitos"
                value={code}
                onChange={e=>setCode(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
              <input
                id="new-password"
                type="password"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-gray-800 placeholder-gray-400"
                placeholder="Crea tu nueva contraseña"
                value={pass1}
                onChange={e=>setPass1(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="confirm-new-password" className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nueva Contraseña</label>
              <input
                id="confirm-new-password"
                type="password"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-gray-800 placeholder-gray-400"
                placeholder="Confirma tu nueva contraseña"
                value={pass2}
                onChange={e=>setPass2(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-red-600 text-sm text-center mt-3">{error}</p>}
            {msg && <p className="text-green-600 text-sm text-center mt-3">{msg}</p>}

            <button
              onClick={changePassword}
              disabled={loading}
              className="w-full rounded-xl px-5 py-2.5 bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Actualizando…' : 'Cambiar contraseña'}
            </button>
            <button
              onClick={()=>router.push('/login')}
              className="w-full rounded-xl px-4 py-2 bg-gray-100 text-blue-600 font-medium hover:bg-gray-200 transition-colors duration-200"
            >
              Cancelar y volver a Iniciar Sesión
            </button>
          </div>
        )}
      </div>
    </div>
  )
}