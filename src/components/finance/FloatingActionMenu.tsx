'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Building2,
  ArrowRightLeft,
  Receipt,
  X,
} from 'lucide-react';

interface ActionItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: string;
  hoverColor: string;
}

interface FloatingActionMenuProps {
  actions: ActionItem[];
}

export function FloatingActionMenu({ actions }: FloatingActionMenuProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleMenu = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Backdrop overlay when menu is open */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Action Items Container */}
      <div className="flex flex-col items-end gap-3">
        {/* Expanded Action Items */}
        {isExpanded && (
          <div className="flex flex-col gap-2 animate-in slide-in-from-top-2 duration-200">
            {actions.map((action) => (
              <div
                key={action.id}
                className="flex items-center gap-3 animate-in slide-in-from-right duration-200"
              >
                {/* Action Label */}
                <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium whitespace-nowrap">
                  {action.label}
                </div>
                
                {/* Action Button */}
                <Button
                  size="sm"
                  className={`w-12 h-12 p-0 rounded-full shadow-lg hover:shadow-xl transition-all border-0 ${action.color} ${action.hoverColor}`}
                  onClick={() => {
                    action.onClick();
                    setIsExpanded(false);
                  }}
                  title={action.label}
                >
                  {action.icon}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Main FAB Button */}
        <div className="relative">
          <Button
            size="sm"
            className={`w-12 h-12 p-0 rounded-full shadow-lg hover:shadow-xl transition-all border-0 ${
              isExpanded
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
            } duration-300`}
            onClick={toggleMenu}
            title={isExpanded ? 'Close Menu' : 'Quick Actions'}
          >
            {isExpanded ? (
              <X className="h-5 w-5 text-white" />
            ) : (
              <Plus className="h-5 w-5 text-white" />
            )}
          </Button>

          {/* Action Count Badge - Only visible when collapsed */}
          {!isExpanded && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
              {actions.length}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Preset action configurations for common use cases
export const createFinanceActions = (handlers: {
  onCreateExpense: () => void;
  onCreateInvestment: () => void;
  onCreateWithdrawal: () => void;
  onCreateLiability: () => void;
  onLoanSetup: () => void;
  onFundTransfer: () => void;
  onRefund: () => void;
}): ActionItem[] => [
  {
    id: 'expense',
    label: 'Add Expense',
    icon: <Plus className="h-5 w-5 text-white" />,
    onClick: handlers.onCreateExpense,
    color: 'bg-red-600',
    hoverColor: 'hover:bg-red-700',
  },
  {
    id: 'investment',
    label: 'Investment',
    icon: <TrendingUp className="h-5 w-5 text-white" />,
    onClick: handlers.onCreateInvestment,
    color: 'bg-green-600',
    hoverColor: 'hover:bg-green-700',
  },
  {
    id: 'withdrawal',
    label: 'Withdrawal',
    icon: <TrendingDown className="h-5 w-5 text-white" />,
    onClick: handlers.onCreateWithdrawal,
    color: 'bg-purple-600',
    hoverColor: 'hover:bg-purple-700',
  },
  {
    id: 'liability',
    label: 'Pay Liability',
    icon: <CreditCard className="h-5 w-5 text-white" />,
    onClick: handlers.onCreateLiability,
    color: 'bg-blue-600',
    hoverColor: 'hover:bg-blue-700',
  },
  {
    id: 'loan',
    label: 'Loan Setup',
    icon: <Building2 className="h-5 w-5 text-white" />,
    onClick: handlers.onLoanSetup,
    color: 'bg-orange-600',
    hoverColor: 'hover:bg-orange-700',
  },
  {
    id: 'transfer',
    label: 'Fund Transfer',
    icon: <ArrowRightLeft className="h-5 w-5 text-white" />,
    onClick: handlers.onFundTransfer,
    color: 'bg-indigo-600',
    hoverColor: 'hover:bg-indigo-700',
  },
  {
    id: 'refund',
    label: 'Process Refund',
    icon: <Receipt className="h-5 w-5 text-white" />,
    onClick: handlers.onRefund,
    color: 'bg-yellow-600',
    hoverColor: 'hover:bg-yellow-700',
  },
];
