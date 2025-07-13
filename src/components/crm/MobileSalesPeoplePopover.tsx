'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { UserListByRole } from '@/components/crm/UserListByRole';
import { Users2 } from 'lucide-react';

export function MobileSalespeoplePopover({
  onSelectUser,
}: {
  onSelectUser: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full">
          <Users2 className="mr-2 h-4 w-4" />
          Filter by Salesperson
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2">
        <UserListByRole
          role="roles.name"
          onSelectUser={(id) => {
            onSelectUser(id);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
