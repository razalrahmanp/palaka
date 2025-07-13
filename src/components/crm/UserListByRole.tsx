'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { User } from '@/types'

interface Props {
  role: string
  onSelectUser?: (userId: string) => void
}

export const UserListByRole: React.FC<Props> = ({ role, onSelectUser }) => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(`/api/users?role=${role}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to fetch users')
        setUsers(data)
      } catch (error) {
        toast.error('Error fetching users')
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [role])

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No users found for role: <strong>{role}</strong>
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {users.map((user) => (
        <Card
          key={user.id}
          className="p-4 cursor-pointer hover:bg-muted transition rounded-xl"
          onClick={() => onSelectUser?.(user.id)}
        >
          <CardContent className="flex items-center gap-4 p-0 flex-wrap sm:flex-nowrap">
            <Avatar>
              <AvatarFallback>{user.email.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user.email}</p>
              <p className="text-xs text-muted-foreground truncate">
                Joined: {user.created_at?.split('T')[0]}
              </p>
            </div>

            <Badge className="text-xs whitespace-nowrap">{user.role}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
