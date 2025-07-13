'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export const InteractionLogForm = ({ onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({ type: 'Email', notes: '' });
    const handleChange = (e) => setFormData(prev => ({...prev, [e.target.name]: e.target.value}));
    const handleSelectChange = (value) => setFormData(prev => ({...prev, type: value}));
    const handleSubmit = (e) => { e.preventDefault(); onSubmit(formData); };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div><Label>Type</Label><Select value={formData.type} onValueChange={handleSelectChange}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Email">Email</SelectItem><SelectItem value="Call">Call</SelectItem><SelectItem value="Meeting">Meeting</SelectItem></SelectContent></Select></div>
            <div><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} required /></div>
            <div className="flex justify-end space-x-2 pt-4"><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit">Log Interaction</Button></div>
        </form>
    );
};
