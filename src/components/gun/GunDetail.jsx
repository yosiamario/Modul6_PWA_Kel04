import { useState } from 'react'
import {
  ArrowLeft,
  Star,
  Send,
  Loader,
  ShoppingCart,
  Check,
  ThumbsUp,
  ThumbsDown,
  Edit3,
  Trash2,
  X,
} from 'lucide-react'
import FavoriteButton from '../common/FavoriteButton'
import ShareButton from '../common/ShareButton'
import { useReviews, useCreateReview, useUpdateReview, useDeleteReview } from '../../hooks/useReviews'
import { getUserIdentifier } from '../../services/userService'
import { formatPrice, averageRating } from '../../utils/helpers'
import ConfirmModal from '../modals/ConfirmModal'

/**
 * Full-screen product detail view.
 * Includes: share, cart, favorite, review CRUD, thumbs up/down.
 */
export default function GunDetail({ gun, onBack, onEdit, onDelete, onAddToCart, isInCart }) {
  const imgSrc = gun.image_url || gun.image || '/guns/pistol.svg'
  const category = gun.type || gun.category || '—'
  const caliber = gun.caliber || gun.difficulty || ''
  const price = gun.price ?? gun.cook_time ?? 0
  const currentUser = getUserIdentifier()

  // Reviews
  const { reviews, loading: reviewsLoading, voteReview, refetch: refetchReviews } = useReviews(gun.id)
  const { createReview, loading: submitting } = useCreateReview()
  const { updateReview, loading: updating } = useUpdateReview()
  const { deleteReview, loading: delReviewLoading } = useDeleteReview()

  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState('')

  // Edit review state
  const [editingReview, setEditingReview] = useState(null)
  const [editRating, setEditRating] = useState(5)
  const [editComment, setEditComment] = useState('')

  // Delete review confirm
  const [deleteReviewTarget, setDeleteReviewTarget] = useState(null)

  // Cart feedback
  const [cartAdded, setCartAdded] = useState(false)

  const avgRating = gun.average_rating || averageRating(reviews)
  const reviewCount = gun.review_count ?? reviews.length

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    setReviewError('')
    setReviewSuccess('')
    if (rating < 1 || rating > 5) {
      setReviewError('Rating must be between 1 and 5.')
      return
    }
    const result = await createReview(gun.id, {
      user_identifier: currentUser,
      rating,
      comment: comment.trim(),
    })
    if (result) {
      setReviewSuccess('Review submitted!')
      setComment('')
      setRating(5)
      refetchReviews()
      setTimeout(() => setReviewSuccess(''), 3000)
    } else {
      setReviewError('Could not submit review. The server may be unavailable.')
    }
  }

  const handleStartEdit = (rev) => {
    setEditingReview(rev.id)
    setEditRating(rev.rating)
    setEditComment(rev.comment || '')
  }

  const handleCancelEdit = () => {
    setEditingReview(null)
    setEditRating(5)
    setEditComment('')
  }

  const handleSaveEdit = async (reviewId) => {
    const result = await updateReview(reviewId, {
      rating: editRating,
      comment: editComment.trim(),
    })
    if (result) {
      setEditingReview(null)
      refetchReviews()
    }
  }

  const handleConfirmDeleteReview = async () => {
    if (!deleteReviewTarget) return
    const ok = await deleteReview(deleteReviewTarget)
    if (ok) {
      setDeleteReviewTarget(null)
      refetchReviews()
    }
  }

  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(gun)
      setCartAdded(true)
      setTimeout(() => setCartAdded(false), 2000)
    }
  }

  const isOwner = (rev) => {
    const revUser = rev.user_id || rev.user_identifier || ''
    return (
      String(revUser) === String(currentUser) ||
      String(revUser).includes(String(currentUser).substring(0, 8))
    )
  }

  return (
    <div className="detail">
      {/* Back button */}
      <button type="button" className="detail-back" onClick={onBack}>
        <ArrowLeft size={18} /> Back to Catalog
      </button>

      {/* Hero */}
      <div className="detail-hero">
        <img className="detail-img" src={imgSrc} alt={gun.name} loading="lazy" />
        <div className="detail-info">
          <h1 className="display">{gun.name}</h1>
          <p className="type">
            {category}
            {caliber ? ` · ${caliber}` : ''}
          </p>
          <p className="price detail-price">{formatPrice(price)}</p>
          {avgRating > 0 && (
            <p className="detail-rating">
              <Star size={16} fill="var(--brass)" stroke="var(--brass)" />
              {avgRating.toFixed(1)} ({reviewCount} review{reviewCount !== 1 ? 's' : ''})
            </p>
          )}
          <div className="detail-actions">
            <FavoriteButton gunId={gun.id || gun.name} />
            <ShareButton gun={gun} />
            {onAddToCart && (
              <button
                type="button"
                className={`btn ${isInCart || cartAdded ? 'btn--outline' : 'btn--primary'} btn--sm`}
                onClick={handleAddToCart}
              >
                {isInCart || cartAdded ? (
                  <><Check size={16} /> In Cart</>
                ) : (
                  <><ShoppingCart size={16} /> Add to Cart</>
                )}
              </button>
            )}
            {onEdit && (
              <button type="button" className="btn btn--outline" onClick={() => onEdit(gun)}>
                Edit
              </button>
            )}
            {onDelete && (
              <button type="button" className="btn btn--danger" onClick={() => onDelete(gun)}>
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <section className="detail-section">
        <h2>Description</h2>
        <p>{gun.description || 'No description available.'}</p>
      </section>

      {/* Specifications */}
      {gun.ingredients && gun.ingredients.length > 0 && (
        <section className="detail-section">
          <h2>Specifications</h2>
          <ul className="detail-specs">
            {gun.ingredients.map((ing, i) => (
              <li key={ing.id || i}>
                <strong>{ing.name}</strong> — {ing.quantity}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Steps */}
      {gun.steps && gun.steps.length > 0 && (
        <section className="detail-section">
          <h2>Assembly / Maintenance Steps</h2>
          <ol className="detail-steps">
            {gun.steps.map((step, i) => (
              <li key={step.id || i}>{step.instruction || step}</li>
            ))}
          </ol>
        </section>
      )}

      {/* Reviews Section */}
      <section className="detail-section">
        <h2>Reviews</h2>

        {/* Submit new review */}
        <form className="review-form" onSubmit={handleSubmitReview}>
          <div className="review-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className="star-btn"
                onClick={() => setRating(n)}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
              >
                <Star
                  size={22}
                  fill={n <= rating ? 'var(--brass)' : 'none'}
                  stroke={n <= rating ? 'var(--brass)' : 'var(--steel)'}
                />
              </button>
            ))}
          </div>
          <textarea
            className="review-input"
            rows="3"
            placeholder="Write a short review (optional)…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
          />
          <button
            type="submit"
            className="btn btn--primary"
            disabled={submitting || !gun.id}
          >
            {submitting ? (
              <><Loader size={16} className="spin" /> Submitting…</>
            ) : (
              <><Send size={16} /> Submit Review</>
            )}
          </button>
          {reviewError && <p className="form-error">{reviewError}</p>}
          {reviewSuccess && <p className="form-success">{reviewSuccess}</p>}
          {!gun.id && (
            <p className="form-hint">
              Reviews require a server-generated product ID. This product is local-only.
            </p>
          )}
        </form>

        {/* Existing reviews */}
        {reviewsLoading ? (
          <p className="detail-loading">Loading reviews…</p>
        ) : reviews.length > 0 ? (
          <ul className="review-list">
            {reviews.map((rev) => (
              <li key={rev.id} className="review-item">
                {editingReview === rev.id ? (
                  /* ---- Editing mode ---- */
                  <div className="review-edit-form">
                    <div className="review-stars">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          className="star-btn"
                          onClick={() => setEditRating(n)}
                        >
                          <Star
                            size={18}
                            fill={n <= editRating ? 'var(--brass)' : 'none'}
                            stroke={n <= editRating ? 'var(--brass)' : 'var(--steel)'}
                          />
                        </button>
                      ))}
                    </div>
                    <textarea
                      className="review-input"
                      rows="2"
                      value={editComment}
                      onChange={(e) => setEditComment(e.target.value)}
                      maxLength={500}
                    />
                    <div className="review-edit-actions">
                      <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        onClick={() => handleSaveEdit(rev.id)}
                        disabled={updating}
                      >
                        {updating ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        className="btn btn--outline btn--sm"
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ---- Display mode ---- */
                  <>
                    <div className="review-head">
                      <span className="review-user">{rev.user_identifier || 'Anonymous'}</span>
                      <span className="review-stars-display">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            size={14}
                            fill={i < rev.rating ? 'var(--brass)' : 'none'}
                            stroke={i < rev.rating ? 'var(--brass)' : 'var(--line)'}
                          />
                        ))}
                      </span>
                    </div>
                    {rev.comment && <p className="review-comment">{rev.comment}</p>}

                    {/* Thumbs + CRUD actions */}
                    <div className="review-bottom">
                      <div className="review-thumbs">
                        <button
                          type="button"
                          className={`thumb-btn${rev.user_vote === 'up' ? ' thumb-btn--active' : ''}`}
                          onClick={() => voteReview(rev.id, 'up')}
                          title="Helpful"
                        >
                          <ThumbsUp size={14} /> <span>{rev.thumbs_up || 0}</span>
                        </button>
                        <button
                          type="button"
                          className={`thumb-btn thumb-btn--down${rev.user_vote === 'down' ? ' thumb-btn--active' : ''}`}
                          onClick={() => voteReview(rev.id, 'down')}
                          title="Not helpful"
                        >
                          <ThumbsDown size={14} /> <span>{rev.thumbs_down || 0}</span>
                        </button>
                      </div>

                      {isOwner(rev) && (
                        <div className="review-crud">
                          <button
                            type="button"
                            className="review-crud-btn"
                            onClick={() => handleStartEdit(rev)}
                            title="Edit review"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            className="review-crud-btn review-crud-btn--danger"
                            onClick={() => setDeleteReviewTarget(rev.id)}
                            title="Delete review"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="detail-empty">No reviews yet. Be the first!</p>
        )}
      </section>

      {/* Delete review confirmation */}
      <ConfirmModal
        open={Boolean(deleteReviewTarget)}
        title="Delete Review"
        message="Are you sure you want to delete this review?"
        confirmLabel="Delete"
        danger
        loading={delReviewLoading}
        onConfirm={handleConfirmDeleteReview}
        onCancel={() => setDeleteReviewTarget(null)}
      />
    </div>
  )
}
