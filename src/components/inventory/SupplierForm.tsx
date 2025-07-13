'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Supplier } from '@/types';

interface SupplierFormProps {

  onSubmit: (s: Omit<Supplier, 'id'>) => void;
  onCancel: () => void;
}

export const SupplierForm: React.FC<SupplierFormProps> = ({ onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSubmit({ name, contact });
      }}
      className="space-y-4 py-4"
    >
      <div>
        <Label>Name</Label>
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Supplier name"
          required
        />
      </div>
      <div>
        <Label>Contact Info</Label>
        <Input
          value={contact}
          onChange={e => setContact(e.target.value)}
          placeholder="Email or phone"
        />
      </div>
      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Add Supplier</Button>
      </div>
    </form>
  );
};
