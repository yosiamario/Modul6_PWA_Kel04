import { useState, useCallback } from 'react'

// ---------------------------------------------------------------------------
// useCart — Shopping cart backed by localStorage.
// ---------------------------------------------------------------------------

const CART_KEY = 'bore_barrel_cart'

const readCart = () => {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]')
  } catch {
    return []
  }
}

const writeCart = (items) => {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items))
  } catch { /* quota exceeded */ }
}

export function useCart() {
  const [items, setItems] = useState(readCart)

  const sync = useCallback((updater) => {
    setItems((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      writeCart(next)
      return next
    })
  }, [])

  const addToCart = useCallback((gun, quantity = 1) => {
    sync((current) => {
      const copy = [...current]
      const idx = copy.findIndex((i) => String(i.id) === String(gun.id))
      if (idx >= 0) {
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + quantity }
      } else {
        copy.push({
          id: gun.id,
          name: gun.name,
          type: gun.type || gun.category || '',
          caliber: gun.caliber || '',
          price: Number(gun.price ?? gun.cook_time ?? 0),
          image_url: gun.image_url || gun.image || '/guns/pistol.svg',
          quantity,
        })
      }
      return copy
    })
  }, [sync])

  const removeFromCart = useCallback((gunId) => {
    sync((current) => current.filter((i) => String(i.id) !== String(gunId)))
  }, [sync])

  const updateQuantity = useCallback((gunId, quantity) => {
    sync((current) => {
      if (quantity <= 0) return current.filter((i) => String(i.id) !== String(gunId))
      return current.map((i) =>
        String(i.id) === String(gunId) ? { ...i, quantity } : i,
      )
    })
  }, [sync])

  const clearCart = useCallback(() => sync([]), [sync])

  const isInCart = useCallback(
    (gunId) => items.some((i) => String(i.id) === String(gunId)),
    [items],
  )

  const getTotal = () =>
    items.reduce((sum, i) => sum + (Number(i.price) || 0) * i.quantity, 0)

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)

  return {
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    isInCart,
    getTotal,
    itemCount,
  }
}
