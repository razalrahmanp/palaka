'use client';

import { useState } from 'react';
import { DollarSign, Building, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface BankAccount {
  id: string;
  name: string;
  account_number: string;
  current_balance: number;
  account_type: string;
}

interface PaymentCollectionConfig {
  method: 'cash' | 'bank_deposit' | 'cheque';
  bank_account_id?: string;
  reference_number?: string;
  notes?: string;
  cheque_number?: string;
  amount: number;
}

interface PaymentCollectionFormProps {
  totalAmount: number;
  onConfigChange: (config: PaymentCollectionConfig | null) => void;
  onSubmit: (config: PaymentCollectionConfig) => void;
  disabled?: boolean;
}

export default function PaymentCollectionForm({ 
  totalAmount, 
  onConfigChange, 
  onSubmit,
  disabled = false 
}: PaymentCollectionFormProps) {
  const [method, setMethod] = useState<'cash' | 'bank_deposit' | 'cheque'>('bank_deposit');
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [amount, setAmount] = useState(totalAmount.toString());
  const [bankAccountsLoading, setBankAccountsLoading] = useState(false);

  // Fetch bank accounts when bank deposit is selected
  const fetchBankAccounts = async () => {
    if (bankAccounts.length > 0) return; // Already loaded
    
    setBankAccountsLoading(true);
    try {
      const response = await fetch('/api/finance/bank-accounts?type=BANK');
      if (response.ok) {
        const data = await response.json();
        setBankAccounts(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch bank accounts:', error);
    } finally {
      setBankAccountsLoading(false);
    }
  };

  const handleMethodChange = (newMethod: 'cash' | 'bank_deposit' | 'cheque') => {
    setMethod(newMethod);
    
    // Clear method-specific fields
    setSelectedBankAccount('');
    setReferenceNumber('');
    setChequeNumber('');
    
    // Fetch bank accounts if needed
    if (newMethod === 'bank_deposit') {
      fetchBankAccounts();
    }
    
    updateConfig(newMethod);
  };

  const updateConfig = (currentMethod: 'cash' | 'bank_deposit' | 'cheque' = method) => {
    const config: PaymentCollectionConfig = {
      method: currentMethod,
      amount: parseFloat(amount) || totalAmount,
      notes: notes.trim() || undefined,
    };

    // Add method-specific fields
    switch (currentMethod) {
      case 'bank_deposit':
        if (selectedBankAccount) {
          config.bank_account_id = selectedBankAccount;
          config.reference_number = referenceNumber.trim() || undefined;
        } else {
          onConfigChange(null); // Invalid config
          return;
        }
        break;
      case 'cheque':
        if (chequeNumber.trim()) {
          config.cheque_number = chequeNumber.trim();
          config.reference_number = chequeNumber.trim();
        } else {
          onConfigChange(null); // Invalid config
          return;
        }
        break;
      case 'cash':
        // Cash doesn't require additional fields
        break;
    }

    onConfigChange(config);
  };

  const handleSubmit = () => {
    const config: PaymentCollectionConfig = {
      method,
      amount: parseFloat(amount) || totalAmount,
      bank_account_id: selectedBankAccount || undefined,
      reference_number: referenceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      cheque_number: chequeNumber.trim() || undefined,
    };

    onSubmit(config);
  };

  const isValid = () => {
    if (method === 'bank_deposit') {
      return selectedBankAccount !== '';
    } else if (method === 'cheque') {
      return chequeNumber.trim() !== '';
    }
    return true; // Cash is always valid
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Payment Collection Method
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Amount */}
        <div className="space-y-2">
          <Label>Payment Amount</Label>
          <Input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setTimeout(() => updateConfig(), 0);
            }}
            disabled={disabled}
          />
        </div>

        {/* Payment Method Selection */}
        <div className="space-y-4">
          <Label>Collection Method</Label>
          <RadioGroup 
            value={method} 
            onValueChange={handleMethodChange}
            disabled={disabled}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="bank_deposit" id="bank_deposit" />
              <Label htmlFor="bank_deposit" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Bank Deposit
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cheque" id="cheque" />
              <Label htmlFor="cheque" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Cheque
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cash" id="cash" />
              <Label htmlFor="cash" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Cash
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Bank Deposit Fields */}
        {method === 'bank_deposit' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Bank Account</Label>
              {bankAccountsLoading ? (
                <div className="text-sm text-muted-foreground">Loading bank accounts...</div>
              ) : (
                <Select value={selectedBankAccount} onValueChange={(value) => {
                  setSelectedBankAccount(value);
                  setTimeout(() => updateConfig(), 0);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank account for deposit" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} 
                        <span className="text-muted-foreground ml-2">
                          {account.account_number && `(...${account.account_number.slice(-4)})`}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Reference Number (Optional)</Label>
              <Input
                placeholder="Bank deposit reference"
                value={referenceNumber}
                onChange={(e) => {
                  setReferenceNumber(e.target.value);
                  setTimeout(() => updateConfig(), 0);
                }}
                disabled={disabled}
              />
            </div>
          </div>
        )}

        {/* Cheque Fields */}
        {method === 'cheque' && (
          <div className="space-y-2">
            <Label>Cheque Number</Label>
            <Input
              placeholder="Enter cheque number"
              value={chequeNumber}
              onChange={(e) => {
                setChequeNumber(e.target.value);
                setTimeout(() => updateConfig(), 0);
              }}
              disabled={disabled}
            />
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label>Notes (Optional)</Label>
          <Textarea
            placeholder="Additional notes for payment collection"
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setTimeout(() => updateConfig(), 0);
            }}
            disabled={disabled}
          />
        </div>

        {/* Submit Button */}
        <Button 
          onClick={handleSubmit}
          disabled={!isValid() || disabled}
          className="w-full"
        >
          Collect Payment - ${parseFloat(amount) || totalAmount}
        </Button>
      </CardContent>
    </Card>
  );
}