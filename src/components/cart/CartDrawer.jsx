import { X, Minus, Plus, ShoppingCart, Trash2, MessageCircle } from 'lucide-react'
import { formatPrice } from '../../utils/helpers'

// ⚠️ Ganti dengan nomor WhatsApp kamu (format: 628xxxxxxxxxx)
const WA_NUMBER = '6281329210093'

/**
 * CartDrawer — Slide-in panel showing cart items.
 * Checkout redirects to WhatsApp with a formatted order message.
 */
export default function CartDrawer({
  items,
  onUpdateQuantity,
  onRemove,
  onClear,
  total,
  isOpen,
  onClose,
}) {
  const handleCheckout = () => {
    if (items.length === 0) return

    let message = 'Hi, aku mau pesan:\n\n'
    items.forEach((item, i) => {
      const subtotal = (Number(item.price) || 0) * item.quantity
      message += `${i + 1}. ${item.name} (x${item.quantity}) - ${formatPrice(subtotal)}\n`
    })
    message += `\nTotal: ${formatPrice(total)}\n\nTerima kasih!`

    const encoded = encodeURIComponent(message)
    window.open(`https://wa.me/${WA_NUMBER}?text=${encoded}`, '_blank')
  }

  if (!isOpen) return null

  return (
    <div className="cart-backdrop" onClick={onClose}>
      <aside
        className="cart-drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping Cart"
      >
        {/* Header */}
        <div className="cart-header">
          <h2 className="cart-title">
            <ShoppingCart size={20} /> Cart
            <span className="cart-header-count">({items.length})</span>
          </h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close cart">
            <X size={18} />
          </button>
        </div>

        {/* Empty state */}
        {items.length === 0 ? (
          <div className="cart-empty">
            <ShoppingCart size={36} stroke="var(--steel)" />
            <p>Your cart is empty</p>
            <button type="button" className="btn btn--outline btn--sm" onClick={onClose}>
              Browse Catalog
            </button>
          </div>
        ) : (
          <>
            {/* Item list */}
            <ul className="cart-items">
              {items.map((item) => (
                <li key={item.id} className="cart-item">
                  <img
                    src={item.image_url || '/guns/pistol.svg'}
                    alt={item.name}
                    className="cart-item-img"
                  />
                  <div className="cart-item-info">
                    <span className="cart-item-name">{item.name}</span>
                    <span className="cart-item-meta">
                      {item.type}
                      {item.caliber ? ` · ${item.caliber}` : ''}
                    </span>
                    <span className="cart-item-price">
                      {formatPrice((Number(item.price) || 0) * item.quantity)}
                    </span>
                  </div>
                  <div className="cart-item-qty">
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      aria-label="Decrease"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="qty-val">{item.quantity}</span>
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      aria-label="Increase"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="cart-item-remove"
                    onClick={() => onRemove(item.id)}
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>

            {/* Footer */}
            <div className="cart-footer">
              <div className="cart-total-row">
                <span>Total</span>
                <span className="price">{formatPrice(total)}</span>
              </div>
              <button
                type="button"
                className="btn btn--primary cart-checkout-btn"
                onClick={handleCheckout}
              >
                <MessageCircle size={16} /> Checkout via WhatsApp
              </button>
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={onClear}
                style={{ width: '100%' }}
              >
                Clear Cart
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
