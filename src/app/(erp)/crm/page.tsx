'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Customer, Interaction, User } from '@/types';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  PlusCircle, Edit, Trash2, MessageSquare,
} from 'lucide-react';
import { CustomerFilters } from '@/components/crm/CustomerFilter';
import { CustomerForm } from '@/components/crm/CustomerForm';
import { InteractionLogForm } from '@/components/crm/InteractionLogForm';
import { UserListByRole } from '@/components/crm/UserListByRole';
import { MobileSalespeoplePopover } from '@/components/crm/MobileSalesPeoplePopover';

export default function CrmPage() {
  const qc = useQueryClient();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerModalOpen, setCustomerModalOpen] = useState(false);
  const [isInteractionModalOpen, setInteractionModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | Customer['status']>('all');
  const [filterSource, setFilterSource] = useState<'all' | Customer['source']>('all');
  const [selectedSalespersonId, setSelectedSalespersonId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user: User = JSON.parse(storedUser);
        setCurrentUser(user);
        setIsAdmin(['System Administrator', 'HR Manager', 'HR'].includes(user.role));
      }
    }
  }, []);

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: () => fetch('/api/crm/customers').then(res => {
      if (!res.ok) throw new Error('Failed to fetch customers');
      return res.json();
    }),
  });

  const { data: interactions = [] } = useQuery<Interaction[]>({
    queryKey: ['interactions'],
    queryFn: () => fetch('/api/crm/interactions').then(res => {
      if (!res.ok) throw new Error('Failed to fetch interactions');
      return res.json();
    }),
  });

  const deleteCustomer = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/crm/customers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete customer');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return customers.filter(c => {
      const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
      const matchesSource = filterSource === 'all' || c.source === filterSource;
      const matchesSearch =
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q);
      const matchesSalesperson =
        !isAdmin || !selectedSalespersonId || c.created_by === selectedSalespersonId;
      return matchesStatus && matchesSource && matchesSearch && matchesSalesperson;
    });
  }, [customers, filterStatus, filterSource, searchQuery, selectedSalespersonId, isAdmin]);

  if (!currentUser) return null;

  const handleAddInteraction = async (data: Omit<Interaction, 'id' | 'customer_id' | 'created_at'>) => {
    if (!selectedCustomer) return;
    await fetch('/api/crm/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        customer_id: selectedCustomer.id,
        created_by: currentUser.id,
      }),
    });
    qc.invalidateQueries({ queryKey: ['interactions'] });
    setInteractionModalOpen(false);
  };

  const handleSaveCustomer = async (data: Omit<Customer, 'id'> | Customer) => {
    const isEdit = !!(selectedCustomer && selectedCustomer.id);
    const url = isEdit ? `/api/crm/customers/${selectedCustomer!.id}` : '/api/crm/customers';
    const method = isEdit ? 'PUT' : 'POST';

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        ...(isEdit ? {} : { created_by: currentUser.id }),
      }),
    });
    qc.invalidateQueries({ queryKey: ['customers'] });
    setCustomerModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className={`grid gap-6 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-1'}`}>
        <div className={isAdmin ? 'lg:col-span-3' : 'col-span-full'}>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Customers</CardTitle>
                <CardDescription>Manage your customer list & interactions.</CardDescription>
              </div>
              <Button onClick={() => { setSelectedCustomer(null); setCustomerModalOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> New Customer
              </Button>
            </CardHeader>

            <CardContent className="space-y-4">
              <Input
                placeholder="Search by name, email or phone"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <CustomerFilters
                filterStatus={filterStatus}
                onFilterStatusChange={setFilterStatus}
                filterSource={filterSource}
                onFilterSourceChange={setFilterSource}
              />

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map(c => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-gray-500">{c.email}</div>
                      </TableCell>
                      <TableCell>{c.company}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === 'Active' ? 'default' : 'secondary'}>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{c.source}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedCustomer(c); setInteractionModalOpen(true); }}>
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedCustomer(c); setCustomerModalOpen(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => deleteCustomer.mutate(c.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {selectedCustomer && (
            <Card>
              <CardHeader>
                <CardTitle>Interactions for {selectedCustomer.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {interactions
                      .filter(i => i.customer_id === selectedCustomer.id)
                      .map(i => (
                        <TableRow key={i.id}>
                          <TableCell>{i.type}</TableCell>
                          <TableCell>{i.notes}</TableCell>
                          <TableCell>{i.interaction_date?.replace('T', ' ').split('.')[0]}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

{isAdmin && (
  <>
    {/* Desktop sidebar */}
    <div className="hidden lg:block space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Salespeople</CardTitle>
        </CardHeader>
        <CardContent>
          <UserListByRole
            role="roles.name"
            onSelectUser={(id) => setSelectedSalespersonId(prev => prev === id ? null : id)}
          />
        </CardContent>
      </Card>
    </div>

    {/* Mobile button */}
    <div className="lg:hidden">
      <MobileSalespeoplePopover
        onSelectUser={(id) => setSelectedSalespersonId(prev => prev === id ? null : id)}
      />
    </div>
  </>
)}

      </div>

      <Dialog open={isCustomerModalOpen} onOpenChange={o => !o && setCustomerModalOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedCustomer ? 'Edit Customer' : 'New Customer'}</DialogTitle>
          </DialogHeader>
          <CustomerForm
            initialData={selectedCustomer}
            onSubmit={(data: Omit<Customer, 'id'> | Customer) => handleSaveCustomer(data)}
            onCancel={() => setCustomerModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isInteractionModalOpen} onOpenChange={o => !o && setInteractionModalOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Interaction for {selectedCustomer?.name}</DialogTitle>
          </DialogHeader>
          <InteractionLogForm
            onSubmit={handleAddInteraction}
            onCancel={() => setInteractionModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
