import React from 'react';
import { DetailedLedgerView } from '@/components/finance/DetailedLedgerView';

export default function LedgerDetailPage({ 
  params 
}: { 
  params: { type: string; id: string } 
}) {
  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-50 to-blue-50">
      <DetailedLedgerView ledgerId={params.id} ledgerType={params.type} />
    </div>
  );
}
