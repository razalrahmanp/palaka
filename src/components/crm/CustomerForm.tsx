'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const CustomerForm = ({ initialData, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', status: 'Lead', source: 'Website', tags: ''
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
            });
        } else {
             setFormData({ name: '', email: '', phone: '', status: 'Lead', source: 'Website', tags: '' });
        }
    }, [initialData]);

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSelectChange = (name, value) => setFormData(prev => ({ ...prev, [name]: value }));
    
    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div><Label htmlFor="name">Name</Label><Input id="name" name="name" value={formData.name} onChange={handleChange} required /></div>
                <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required /></div>
            </div>
            <div><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" value={formData.phone} onChange={handleChange} /></div>
            <div className="grid grid-cols-2 gap-4">
                <div><Label>Status</Label><Select name="status" value={formData.status} onValueChange={(v) => handleSelectChange('status', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Lead">Lead</SelectItem><SelectItem value="Active">Active</SelectItem><SelectItem value="Churned">Churned</SelectItem></SelectContent></Select></div>
                <div><Label>Source</Label><Select name="source" value={formData.source} onValueChange={(v) => handleSelectChange('source', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Website">Website</SelectItem><SelectItem value="Referral">Referral</SelectItem><SelectItem value="Trade Show">Trade Show</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label htmlFor="tags">Tags (comma-separated)</Label><Input id="tags" name="tags" value={formData.tags} onChange={handleChange} /></div>
            <div className="flex justify-end space-x-2 pt-4"><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit">Save Customer</Button></div>
        </form>
    );
};
