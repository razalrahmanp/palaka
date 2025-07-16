// hooks/useNextId.ts
import { useState, useEffect } from 'react'

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
    const fetchNextId = async () => {
      try {
        const response = await fetch(`/api/${table}/next-id?column=${idColumn}&name=${name}`)
        if (!response.ok) {
          throw new Error('Failed to fetch next ID')
        }
        const data = await response.json()
        if (!canceled) setId(data.nextId)
      } catch (err) {
        if (!canceled) setError(err as Error)
      } finally {
        if (!canceled) setLoading(false)
      }
    }
    fetchNextId()

    return () => {
      canceled = true
    }
  }, [table, idColumn, name])

  return { id, loading, error }
}



