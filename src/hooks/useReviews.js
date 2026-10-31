import { useState, useEffect, useCallback } from 'react'
import reviewService from '../services/reviewService'
import { getCached, setCache, invalidateCache } from '../utils/queryCache'

// ---------------------------------------------------------------------------
// Helpers for local review votes (thumbs up / thumbs down)
// ---------------------------------------------------------------------------
const VOTES_STORAGE_KEY = 'gunshop_review_votes'

function getStoredVotes() {
  try {
    const raw = localStorage.getItem(VOTES_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveStoredVotes(votes) {
  try {
    localStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify(votes))
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// useReviews — fetch reviews with query caching and thumbs up/down voting
// ---------------------------------------------------------------------------
export function useReviews(gunId) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [votes, setVotes] = useState(getStoredVotes)

  const cacheKey = gunId ? `reviews_${gunId}` : null

  const fetchReviews = useCallback(async (ignoreCache = false) => {
    if (!gunId) {
      setLoading(false)
      return
    }

    // Check query cache first if not ignoring
    if (!ignoreCache && cacheKey) {
      const cached = getCached(cacheKey)
      if (cached) {
        setReviews(cached)
        setLoading(false)
        return
      }
    }

    try {
      setLoading(true)
      setError(null)

      const response = await reviewService.getReviews(gunId)

      if (response.success) {
        const data = response.data || []
        setReviews(data)
        if (cacheKey) {
          setCache(cacheKey, data, 3 * 60 * 1000) // 3 min cache
        }
      } else {
        setError(response.message || 'Failed to fetch reviews.')
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching reviews.')
      setReviews([])
    } finally {
      setLoading(false)
    }
  }, [gunId, cacheKey])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  // Voting on a review (thumbs up / down)
  const voteReview = useCallback((reviewId, type) => {
    setVotes((prev) => {
      const current = prev[reviewId] || { up: 0, down: 0, userVote: null }
      let newUp = current.up || 0
      let newDown = current.down || 0
      let newUserVote = null

      if (current.userVote === type) {
        // Toggle off
        if (type === 'up') newUp = Math.max(0, newUp - 1)
        if (type === 'down') newDown = Math.max(0, newDown - 1)
        newUserVote = null
      } else {
        // Switching or new vote
        if (current.userVote === 'up') newUp = Math.max(0, newUp - 1)
        if (current.userVote === 'down') newDown = Math.max(0, newDown - 1)

        if (type === 'up') newUp += 1
        if (type === 'down') newDown += 1
        newUserVote = type
      }

      const updated = {
        ...prev,
        [reviewId]: { up: newUp, down: newDown, userVote: newUserVote },
      }
      saveStoredVotes(updated)
      return updated
    })
  }, [])

  // Merge thumbs into reviews
  const enrichedReviews = reviews.map((r) => {
    const v = votes[r.id] || { up: 0, down: 0, userVote: null }
    return {
      ...r,
      thumbs_up: v.up,
      thumbs_down: v.down,
      user_vote: v.userVote,
    }
  })

  return {
    reviews: enrichedReviews,
    loading,
    error,
    voteReview,
    refetch: () => fetchReviews(true),
  }
}

// ---------------------------------------------------------------------------
// useCreateReview — submit a new review
// ---------------------------------------------------------------------------
export function useCreateReview() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const createReview = async (gunId, reviewData) => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(false)

      const response = await reviewService.createReview(gunId, reviewData)

      if (response.success) {
        setSuccess(true)
        invalidateCache(`reviews_${gunId}`)
        return response.data
      } else {
        setError(response.message || 'Failed to submit review.')
        return null
      }
    } catch (err) {
      setError(err.message || 'An error occurred while submitting review.')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { createReview, loading, error, success }
}

// ---------------------------------------------------------------------------
// useUpdateReview — update an existing review (CRUD)
// ---------------------------------------------------------------------------
export function useUpdateReview() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const updateReview = async (reviewId, reviewData) => {
    try {
      setLoading(true)
      setError(null)

      const response = await reviewService.updateReview(reviewId, reviewData)
      if (response.success) {
        invalidateCache('reviews_')
        return response.data || true
      } else {
        setError(response.message || 'Failed to update review.')
        return null
      }
    } catch (err) {
      setError(err.message || 'An error occurred while updating review.')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { updateReview, loading, error }
}

// ---------------------------------------------------------------------------
// useDeleteReview — delete an existing review (CRUD)
// ---------------------------------------------------------------------------
export function useDeleteReview() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const deleteReview = async (reviewId) => {
    try {
      setLoading(true)
      setError(null)

      const response = await reviewService.deleteReview(reviewId)
      if (response.success) {
        invalidateCache('reviews_')
        return true
      } else {
        setError(response.message || 'Failed to delete review.')
        return false
      }
    } catch (err) {
      setError(err.message || 'An error occurred while deleting review.')
      return false
    } finally {
      setLoading(false)
    }
  }

  return { deleteReview, loading, error }
}
