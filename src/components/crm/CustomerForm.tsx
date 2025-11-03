'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, User, Mail, Phone, Tag, Users } from 'lucide-react';

interface CustomerFormProps {
    initialData?: {
        name?: string;
        email?: string;
        phone?: string;
        status?: string;
        source?: string;
        tags?: string[];
        assigned_sales_rep_id?: string;
    };
   onSubmit: (data: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    status: "Lead" | "Active" | "Churned" | "Closed";
    source: "Website" | "Referral" | "Trade Show";
    tags: string[];
    assigned_sales_rep_id?: string;
    }) => void | Promise<void>;
    onCancel: () => void;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({ initialData, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '', 
        email: '', 
        phone: '', 
        status: 'Lead', 
        source: 'Website', 
        tags: '',
        assigned_sales_rep_id: 'unassigned'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch sales representatives
    const { data: salesReps = [] } = useQuery({
        queryKey: ['sales-reps'],
        queryFn: async () => {
            const res = await fetch('/api/users?role=sales');
            if (!res.ok) throw new Error('Failed to fetch sales reps');
            const data = await res.json();
            // Sort by name in ascending order
            return data.sort((a: { name: string }, b: { name: string }) => 
                a.name.localeCompare(b.name)
            );
        },
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                email: initialData.email || '',
                phone: initialData.phone || '',
                status: initialData.status || 'Lead',
                source: initialData.source || 'Website',
                tags: (initialData.tags || []).join(', '),
                assigned_sales_rep_id: initialData.assigned_sales_rep_id || 'unassigned',
            });
        } else {
             setFormData({ 
                name: '', 
                email: '', 
                phone: '', 
                status: 'Lead', 
                source: 'Website', 
                tags: '',
                assigned_sales_rep_id: 'unassigned'
            });
        }
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSelectChange = (name: string, value: string) => setFormData(prev => ({ ...prev, [name]: value }));
    
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSubmit({
                ...formData,
                status: formData.status as "Lead" | "Active" | "Churned" | "Closed",
                source: formData.source as "Website" | "Referral" | "Trade Show",
                tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
                assigned_sales_rep_id: formData.assigned_sales_rep_id && formData.assigned_sales_rep_id !== 'unassigned' ? formData.assigned_sales_rep_id : undefined,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                    <User className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-semibold text-gray-700">Personal Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                            Full Name <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input 
                                id="name" 
                                name="name" 
                                value={formData.name} 
                                onChange={handleChange} 
                                required 
                                className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                placeholder="Enter customer name"
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                            Phone Number
                        </Label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input 
                                id="phone" 
                                name="phone" 
                                value={formData.phone} 
                                onChange={handleChange}
                                className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                placeholder="Enter phone number"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                        Email Address
                    </Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input 
                            id="email" 
                            name="email" 
                            type="email" 
                            value={formData.email} 
                            onChange={handleChange}
                            className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            placeholder="customer@example.com"
                        />
                    </div>
                </div>
            </div>

            {/* Customer Status Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                    <Tag className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-semibold text-gray-700">Customer Status</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Status</Label>
                        <Select 
                            name="status" 
                            value={formData.status} 
                            onValueChange={(v) => handleSelectChange('status', v)}
                        >
                            <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Active">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                        Active
                                    </div>
                                </SelectItem>
                                <SelectItem value="Churned">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-red-500"></div>
                                        Churned
                                    </div>
                                </SelectItem>
                                <SelectItem value="Closed">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-gray-500"></div>
                                        Closed
                                    </div>
                                </SelectItem>
                                <SelectItem value="Lead">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                                        Lead
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Source</Label>
                        <Select 
                            name="source" 
                            value={formData.source} 
                            onValueChange={(v) => handleSelectChange('source', v)}
                        >
                            <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Referral">👥 Referral</SelectItem>
                                <SelectItem value="Trade Show">🏢 Trade Show</SelectItem>
                                <SelectItem value="Website">� Website</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Assignment Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                    <Users className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-semibold text-gray-700">Assignment</h3>
                </div>
                
                <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Assigned Sales Representative</Label>
                    <Select 
                        value={formData.assigned_sales_rep_id} 
                        onValueChange={(v) => handleSelectChange('assigned_sales_rep_id', v)}
                    >
                        <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder="Select sales representative" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="unassigned">
                                <div className="flex items-center gap-2 text-gray-500">
                                    <User className="h-3 w-3" />
                                    None (Unassigned)
                                </div>
                            </SelectItem>
                            {salesReps.map((rep: { id: string; name: string }) => (
                                <SelectItem key={rep.id} value={rep.id}>
                                    <div className="flex items-center gap-2">
                                        <User className="h-3 w-3 text-blue-600" />
                                        {rep.name}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                        <span className="text-blue-600">ℹ️</span>
                        Assign a sales rep to manage this customer relationship
                    </p>
                </div>
            </div>

            {/* Tags Section */}
            <div className="space-y-2">
                <Label htmlFor="tags" className="text-sm font-medium text-gray-700">Tags</Label>
                <div className="relative">
                    <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                        id="tags" 
                        name="tags" 
                        value={formData.tags} 
                        onChange={handleChange}
                        className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="e.g., Furniture Purchase, VIP, Premium"
                    />
                </div>
                <p className="text-xs text-gray-500">Separate multiple tags with commas</p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <Button 
                    type="button" 
                    variant="outline" 
                    onClick={onCancel} 
                    disabled={isSubmitting}
                    className="min-w-[100px] border-gray-300 hover:bg-gray-50"
                >
                    Cancel
                </Button>
                <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="min-w-[140px] bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <User className="mr-2 h-4 w-4" />
                            Save Customer
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
};
