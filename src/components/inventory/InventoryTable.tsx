// components/inventory/InventoryTable.tsx
'use client'
import React from 'react'
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from '@/components/ui/card'
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SlidersHorizontal, AlertCircle, Settings } from 'lucide-react'
import { ProductWithInventory } from '@/types'

type Props = {
  items: ProductWithInventory[],
  onAdjustClick: (item: ProductWithInventory) => void,
  onAddItem: () => void,
  onManageMargins: () => void
}

export const InventoryTable: React.FC<Props> = ({ items, onAdjustClick, onAddItem, onManageMargins }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <div>
          <CardTitle>Inventory</CardTitle>
          <CardDescription>
            Manage stock levels and costs for all products. Prices (MRP) are calculated automatically.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onManageMargins}>
            <Settings className="mr-2 h-4 w-4" /> Manage Margins
          </Button>
          <Button onClick={onAddItem}>Add New Item</Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {['Product','Supplier','Category','Subcat','Material','Location','Cost','MRP','Margin','Stock','Reorder','Actions'].map(h => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(i => (
              <TableRow key={i.inventory_id}>
                <TableCell className="font-medium">{i.product_name}</TableCell>
                <TableCell>{i.supplier_name}</TableCell>
                <TableCell>{i.category}</TableCell>
                <TableCell>{i.subcategory}</TableCell>
                <TableCell>{i.material}</TableCell>
                <TableCell>{i.location}</TableCell>
                <TableCell>${Number(i.cost).toFixed(2)}</TableCell>
                <TableCell className="font-bold">${Number(i.price).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{i.applied_margin}%</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={i.quantity > i.reorder_point ? 'default' : 'destructive'}>
                    {i.quantity <= i.reorder_point && <AlertCircle className="mr-1 h-3 w-3" />}
                    {i.quantity}
                  </Badge>
                </TableCell>
                <TableCell>{i.reorder_point}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAdjustClick(i)}
                  >
                    <SlidersHorizontal className="mr-1 h-4 w-4" />
                    Adjust
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
