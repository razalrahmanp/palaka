// hooks/useNextId.ts
import { useState, useEffect } from 'react'
import { nextId } from '@/lib/idGenerator'

export function useNextId(
  table: string,
  idColumn: string,
  name: string
): { id: string | null; loading: boolean; error: Error | null } {
  const [id, setId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let canceled = false
    setLoading(true)
    nextId(table, idColumn, name)
      .then(newId => {
        if (!canceled) setId(newId)
      })
      .catch(err => {
        if (!canceled) setError(err)
      })
      .finally(() => {
        if (!canceled) setLoading(false)
      })

    return () => {
      canceled = true
    }
  }, [table, idColumn, name])

  return { id, loading, error }
}
