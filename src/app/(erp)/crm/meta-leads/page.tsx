'use client';

import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Search, 
  Phone,
  Mail,
  Calendar,
  Tag,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  UserCheck,
  Megaphone,
  Loader2,
  RefreshCw,
  Upload,
  X,
  FileText,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface MetaLead {
  id: string;
  meta_lead_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  campaign_name: string;
  campaign_id: string;
  adset_name: string;
  ad_name: string;
  form_name: string;
  platform: 'facebook' | 'instagram' | 'whatsapp';
  created_time: string;
  synced_at: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'rejected';
  assigned_to: string | null;
  customer_id: string | null;
}

export default function MetaLeadsPage() {
  const [leads, setLeads] = useState<MetaLead[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<Record<string, string>[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Fetch leads from database on component mount
  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('meta_leads')
        .select('*')
        .order('created_time', { ascending: false });

      if (error) {
        console.error('Error fetching leads:', error);
        return;
      }

      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncFromMeta = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/crm/meta-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sync_type: 'leads' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Sync completed! Created: ${data.summary.records_created}, Updated: ${data.summary.records_updated}`);
        // Reload leads from database
        await fetchLeads();
      } else {
        alert(`Sync failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert('Failed to sync leads. Please check your Meta API credentials.');
    } finally {
      setIsSyncing(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `full_name,phone,email,campaign_name,platform,status,notes
John Doe,+919876543210,john@example.com,WhatsApp - Sofa Inquiry,whatsapp,new,Interested in L-shaped sofa
Sarah Smith,+918765432109,sarah@example.com,Instagram - Hiring Ad,instagram,new,Applied for sales position
`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'whatsapp_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFile(file);

    // Read and preview file
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      const preview = lines.slice(1, Math.min(6, lines.length)).map(line => {
        const values = line.split(',').map(v => v.trim());
        const obj: Record<string, string> = {};
        headers.forEach((header, index) => {
          obj[header] = values[index] || '';
        });
        return obj;
      });

      setImportPreview(preview);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importFile) return;

    setIsImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        
        const leadsToImport = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          const obj: Record<string, string> = {};
          headers.forEach((header, index) => {
            obj[header] = values[index] || '';
          });
          return obj;
        });

        // Import to database
        let imported = 0;
        for (const lead of leadsToImport) {
          if (!lead.full_name || !lead.phone) continue;

          const validStatuses = ['new', 'contacted', 'qualified', 'converted', 'rejected'];
          const leadStatus = validStatuses.includes(lead.status) ? lead.status : 'new';

          const { error } = await supabase.from('meta_leads').insert({
            meta_lead_id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            full_name: lead.full_name,
            phone: lead.phone,
            email: lead.email || null,
            campaign_name: lead.campaign_name || 'Manual Import',
            campaign_id: 'manual_import',
            adset_name: 'Manual Import',
            ad_name: 'Manual Import',
            form_name: 'Manual Import',
            platform: (lead.platform as 'facebook' | 'instagram' | 'whatsapp') || 'whatsapp',
            status: leadStatus as 'new' | 'contacted' | 'qualified' | 'converted' | 'rejected',
            created_time: new Date().toISOString(),
            synced_at: new Date().toISOString()
          });

          if (!error) imported++;
        }

        alert(`Import completed! ${imported} leads imported successfully.`);
        setShowImportModal(false);
        setImportFile(null);
        setImportPreview([]);
        await fetchLeads();
      };
      reader.readAsText(importFile);
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import leads. Please check the file format.');
    } finally {
      setIsImporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      new: 'bg-blue-100 text-blue-800 border-blue-300',
      contacted: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      qualified: 'bg-purple-100 text-purple-800 border-purple-300',
      converted: 'bg-green-100 text-green-800 border-green-300',
      rejected: 'bg-red-100 text-red-800 border-red-300'
    };
    const icons = {
      new: <Clock className="h-3 w-3" />,
      contacted: <Phone className="h-3 w-3" />,
      qualified: <UserCheck className="h-3 w-3" />,
      converted: <CheckCircle2 className="h-3 w-3" />,
      rejected: <XCircle className="h-3 w-3" />
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${badges[status as keyof typeof badges]}`}>
        {icons[status as keyof typeof icons]}
        {status.toUpperCase()}
      </span>
    );
  };

  const getPlatformIcon = (platform: string) => {
    const colors = {
      facebook: 'text-blue-600 bg-blue-50',
      instagram: 'text-pink-600 bg-pink-50',
      whatsapp: 'text-green-600 bg-green-50'
    };
    return (
      <div className={`p-2 rounded-lg ${colors[platform as keyof typeof colors]}`}>
        <Megaphone className="h-4 w-4" />
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone?.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesPlatform = platformFilter === 'all' || lead.platform === platformFilter;
    return matchesSearch && matchesStatus && matchesPlatform;
  });

  const statusCounts = leads.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <UserPlus className="h-8 w-8 text-blue-600" />
            Meta Leads
          </h1>
          <p className="text-gray-600 mt-1">
            Leads collected from Facebook & Instagram advertising campaigns
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="h-4 w-4" />
            Export
          </button>
          <button 
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Import Contacts
          </button>
          <button 
            onClick={handleSyncFromMeta}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync from Meta'}
          </button>
        </div>
      </div>

      {/* Info Banner about WhatsApp Contacts */}
      {leads.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-green-900 mb-1">
                Import Your WhatsApp Contacts
              </h3>
              <p className="text-sm text-green-800 mb-2">
                If you&apos;re running &ldquo;Click to WhatsApp&rdquo; ads, those contacts are in your WhatsApp Business app, not here.
              </p>
              <div className="text-xs text-green-700 space-y-1">
                <div><strong>Option 1:</strong> Click <strong>&ldquo;Import Contacts&rdquo;</strong> button above to manually add WhatsApp contacts to CRM</div>
                <div><strong>Option 2:</strong> Click <strong>&ldquo;Sync from Meta&rdquo;</strong> to get leads from lead form ads (if you have any)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600 text-sm mb-1">
            <Clock className="h-4 w-4" />
            New
          </div>
          <div className="text-2xl font-bold text-gray-900">{statusCounts.new || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-yellow-600 text-sm mb-1">
            <Phone className="h-4 w-4" />
            Contacted
          </div>
          <div className="text-2xl font-bold text-gray-900">{statusCounts.contacted || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-purple-600 text-sm mb-1">
            <UserCheck className="h-4 w-4" />
            Qualified
          </div>
          <div className="text-2xl font-bold text-gray-900">{statusCounts.qualified || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-green-600 text-sm mb-1">
            <CheckCircle2 className="h-4 w-4" />
            Converted
          </div>
          <div className="text-2xl font-bold text-gray-900">{statusCounts.converted || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-red-600 text-sm mb-1">
            <XCircle className="h-4 w-4" />
            Rejected
          </div>
          <div className="text-2xl font-bold text-gray-900">{statusCounts.rejected || 0}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Filter by status"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="converted">Converted</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Filter by platform"
          >
            <option value="all">All Platforms</option>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </div>
      </div>

      {/* Leads Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-2 bg-white p-12 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex flex-col items-center gap-2 text-gray-500">
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
              <p className="text-lg font-medium">Loading leads...</p>
            </div>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="col-span-2 bg-white p-12 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex flex-col items-center gap-2 text-gray-500">
              <UserPlus className="h-12 w-12 text-gray-300" />
              <p className="text-lg font-medium">No leads found</p>
              <p className="text-sm">Click &quot;Sync from Meta&quot; button above to import your leads</p>
            </div>
          </div>
        ) : (
          filteredLeads.map((lead) => (
            <div key={lead.id} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getPlatformIcon(lead.platform)}
                  <div>
                    <h3 className="font-semibold text-gray-900">{lead.full_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(lead.status)}
                      <span className="text-xs text-gray-500 capitalize">{lead.platform}</span>
                    </div>
                  </div>
                </div>
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  View
                </button>
              </div>

              <div className="space-y-2 mb-4">
                {lead.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4 text-gray-400" />
                    {lead.email}
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4 text-gray-400" />
                    {lead.phone}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  {formatDate(lead.created_time)}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <Megaphone className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">{lead.campaign_name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Tag className="h-3 w-3" />
                  {lead.ad_name}
                </div>
                {lead.assigned_to && (
                  <div className="mt-2 text-xs text-gray-500">
                    Assigned to: <span className="font-medium">{lead.assigned_to}</span>
                  </div>
                )}
              </div>

              {lead.status === 'new' && (
                <div className="mt-4 flex gap-2">
                  <button className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                    Contact Lead
                  </button>
                  <button className="px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
                    Assign
                  </button>
                </div>
              )}
              {lead.status === 'converted' && lead.customer_id && (
                <div className="mt-4">
                  <button className="w-full px-3 py-2 bg-green-50 text-green-700 text-sm rounded-lg hover:bg-green-100 transition-colors flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    View Customer Profile
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Upload className="h-6 w-6 text-blue-600" />
                    Import WhatsApp Contacts
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">Upload a CSV file with your WhatsApp contacts to add them as leads</p>
                </div>
                <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-blue-900 mb-2">How to Import</h3>
                    <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                      <li>Download the template CSV file below</li>
                      <li>Fill in your contact details (name, phone are required)</li>
                      <li>Upload the completed CSV file</li>
                      <li>Preview and confirm the import</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Download Template Button */}
              <div className="mb-6">
                <button 
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  Download Template CSV
                </button>
              </div>

              {/* File Upload */}
              <div className="mb-6">
                <label htmlFor="csv-upload" className="block text-sm font-medium text-gray-700 mb-2">
                  Upload CSV File
                </label>
                <input 
                  id="csv-upload"
                  type="file" 
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100
                    cursor-pointer"
                />
              </div>

              {/* Preview */}
              {importPreview.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Preview (first 5 rows)</h3>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {importPreview.map((row, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-900">{row.full_name}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{row.phone}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{row.email || '-'}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{row.campaign_name || 'Manual Import'}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{row.platform || 'whatsapp'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleImport}
                  disabled={!importFile || isImporting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Import Leads
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
