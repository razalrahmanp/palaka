'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3,
  Settings,
  ArrowLeft,
  BookOpen
} from 'lucide-react'
import EnhancedOpeningBalanceSetup from './EnhancedOpeningBalanceSetup'
import OpeningBalanceDashboard from './OpeningBalanceDashboard'
import OpeningBalanceSetup from './OpeningBalanceSetup'

type ViewMode = 'dashboard' | 'enhanced-setup' | 'traditional-setup'

export default function OpeningBalanceManager() {
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard')
  const [, setSelectedBalanceType] = useState<string>('')

  const handleNavigateToSetup = (balanceType?: string) => {
    setSelectedBalanceType(balanceType || '')
    setCurrentView('enhanced-setup')
  }

  const handleBackToDashboard = () => {
    setCurrentView('dashboard')
    setSelectedBalanceType('')
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'enhanced-setup':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Button onClick={handleBackToDashboard} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <h2 className="text-2xl font-bold">Enhanced Opening Balance Setup</h2>
            </div>
            <EnhancedOpeningBalanceSetup />
          </div>
        )
      
      case 'traditional-setup':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Button onClick={handleBackToDashboard} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <h2 className="text-2xl font-bold">Traditional Opening Balance Setup</h2>
            </div>
            <OpeningBalanceSetup />
          </div>
        )
      
      case 'dashboard':
      default:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Opening Balance Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">
                  Manage opening balances for your business entities. Choose between enhanced setup for 
                  loans, investments, and specific entity types, or traditional setup for general accounting entries.
                </p>
                
                <Tabs defaultValue="enhanced" className="space-y-6">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="enhanced">Enhanced Opening Balances</TabsTrigger>
                    <TabsTrigger value="traditional">Traditional Opening Balances</TabsTrigger>
                  </TabsList>

                  <TabsContent value="enhanced" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <Card className="lg:col-span-2">
                        <CardContent className="p-6">
                          <h3 className="text-lg font-semibold mb-2">Enhanced Opening Balance System</h3>
                          <p className="text-muted-foreground mb-4">
                            Automated setup for specific business entity types including loans, investments, 
                            government dues, and more. Features automatic account mapping and dropdown selections.
                          </p>
                          <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                            <li>• Bank Loans & Personal Loans</li>
                            <li>• Gold Loans & Investor Capital</li>
                            <li>• Monthly Returns & Government Dues</li>
                            <li>• Employee/Customer Advances</li>
                            <li>• Tax Liabilities & Other Payables</li>
                          </ul>
                          <Button onClick={() => setCurrentView('enhanced-setup')} className="w-full">
                            <Settings className="h-4 w-4 mr-2" />
                            Manage Enhanced Balances
                          </Button>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-6">
                          <h3 className="text-lg font-semibold mb-2">Dashboard & Analytics</h3>
                          <p className="text-muted-foreground mb-4">
                            View comprehensive dashboard with balance type summaries, recent activity, 
                            and posting status.
                          </p>
                          <Button onClick={() => setCurrentView('dashboard')} variant="outline" className="w-full">
                            <BarChart3 className="h-4 w-4 mr-2" />
                            View Dashboard
                          </Button>
                        </CardContent>
                      </Card>
                    </div>

                    <OpeningBalanceDashboard onNavigateToSetup={handleNavigateToSetup} />
                  </TabsContent>

                  <TabsContent value="traditional" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <Card className="lg:col-span-2">
                        <CardContent className="p-6">
                          <h3 className="text-lg font-semibold mb-2">Traditional Opening Balance Setup</h3>
                          <p className="text-muted-foreground mb-4">
                            Standard accounting setup for opening balances including assets, liabilities, 
                            equity, vendor outstanding, and inventory items.
                          </p>
                          <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                            <li>• Chart of Accounts based setup</li>
                            <li>• Supplier Outstanding amounts</li>
                            <li>• Inventory valuation</li>
                            <li>• Balance sheet validation</li>
                          </ul>
                          <Button onClick={() => setCurrentView('traditional-setup')} variant="outline" className="w-full">
                            <Settings className="h-4 w-4 mr-2" />
                            Setup Traditional Balances
                          </Button>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-6">
                          <h3 className="text-lg font-semibold mb-2">Integration</h3>
                          <p className="text-muted-foreground mb-4">
                            Both systems integrate with your accounting module and generate proper journal entries.
                          </p>
                          <div className="text-sm text-muted-foreground">
                            <p>✓ Double-entry bookkeeping</p>
                            <p>✓ Automatic journal creation</p>
                            <p>✓ Balance sheet integration</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardContent className="p-6">
                        <div className="text-center">
                          <h3 className="text-lg font-semibold mb-2">Traditional Setup</h3>
                          <p className="text-muted-foreground mb-4">
                            Access the traditional opening balance setup for general accounting entries.
                          </p>
                          <Button onClick={() => setCurrentView('traditional-setup')}>
                            Access Traditional Setup
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )
    }
  }

  return (
    <div className="container mx-auto p-6">
      {renderCurrentView()}
    </div>
  )
}
