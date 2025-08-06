'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { BarChart3, BookOpen, FileText, Plus, Calculator } from 'lucide-react'
import AccountingDashboard from './AccountingDashboard'
import JournalEntryForm from './JournalEntryForm'
import JournalEntryList from './JournalEntryList'
import ChartOfAccounts from './ChartOfAccounts'
import FinancialReports from './FinancialReports'

export default function IntegratedAccountingSystem() {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Accounting System</h1>
          <p className="text-gray-600">
            Complete accounting management with journal entries, reports, and chart of accounts
          </p>
        </div>
      </div>

      {/* Accounting Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="journal-entries" className="flex items-center space-x-2">
            <BookOpen className="h-4 w-4" />
            <span>Journal Entries</span>
          </TabsTrigger>
          <TabsTrigger value="accounts" className="flex items-center space-x-2">
            <Calculator className="h-4 w-4" />
            <span>Chart of Accounts</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Financial Reports</span>
          </TabsTrigger>
          <TabsTrigger value="entry-form" className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>New Entry</span>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          <AccountingDashboard onQuickAction={setActiveTab} />
        </TabsContent>

        {/* Journal Entries Tab */}
        <TabsContent value="journal-entries">
          <JournalEntryList />
        </TabsContent>

        {/* Chart of Accounts Tab */}
        <TabsContent value="accounts">
          <ChartOfAccounts />
        </TabsContent>

        {/* Financial Reports Tab */}
        <TabsContent value="reports">
          <FinancialReports />
        </TabsContent>

        {/* New Entry Tab */}
        <TabsContent value="entry-form">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plus className="h-5 w-5" />
                <span>Create New Journal Entry</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <JournalEntryForm 
                onSave={() => setActiveTab('journal-entries')}
                onCancel={() => setActiveTab('dashboard')}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
