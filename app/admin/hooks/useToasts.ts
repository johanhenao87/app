'use client'

import { useCallback } from 'react'

export type ToastKind = 'success' | 'error' | 'info'
export type ToastPayload = {
  id: string
  type: ToastKind
  message: string
}

export const TOAST_EVENT = 'admin:toast'

function getBus(): Window | null {
  if (typeof window === 'undefined') return null
  return window
}

function emitToast(payload: ToastPayload) {
  const bus = getBus()
  if (!bus) return
  bus.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: payload }))
}

function createPayload(type: ToastKind, message: string): ToastPayload {
  return {
    id: Math.random().toString(36).slice(2),
    type,
    message,
  }
}

export function useToasts() {
  const toast = useCallback((type: ToastKind, message: string) => emitToast(createPayload(type, message)), [])
  const success = useCallback((message: string) => toast('success', message), [toast])
  const error = useCallback((message: string) => toast('error', message), [toast])
  const info = useCallback((message: string) => toast('info', message), [toast])

  return { toast, success, error, info }
}

export function showToast(type: ToastKind, message: string) {
  emitToast(createPayload(type, message))
}
