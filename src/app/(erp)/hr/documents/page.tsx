'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, FileText, CheckCircle, AlertTriangle, FolderOpen, File, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format, isAfter, isBefore } from 'date-fns';

interface Employee {
  id: string;
  name: string;
  employee_id: string;
  department: string;
  position: string;
}

interface EmployeeDocument {
  id: string;
  employee_id: string;
  document_type: string;
  document_name: string;
  file_url: string;
  expiry_date: string;
  is_verified: boolean;
  verified_at: string;
  created_at: string;
  employee: Employee;
  verifier?: {
    id: string;
    full_name: string;
  };
}

const DOCUMENT_TYPES = [
  'Aadhaar Card',
  'PAN Card',
  'Passport',
  'Driving License',
  'Educational Certificate',
  'Experience Letter',
  'Relieving Letter',
  'Bank Statement',
  'Address Proof',
  'Medical Certificate',
  'Police Verification',
  'Offer Letter',
  'Joining Letter',
  'Other',
];

export default function DocumentsManagementPage() {
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterVerified, setFilterVerified] = useState('ALL');

  const [formData, setFormData] = useState({
    employee_id: '',
    document_type: '',
    document_name: '',
    file_url: '',
    expiry_date: '',
  });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchDocuments(),
        fetchEmployees(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/hr/employee-documents');
      if (!response.ok) throw new Error('Failed to fetch documents');
      const result = await response.json();
      setDocuments(result.data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load documents');
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/hr/employees');
      if (!response.ok) throw new Error('Failed to fetch employees');
      const data = await response.json();
      setEmployees(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/hr/employee-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save document');

      toast.success('Document uploaded successfully');
      setIsDialogOpen(false);
      resetForm();
      fetchDocuments();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to save document');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyDocument = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/hr/employee-documents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_verified: true }),
      });

      if (!response.ok) throw new Error('Failed to verify document');

      toast.success('Document verified successfully');
      fetchDocuments();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to verify document');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/hr/employee-documents?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete document');

      toast.success('Document deleted successfully');
      fetchDocuments();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to delete document');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      document_type: '',
      document_name: '',
      file_url: '',
      expiry_date: '',
    });
  };

  const getStatusBadge = (doc: EmployeeDocument) => {
    if (doc.is_verified) {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      );
    }

    if (doc.expiry_date) {
      const expiryDate = new Date(doc.expiry_date);
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);

      if (isBefore(expiryDate, today)) {
        return (
          <Badge className="bg-red-100 text-red-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        );
      } else if (isBefore(expiryDate, thirtyDaysFromNow)) {
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Expiring Soon
          </Badge>
        );
      }
    }

    return (
      <Badge className="bg-gray-100 text-gray-800">
        Pending Verification
      </Badge>
    );
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.document_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.document_type.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'ALL' || doc.document_type === filterType;
    
    const matchesVerified =
      filterVerified === 'ALL' ||
      (filterVerified === 'VERIFIED' && doc.is_verified) ||
      (filterVerified === 'UNVERIFIED' && !doc.is_verified);

    return matchesSearch && matchesType && matchesVerified;
  });

  const stats = {
    totalDocuments: documents.length,
    verified: documents.filter(d => d.is_verified).length,
    expired: documents.filter(d => d.expiry_date && isBefore(new Date(d.expiry_date), new Date())).length,
    expiringSoon: documents.filter(d => {
      if (!d.expiry_date) return false;
      const expiryDate = new Date(d.expiry_date);
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      return isAfter(expiryDate, today) && isBefore(expiryDate, thirtyDaysFromNow);
    }).length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Documents Management
            </h1>
            <p className="text-gray-600 mt-2">Manage employee documents, certificates, and verification</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-cyan-600">
                <Plus className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Upload Employee Document</DialogTitle>
                <DialogDescription>Upload and track employee documents</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveDocument} className="space-y-4">
                <div>
                  <Label>Employee</Label>
                  <Select
                    value={formData.employee_id}
                    onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name} ({emp.employee_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Document Type</Label>
                  <Select
                    value={formData.document_type}
                    onValueChange={(value) => setFormData({ ...formData, document_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Document Name</Label>
                  <Input
                    value={formData.document_name}
                    onChange={(e) => setFormData({ ...formData, document_name: e.target.value })}
                    placeholder="e.g., Aadhaar Card - Front"
                    required
                  />
                </div>

                <div>
                  <Label>File URL</Label>
                  <Input
                    value={formData.file_url}
                    onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                    placeholder="https://example.com/document.pdf"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Upload file to storage first, then paste the URL here
                  </p>
                </div>

                <div>
                  <Label>Expiry Date (if applicable)</Label>
                  <Input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    Upload Document
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <FolderOpen className="h-5 w-5 text-blue-600 mr-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.totalDocuments}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Verified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.verified}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Expired</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.expired}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Expiring Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-yellow-600 mr-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.expiringSoon}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Employee Documents</CardTitle>
              <CardDescription>Track and verify employee documentation</CardDescription>
            </div>
            <div className="flex gap-3">
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterVerified} onValueChange={setFilterVerified}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="VERIFIED">Verified</SelectItem>
                  <SelectItem value="UNVERIFIED">Unverified</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Document Type</TableHead>
                <TableHead>Document Name</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded On</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{doc.employee.name}</div>
                      <div className="text-xs text-gray-500">{doc.employee.employee_id}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{doc.document_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <File className="h-4 w-4 mr-2 text-gray-500" />
                      {doc.document_name}
                    </div>
                  </TableCell>
                  <TableCell>
                    {doc.expiry_date ? format(new Date(doc.expiry_date), 'MMM dd, yyyy') : '-'}
                  </TableCell>
                  <TableCell>{getStatusBadge(doc)}</TableCell>
                  <TableCell>{format(new Date(doc.created_at), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(doc.file_url, '_blank')}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      {!doc.is_verified && (
                        <Button
                          size="sm"
                          className="bg-green-600"
                          onClick={() => handleVerifyDocument(doc.id)}
                        >
                          Verify
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteDocument(doc.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
