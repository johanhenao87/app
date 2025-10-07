'use client'

import { useEffect, useState } from 'react'

export type AdminGateStatus = 'checking' | 'granted' | 'denied'

const STORAGE_KEY = 'admin_ok'

export function useAdminGate(pinEnv?: string) {
  const pin = pinEnv || process.env.NEXT_PUBLIC_ADMIN_PIN || 'admin123'
  const [status, setStatus] = useState<AdminGateStatus>('checking')
  const [pinInput, setPinInput] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(STORAGE_KEY)
    setStatus(stored === '1' ? 'granted' : 'denied')
  }, [])

  const tryEnter = (value?: string) => {
    const attempt = value ?? pinInput
    if (attempt === String(pin)) {
      localStorage.setItem(STORAGE_KEY, '1')
      setStatus('granted')
      return true
    }
    setStatus('denied')
    return false
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setStatus('denied')
    setPinInput('')
  }

  return {
    pin,
    status,
    granted: status === 'granted',
    pinInput,
    setPinInput,
    tryEnter,
    logout,
  }
}
