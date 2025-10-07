'use client'

import React from 'react'
import AdminTopbar from './AdminTopbar'

type Props = {
  sidebar?: React.ReactNode
  topbarRight?: React.ReactNode
  children: React.ReactNode
}

export default function AdminLayout({ sidebar, topbarRight, children }: Props) {
  return (
    <div className="min-h-screen bg-[--background] text-[--foreground]">
      <AdminTopbar right={topbarRight} />
      <div className="max-w-[1400px] mx-auto grid grid-cols-12 gap-4 px-3 py-4">
        {/* Sidebar rail */}
        <aside className="col-span-12 md:col-span-4 lg:col-span-3 xl:col-span-3">
          {sidebar}
        </aside>

        {/* Main */}
        <main className="col-span-12 md:col-span-8 lg:col-span-9">
          {children}
        </main>
      </div>
    </div>
  )
}
