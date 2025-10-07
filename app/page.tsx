'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { loadSession } from './lib/api'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    const u = loadSession()
    router.replace(u ? '/panel' : '/login')
  }, [router])
  return null
}
