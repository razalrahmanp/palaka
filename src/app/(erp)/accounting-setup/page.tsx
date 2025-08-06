import { Suspense } from 'react'
import AccountingSetup from '@/components/accounting/AccountingSetup'

export default function AccountingSetupPage() {
  return (
    <div className="flex flex-col h-screen">
      <Suspense fallback={<div>Loading...</div>}>
        <AccountingSetup />
      </Suspense>
    </div>
  )
}
