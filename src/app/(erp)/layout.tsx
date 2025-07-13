// File: src/app/(erp)/layout.tsx
'use client' 

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'               // ✅ new
import { getCurrentUser } from '@/lib/auth'               // ✅ new
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'

export default function ErpLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  // ✅ new: on mount, if no user in localStorage, replace to /login
  useEffect(() => {
    const user = getCurrentUser()
    if (!user) {
      router.replace('/login')
    }
  }, [router])

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
