import { useEffect, useState } from 'react'
import axios from 'axios'

// Generic fetch hook - handles loading and error state
export function useFetch<T>(url: string) {
  const [data, setData]       = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    axios
      .get<T>(url)
      .then(res => setData(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [url])

  return { data, loading, error }
}
