'use client'

import { useCallback } from 'react'

const BUS = typeof window !== 'undefined' ? window : ({} as any)
const EVT = 'app:toast'

function push(type: 'success'|'error'|'info', message: string) {
  const id = Math.random().toString(36).slice(2)
  BUS.dispatchEvent?.(new CustomEvent(EVT, { detail: { id, type, message }}))
}

export function useToasts() {
  const success = useCallback((m: string)=> push('success', m), [])
  const error   = useCallback((m: string)=> push('error', m), [])
  const info    = useCallback((m: string)=> push('info', m), [])
  return { success, error, info }
}
