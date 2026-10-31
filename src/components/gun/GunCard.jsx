import FavoriteButton from '../common/FavoriteButton'
import ShareButton from '../common/ShareButton'
import { formatPrice, truncate } from '../../utils/helpers'
import { ShoppingCart, Check } from 'lucide-react'

/**
 * Product card used in the catalog grid.
 * Now includes Share link button and Add-to-Cart button.
 */
export default function GunCard({ gun, onSelect, onEdit, onDelete, onAddToCart, isInCart }) {
  const imgSrc = gun.image_url || gun.image || '/guns/pistol.svg'
  const category = gun.type || gun.category || '—'
  const caliber = gun.caliber || gun.difficulty || ''
  const price = gun.price ?? gun.cook_time ?? 0

  return (
    <li className="card">
      <button
        type="button"
        className="card-btn"
        onClick={() => onSelect(gun)}
        aria-label={`View ${gun.name}`}
      >
        <img
          className="card-img"
          src={imgSrc}
          alt={gun.name}
          width="240"
          height="180"
          loading="lazy"
        />
        <span className="name display">{gun.name}</span>
        <span className="type">
          {category}
          {caliber ? ` · ${caliber}` : ''}
        </span>
        {gun.description && (
          <span className="card-desc">{truncate(gun.description, 72)}</span>
        )}
        <span className="price">{formatPrice(price)}</span>
      </button>

      {/* Floating actions row */}
      <div className="card-actions">
        <FavoriteButton gunId={gun.id || gun.name} />
        <ShareButton gun={gun} size={15} />
        {onAddToCart && (
          <button
            type="button"
            className={`card-act-btn${isInCart ? ' card-act-btn--in-cart' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              onAddToCart(gun)
            }}
            aria-label={isInCart ? 'Already in cart' : `Add ${gun.name} to cart`}
            title={isInCart ? 'In cart' : 'Add to cart'}
          >
            {isInCart ? <Check size={14} /> : <ShoppingCart size={14} />}
          </button>
        )}
        {onEdit && (
          <button
            type="button"
            className="card-act-btn"
            onClick={(e) => { e.stopPropagation(); onEdit(gun) }}
            aria-label={`Edit ${gun.name}`}
            title="Edit"
          >
            ✏️
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            className="card-act-btn card-act-btn--danger"
            onClick={(e) => { e.stopPropagation(); onDelete(gun) }}
            aria-label={`Delete ${gun.name}`}
            title="Delete"
          >
            🗑️
          </button>
        )}
      </div>
    </li>
  )
}
