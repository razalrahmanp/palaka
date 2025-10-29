'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Users, Search, Phone, Mail, Building2,
  MapPin, Calendar, MessageSquare, Plus, Filter
} from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  status: 'active' | 'inactive' | 'prospect';
  lastContact: string;
  location: string;
  value: string;
}

export default function CRMContactsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'prospect'>('all');

  const contacts: Contact[] = [
    {
      id: '1',
      name: 'Ava Corlette',
      email: 'ava.corlette@company.com',
      phone: '+1 (555) 123-4567',
      company: 'Tech Solutions Inc',
      position: 'CEO',
      status: 'active',
      lastContact: '2024-10-28',
      location: 'New York, NY',
      value: '$45,000'
    },
    {
      id: '2',
      name: 'Bessie Cooper',
      email: 'bessie.cooper@enterprise.com',
      phone: '+1 (555) 234-5678',
      company: 'Enterprise Corp',
      position: 'Marketing Director',
      status: 'active',
      lastContact: '2024-10-27',
      location: 'San Francisco, CA',
      value: '$32,000'
    },
    {
      id: '3',
      name: 'Jerome Bell',
      email: 'jerome.bell@startup.io',
      phone: '+1 (555) 345-6789',
      company: 'Startup Ventures',
      position: 'Founder',
      status: 'prospect',
      lastContact: '2024-10-25',
      location: 'Austin, TX',
      value: '$12,000'
    },
    {
      id: '4',
      name: 'Esther Howard',
      email: 'esther.howard@global.com',
      phone: '+1 (555) 456-7890',
      company: 'Global Industries',
      position: 'VP Sales',
      status: 'active',
      lastContact: '2024-10-26',
      location: 'Chicago, IL',
      value: '$28,000'
    },
    {
      id: '5',
      name: 'Robert Fox',
      email: 'robert.fox@digital.com',
      phone: '+1 (555) 567-8901',
      company: 'Digital Media Co',
      position: 'Manager',
      status: 'inactive',
      lastContact: '2024-09-15',
      location: 'Los Angeles, CA',
      value: '$8,000'
    },
    {
      id: '6',
      name: 'Kristin Watson',
      email: 'kristin.watson@consulting.com',
      phone: '+1 (555) 678-9012',
      company: 'Watson Consulting',
      position: 'Principal',
      status: 'prospect',
      lastContact: '2024-10-24',
      location: 'Boston, MA',
      value: '$15,000'
    }
  ];

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = 
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || contact.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-700 border-green-200',
      inactive: 'bg-gray-100 text-gray-700 border-gray-200',
      prospect: 'bg-blue-100 text-blue-700 border-blue-200'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const stats = [
    {
      label: 'Total Contacts',
      value: contacts.length,
      icon: Users,
      color: 'from-blue-500 to-cyan-600'
    },
    {
      label: 'Active',
      value: contacts.filter(c => c.status === 'active').length,
      icon: Users,
      color: 'from-green-500 to-emerald-600'
    },
    {
      label: 'Prospects',
      value: contacts.filter(c => c.status === 'prospect').length,
      icon: Users,
      color: 'from-purple-500 to-pink-600'
    },
    {
      label: 'Inactive',
      value: contacts.filter(c => c.status === 'inactive').length,
      icon: Users,
      color: 'from-gray-500 to-slate-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Contacts</h1>
          <p className="text-gray-600">Manage your customer and prospect contacts</p>
        </div>
        <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search contacts by name, email, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'active', 'prospect', 'inactive'] as const).map((status) => (
                <Button
                  key={status}
                  variant={filterStatus === status ? 'default' : 'outline'}
                  onClick={() => setFilterStatus(status)}
                  size="sm"
                  className={filterStatus === status ? 'bg-gradient-to-r from-purple-600 to-blue-600' : ''}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contacts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredContacts.map((contact) => (
          <Card key={contact.id} className="hover:shadow-xl transition-all">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold">
                    {getInitials(contact.name)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{contact.name}</CardTitle>
                    <p className="text-sm text-gray-600">{contact.position}</p>
                  </div>
                </div>
                <Badge className={getStatusColor(contact.status)}>
                  {contact.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Building2 className="h-4 w-4 text-purple-600" />
                  <span>{contact.company}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4 text-purple-600" />
                  <span className="truncate">{contact.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4 text-purple-600" />
                  <span>{contact.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 text-purple-600" />
                  <span>{contact.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  <span>Last contact: {new Date(contact.lastContact).toLocaleDateString()}</span>
                </div>

                <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Contact Value</p>
                    <p className="text-lg font-bold text-purple-600">{contact.value}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredContacts.length === 0 && (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No contacts found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
