// ---------------------------------------------------------------------------
// queryCache.js — Simple in-memory query cache with TTL.
// Prevents redundant API calls for recently fetched data.
// ---------------------------------------------------------------------------

const cache = new Map()
const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Retrieve cached data by key. Returns null if missing or expired.
 */
export const getCached = (key) => {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiry) {
    cache.delete(key)
    return null
  }
  return entry.data
}

/**
 * Store data in cache with a TTL.
 */
export const setCache = (key, data, ttl = DEFAULT_TTL) => {
  cache.set(key, { data, expiry: Date.now() + ttl })
}

/**
 * Invalidate cache entries matching a pattern string.
 * If no pattern, clears everything.
 */
export const invalidateCache = (pattern) => {
  if (!pattern) {
    cache.clear()
    return
  }
  for (const key of cache.keys()) {
    if (key.includes(pattern)) cache.delete(key)
  }
}

/**
 * Clear all cached data.
 */
export const clearCache = () => cache.clear()

/**
 * Return the number of active cache entries.
 */
export const cacheSize = () => cache.size
