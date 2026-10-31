import { useState, useEffect, useCallback } from 'react'
import gunService from '../services/gunService'
import { getCached, setCache } from '../utils/queryCache'

// ---------------------------------------------------------------------------
// useGuns — fetch the paginated / filtered product list with Query Caching.
//
// Returns { guns, loading, error, pagination, refetch }.
// ---------------------------------------------------------------------------

export function useGuns(params = {}) {
  const [guns, setGuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState(null)

  // Serialise params so the effect re-runs when they change.
  const paramKey = JSON.stringify(params)
  const cacheKey = `guns_${paramKey}`

  const fetchGuns = useCallback(async (ignoreCache = false) => {
    // Check query cache first
    if (!ignoreCache) {
      const cached = getCached(cacheKey)
      if (cached) {
        setGuns(cached.data || [])
        setPagination(cached.pagination || null)
        setLoading(false)
        return
      }
    }

    try {
      setLoading(true)
      setError(null)

      const response = await gunService.getGuns(params)

      if (response.success) {
        const data = response.data || []
        const pag = response.pagination || null
        setGuns(data)
        setPagination(pag)
        setCache(cacheKey, { data, pagination: pag }, 5 * 60 * 1000) // 5 minutes TTL
      } else {
        setError(response.message || 'Failed to fetch products.')
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching products.')
      setGuns([])
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramKey, cacheKey])

  useEffect(() => {
    fetchGuns()
  }, [fetchGuns])

  return { guns, loading, error, pagination, refetch: () => fetchGuns(true) }
}

// ---------------------------------------------------------------------------
// useGunById — fetch a single product by its UUID with Query Caching.
//
// Returns { gun, loading, error, refetch }.
// ---------------------------------------------------------------------------

export function useGunById(id) {
  const [gun, setGun] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const cacheKey = id ? `gun_${id}` : null

  const fetchGun = useCallback(async (ignoreCache = false) => {
    if (!id) {
      setLoading(false)
      return
    }

    if (!ignoreCache && cacheKey) {
      const cached = getCached(cacheKey)
      if (cached) {
        setGun(cached)
        setLoading(false)
        return
      }
    }

    try {
      setLoading(true)
      setError(null)

      const response = await gunService.getGunById(id)

      if (response.success) {
        setGun(response.data)
        if (cacheKey) {
          setCache(cacheKey, response.data, 5 * 60 * 1000)
        }
      } else {
        setError(response.message || 'Product not found.')
      }
    } catch (err) {
      setError(err.message || 'Failed to load product details.')
      setGun(null)
    } finally {
      setLoading(false)
    }
  }, [id, cacheKey])

  useEffect(() => {
    fetchGun()
  }, [fetchGun])

  return { gun, loading, error, refetch: () => fetchGun(true) }
}
