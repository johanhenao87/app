'use client'

import React from 'react'
import AdminTopbar from './AdminTopbar'
import { Toaster } from '../ui/Toasts'

export type AdminLayoutProps = {
  sidebar?: React.ReactNode
  topbarRight?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export default function AdminLayout({
  sidebar,
  topbarRight,
  children,
  className = '',
}: AdminLayoutProps) {
  return (
    <div className={`min-h-screen bg-[--background] text-[--foreground] transition-colors duration-200 ${className}`.trim()}>
      <AdminTopbar right={topbarRight} />
      <div className="mx-auto grid max-w-[1400px] grid-cols-12 gap-4 px-3 py-4 sm:px-4">
        <aside className="col-span-12 md:col-span-4 lg:col-span-3 xl:col-span-3">{sidebar}</aside>
        <main className="col-span-12 md:col-span-8 lg:col-span-9 xl:col-span-9 space-y-4">{children}</main>
      </div>
      <Toaster />
    </div>
  )
}
