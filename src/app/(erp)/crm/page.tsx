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
  PlusCircle, Edit, Trash2, MessageSquare, BarChart, Users,
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

  const handleAddInteraction = (formData: { type: string; notes: string }) => {
    if (!selectedCustomer) return;
    fetch('/api/crm/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        interaction_date: new Date().toISOString(),
        customer_id: selectedCustomer.id,
        created_by: currentUser.id,
      }),
    }).then(() => {
      qc.invalidateQueries({ queryKey: ['interactions'] });
      setInteractionModalOpen(false);
    });
  };

  const handleSaveCustomer = async (data: { name: string; email?: string; phone?: string; company?: string; status: Customer['status']; source: Customer['source']; tags: string[] }) => {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 space-y-8">
      {/* Header Section */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Customer Relationship Management
            </h1>
            <p className="text-gray-600 mt-2">Manage customer relationships and track interactions</p>
          </div>
          <Button 
            onClick={() => { setSelectedCustomer(null); setCustomerModalOpen(true); }}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <PlusCircle className="mr-2 h-5 w-5" /> Add Customer
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <PlusCircle className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-600 font-medium">+{customers.filter(c => new Date(c.created_at || '').getMonth() === new Date().getMonth()).length}</span>
              <span className="text-gray-600 ml-1">this month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Customers</p>
                <p className="text-2xl font-bold text-gray-900">{customers.filter(c => c.status === 'Active').length}</p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <Badge className="h-6 w-6 text-white bg-transparent border-0" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-600 font-medium">{Math.round((customers.filter(c => c.status === 'Active').length / customers.length) * 100) || 0}%</span>
              <span className="text-gray-600 ml-1">of total</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Interactions</p>
                <p className="text-2xl font-bold text-gray-900">{interactions.length}</p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-600 font-medium">+{interactions.filter(i => new Date(i.interaction_date || '').getMonth() === new Date().getMonth()).length}</span>
              <span className="text-gray-600 ml-1">this month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round((customers.filter(c => c.status === 'Active').length / customers.length) * 100) || 0}%</p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <BarChart className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-600">Lead to customer</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className={`grid gap-6 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-1'}`}>
        <div className={isAdmin ? 'lg:col-span-3' : 'col-span-full'}>
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-t-xl border-b border-purple-100/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900">Customer Database</CardTitle>
                  <CardDescription className="text-gray-600">
                    Manage customer relationships and track engagement history
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="🔍 Search by name, email, or phone..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="border-gray-200 focus:border-purple-500 focus:ring-purple-500/20 rounded-xl"
                  />
                </div>
                <div className="flex gap-2">
                  <CustomerFilters
                    filterStatus={filterStatus}
                    onFilterStatusChange={setFilterStatus}
                    filterSource={filterSource}
                    onFilterSourceChange={setFilterSource}
                  />
                </div>
              </div>

              {/* Enhanced Table */}
              <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                <Table>
                  <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <TableRow className="border-gray-200">
                      <TableHead className="font-semibold text-gray-700 py-4">Customer Info</TableHead>
                      <TableHead className="font-semibold text-gray-700">Company</TableHead>
                      <TableHead className="font-semibold text-gray-700">Status</TableHead>
                      <TableHead className="font-semibold text-gray-700">Source</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map(c => (
                      <TableRow key={c.id} className="hover:bg-purple-50/50 transition-colors border-gray-100">
                        <TableCell className="py-4">
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{c.name}</div>
                              <div className="text-sm text-gray-500">{c.email}</div>
                              {c.phone && <div className="text-sm text-gray-500">{c.phone}</div>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="font-medium text-gray-700">{c.company || 'N/A'}</span>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge 
                            variant={c.status === 'Active' ? 'default' : 'secondary'}
                            className={`${
                              c.status === 'Active' 
                                ? 'bg-green-100 text-green-800 border-green-200' 
                                : 'bg-gray-100 text-gray-800 border-gray-200'
                            } px-3 py-1 rounded-full font-medium`}
                          >
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {c.source}
                          </span>
                        </TableCell>
                        <TableCell className="py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => { setSelectedCustomer(c); setInteractionModalOpen(true); }}
                              className="h-8 w-8 p-0 hover:bg-purple-100 hover:text-purple-600 transition-colors rounded-lg"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => { setSelectedCustomer(c); setCustomerModalOpen(true); }}
                              className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600 transition-colors rounded-lg"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => deleteCustomer.mutate(c.id)}
                              className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 transition-colors rounded-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {filteredCustomers.length === 0 && (
                <div className="text-center py-12">
                  <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <PlusCircle className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No customers found</h3>
                  <p className="text-gray-500 mb-4">Get started by adding your first customer</p>
                  <Button 
                    onClick={() => { setSelectedCustomer(null); setCustomerModalOpen(true); }}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Customer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedCustomer && (
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 mt-6">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-xl border-b border-blue-100/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {selectedCustomer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold text-gray-900">
                        Interactions with {selectedCustomer.name}
                      </CardTitle>
                      <CardDescription className="text-gray-600">
                        Complete interaction history and communication log
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    onClick={() => setInteractionModalOpen(true)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <MessageSquare className="mr-2 h-4 w-4" /> Add Interaction
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                  <Table>
                    <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <TableRow className="border-gray-200">
                        <TableHead className="font-semibold text-gray-700 py-4">Type</TableHead>
                        <TableHead className="font-semibold text-gray-700">Notes</TableHead>
                        <TableHead className="font-semibold text-gray-700">Date & Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {interactions
                        .filter(i => i.customer_id === selectedCustomer.id)
                        .map(i => (
                          <TableRow key={i.id} className="hover:bg-blue-50/50 transition-colors border-gray-100">
                            <TableCell className="py-4">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                {i.type}
                              </span>
                            </TableCell>
                            <TableCell className="py-4">
                              <p className="text-gray-700 text-sm leading-relaxed">{i.notes}</p>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="text-sm">
                                <div className="font-medium text-gray-900">
                                  {new Date(i.interaction_date || '').toLocaleDateString()}
                                </div>
                                <div className="text-gray-500">
                                  {new Date(i.interaction_date || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>

                {interactions.filter(i => i.customer_id === selectedCustomer.id).length === 0 && (
                  <div className="text-center py-12">
                    <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No interactions yet</h3>
                    <p className="text-gray-500 mb-4">Start building a relationship by logging your first interaction</p>
                    <Button 
                      onClick={() => setInteractionModalOpen(true)}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    >
                      <MessageSquare className="mr-2 h-4 w-4" /> Log First Interaction
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

{isAdmin && (
  <>
    {/* Desktop sidebar */}
    <div className="hidden lg:block space-y-6">
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 rounded-t-xl border-b border-green-100/50">
          <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
            <div className="h-8 w-8 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center mr-3">
              <Users className="h-5 w-5 text-white" />
            </div>
            Sales Team
          </CardTitle>
          <CardDescription className="text-gray-600">
            Filter customers by sales representative
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
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
        <DialogContent className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl rounded-2xl max-w-md">
          <DialogHeader className="pb-6 border-b border-gray-100">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              {selectedCustomer ? 'Edit Customer' : 'Add New Customer'}
            </DialogTitle>
          </DialogHeader>
          <CustomerForm
            initialData={selectedCustomer ?? undefined}
            onSubmit={handleSaveCustomer}
            onCancel={() => setCustomerModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isInteractionModalOpen} onOpenChange={o => !o && setInteractionModalOpen(false)}>
        <DialogContent className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl rounded-2xl max-w-md">
          <DialogHeader className="pb-6 border-b border-gray-100">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Log Interaction for {selectedCustomer?.name}
            </DialogTitle>
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
