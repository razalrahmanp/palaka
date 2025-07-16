// components/inventory/ProfitMarginManager.tsx
'use client'
import React, { useState, useEffect, useCallback } from 'react'
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from '@/components/ui/card'
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select, SelectTrigger, SelectValue,
  SelectContent, SelectItem
} from '@/components/ui/select'
import { Trash2, PlusCircle } from 'lucide-react'

type MarginRule = {
  id: string;
  margin_percentage: number;
  product_id: string | null;
  category: string | null;
  subcategory: string | null;
  products: { name: string } | null;
};

type Product = {
  product_id: string;
  product_name: string;
};

export const ProfitMarginManager: React.FC<{ products: Product[] }> = ({ products }) => {
  const [rules, setRules] = useState<MarginRule[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [newRuleLevel, setNewRuleLevel] = useState('category')
  const [newRuleTarget, setNewRuleTarget] = useState('')
  const [newRuleMargin, setNewRuleMargin] = useState('')

  const fetchRules = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/profit-margins')
      const data = await res.json()
      if (res.ok) setRules(data)
    } catch (err) {
      console.error('Error fetching margin rules', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  const handleAddRule = async () => {
    if (!newRuleTarget || !newRuleMargin) {
      alert('Please fill in all fields for the new rule.')
      return
    }

    await fetch('/api/profit-margins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: newRuleLevel,
        target: newRuleTarget,
        margin: parseFloat(newRuleMargin)
      })
    })

    setNewRuleTarget('')
    setNewRuleMargin('')
    fetchRules()
  }

  const handleDeleteRule = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      await fetch(`/api/profit-margins?id=${id}`, { method: 'DELETE' })
      fetchRules()
    }
  }

  const getRuleLevelName = (rule: MarginRule) => {
    if (rule.product_id) return 'Product'
    if (rule.subcategory) return 'Subcategory'
    if (rule.category) return 'Category'
    return 'Unknown'
  }

  const getRuleTargetName = (rule: MarginRule) => {
    if (rule.product_id) return rule.products?.name || `Product ID: ${rule.product_id}`
    if (rule.subcategory) return rule.subcategory
    if (rule.category) return rule.category
    return 'N/A'
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Margin Rule</CardTitle>
          <CardDescription>
            Rules are applied from most specific (Product) to least specific (Category).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="rule-level">Rule Level</Label>
            <Select value={newRuleLevel} onValueChange={setNewRuleLevel}>
              <SelectTrigger id="rule-level">
                <SelectValue placeholder="Select level..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="product">Product</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="subcategory">Subcategory</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 col-span-2">
            <Label htmlFor="rule-target">Target</Label>
            {newRuleLevel === 'product' ? (
              <Select onValueChange={setNewRuleTarget}>
                <SelectTrigger id="rule-target">
                  <SelectValue placeholder="Select a product..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.product_id} value={p.product_id}>
                      {p.product_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="rule-target"
                placeholder={newRuleLevel === 'category' ? 'Enter category name' : 'Enter subcategory name'}
                value={newRuleTarget}
                onChange={(e) => setNewRuleTarget(e.target.value)}
              />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="rule-margin">Margin (%)</Label>
            <Input
              id="rule-margin"
              type="number"
              placeholder="e.g., 35"
              value={newRuleMargin}
              onChange={(e) => setNewRuleMargin(e.target.value)}
            />
          </div>
          <div className="col-span-full">
            <Button onClick={handleAddRule} className="w-full">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Rule
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Margin Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Level</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Margin (%)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4}>Loading rules...</TableCell>
                </TableRow>
              ) : rules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>No specific rules found. Using global default.</TableCell>
                </TableRow>
              ) : (
                rules.map(rule => (
                  <TableRow key={rule.id}>
                    <TableCell><Badge variant="secondary">{getRuleLevelName(rule)}</Badge></TableCell>
                    <TableCell className="font-medium">{getRuleTargetName(rule)}</TableCell>
                    <TableCell>{rule.margin_percentage}%</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteRule(rule.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
    