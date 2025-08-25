import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Customer } from "@/types";
import { 
  Search, 
  Plus, 
  User, 
  Phone, 
  Mail, 
  MapPin,
  Building2,
  UserPlus
} from "lucide-react";

export interface BillingCustomer extends Omit<Customer, 'status' | 'source' | 'tags' | 'created_at' | 'id'> {
  id?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  customer_type?: 'individual' | 'business';
  expected_delivery_date?: string;
  special_instructions?: string;
  purpose_of_visit?: string;
}

interface CustomerFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (customer: BillingCustomer) => void;
}

export function CustomerForm({ isOpen, onClose, onSubmit }: CustomerFormProps) {
  const [formMode, setFormMode] = useState<'search' | 'new'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BillingCustomer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [newCustomer, setNewCustomer] = useState<BillingCustomer>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstin: '',
    company: '',
    customer_type: 'individual',
    expected_delivery_date: '',
    special_instructions: '',
    purpose_of_visit: ''
  });

  // Search existing customers
  const searchCustomers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/crm/customers/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (response.ok) {
        setSearchResults(data.customers || []);
      } else {
        console.error('Customer search error:', data.error);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Customer search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchCustomers(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle customer selection
  const selectCustomer = (customer: BillingCustomer) => {
    onSubmit(customer);
    resetForm();
  };

  // Handle new customer creation
  const createNewCustomer = () => {
    if (!newCustomer.name.trim() || !newCustomer.phone?.trim()) {
      alert('Please fill in required fields (Name and Phone)');
      return;
    }

    onSubmit(newCustomer);
    resetForm();
  };

  // Reset form
  const resetForm = () => {
    setFormMode('search');
    setSearchQuery('');
    setSearchResults([]);
    setNewCustomer({
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      gstin: '',
      company: '',
      customer_type: 'individual',
      expected_delivery_date: '',
      special_instructions: '',
      purpose_of_visit: ''
    });
  };

  // Handle close
  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {formMode === 'search' ? 'Select Customer' : 'Add New Customer'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Mode Toggle */}
          <div className="flex gap-2">
            <Button
              variant={formMode === 'search' ? 'default' : 'outline'}
              onClick={() => setFormMode('search')}
              className="flex-1"
            >
              <Search className="h-4 w-4 mr-2" />
              Search Existing
            </Button>
            <Button
              variant={formMode === 'new' ? 'default' : 'outline'}
              onClick={() => setFormMode('new')}
              className="flex-1"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add New Customer
            </Button>
          </div>

          {formMode === 'search' ? (
            <div className="space-y-4">
              {/* Search Input */}
              <div className="relative">
                <Input
                  placeholder="Search by name, phone, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchResults.map((customer) => (
                    <Card
                      key={customer.id}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => selectCustomer(customer)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{customer.name}</h4>
                              {customer.customer_type === 'business' && (
                                <Badge variant="secondary">
                                  <Building2 className="h-3 w-3 mr-1" />
                                  Business
                                </Badge>
                              )}
                            </div>
                            
                            <div className="text-sm text-gray-600 space-y-1 mt-1">
                              <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {customer.phone}
                                </span>
                                {customer.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {customer.email}
                                  </span>
                                )}
                              </div>
                              
                              {customer.company && (
                                <div className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {customer.company}
                                </div>
                              )}
                              
                              {customer.city && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {customer.city}, {customer.state}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <Button size="sm">
                            Select
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {searchQuery && searchResults.length === 0 && !isSearching && (
                <div className="text-center py-8 text-gray-500">
                  <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No customers found</p>
                  <p className="text-sm">Try a different search term or create a new customer</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Customer Type */}
              <div>
                <Label htmlFor="customer_type">Customer Type</Label>
                <Select
                  value={newCustomer.customer_type}
                  onValueChange={(value: 'individual' | 'business') =>
                    setNewCustomer(prev => ({ ...prev, customer_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Full name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone number"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Email address"
                  />
                </div>
                {newCustomer.customer_type === 'business' && (
                  <div>
                    <Label htmlFor="company">Company Name</Label>
                    <Input
                      id="company"
                      value={newCustomer.company || ''}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="Company name"
                    />
                  </div>
                )}
              </div>

              {/* Address Information */}
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={newCustomer.address || ''}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Street address"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={newCustomer.city || ''}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={newCustomer.state || ''}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="State"
                  />
                </div>
                <div>
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    value={newCustomer.pincode || ''}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, pincode: e.target.value }))}
                    placeholder="Pincode"
                  />
                </div>
              </div>

              {/* GST Information (for business customers) */}
              {newCustomer.customer_type === 'business' && (
                <div>
                  <Label htmlFor="gstin">GSTIN</Label>
                  <Input
                    id="gstin"
                    value={newCustomer.gstin || ''}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, gstin: e.target.value }))}
                    placeholder="GST Identification Number"
                  />
                </div>
              )}

              {/* Expected Delivery Date */}
              <div>
                <Label htmlFor="expected_delivery_date" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Expected Delivery Date *
                </Label>
                <Input
                  id="expected_delivery_date"
                  type="date"
                  value={newCustomer.expected_delivery_date || ''}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, expected_delivery_date: e.target.value }))}
                  required
                />
              </div>

              {/* Special Instructions */}
              <div>
                <Label htmlFor="special_instructions">Special Instructions</Label>
                <Textarea
                  id="special_instructions"
                  value={newCustomer.special_instructions || ''}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, special_instructions: e.target.value }))}
                  placeholder="Any special delivery or handling instructions..."
                  rows={3}
                />
              </div>

              {/* Purpose of Visit */}
              <div>
                <Label htmlFor="purpose_of_visit">Purpose of Visit</Label>
                <Select 
                  value={newCustomer.purpose_of_visit || ''} 
                  onValueChange={(value) => setNewCustomer(prev => ({ ...prev, purpose_of_visit: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select purpose of visit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">Purchase</SelectItem>
                    <SelectItem value="inquiry">Inquiry</SelectItem>
                    <SelectItem value="service">Service/Support</SelectItem>
                    <SelectItem value="warranty">Warranty Claim</SelectItem>
                    <SelectItem value="exchange">Exchange/Return</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Form Actions */}
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={createNewCustomer}
                  className="flex-1"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Customer
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
