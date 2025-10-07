'use client'

import { useEffect, useState } from 'react'

export function useAdminGate(pinEnv?: string) {
  const PIN = pinEnv || process.env.NEXT_PUBLIC_ADMIN_PIN || 'admin123'
  const [ok, setOk] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem('admin_ok') === '1') setOk(true)
  }, [])

  function check(input: string) {
    if (input === PIN) {
      localStorage.setItem('admin_ok', '1')
      setOk(true)
      return true
    }
    return false
  }

  function logout() {
    localStorage.removeItem('admin_ok')
    setOk(false)
  }

  return { ok, check, logout, PIN }
}
