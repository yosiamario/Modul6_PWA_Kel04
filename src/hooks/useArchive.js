import { useState, useEffect, useCallback } from 'react'
import gunService from '../services/gunService'

// ---------------------------------------------------------------------------
// useArchive — Soft-delete / archive items via localStorage.
// Synchronizes across components via 'archive-change' custom window event.
// ---------------------------------------------------------------------------

const ARCHIVE_KEY = 'bore_barrel_archive'
const RESTORED_KEY = 'bore_barrel_restored'

export const readArchive = () => {
  try {
    return JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]')
  } catch {
    return []
  }
}

const writeArchive = (items) => {
  try {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(items))
  } catch {
    /* quota exceeded */
  }
}

export const getRestoredItems = () => {
  try {
    return JSON.parse(localStorage.getItem(RESTORED_KEY) || '[]')
  } catch {
    return []
  }
}

export const addRestoredItem = (item) => {
  try {
    const list = getRestoredItems()
    const next = list.filter(
      (x) => String(x.id) !== String(item.id) && x.name !== item.name,
    )
    next.push(item)
    localStorage.setItem(RESTORED_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

export const removeRestoredItem = (idOrName) => {
  try {
    const list = getRestoredItems().filter(
      (x) => String(x.id) !== String(idOrName) && x.name !== String(idOrName),
    )
    localStorage.setItem(RESTORED_KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

export function useArchive() {
  const [archived, setArchived] = useState(readArchive)

  // Listen for archive-change events dispatched from any component instance
  useEffect(() => {
    const handleSync = () => {
      setArchived(readArchive())
    }
    window.addEventListener('archive-change', handleSync)
    window.addEventListener('storage', handleSync)
    return () => {
      window.removeEventListener('archive-change', handleSync)
      window.removeEventListener('storage', handleSync)
    }
  }, [])

  /** Move a gun to the archive (Soft Delete). */
  const archiveItem = useCallback((gun) => {
    if (!gun) return
    const current = readArchive()
    const matchId = gun.id || gun.name
    const filtered = current.filter(
      (a) => String(a.id) !== String(matchId) && a.name !== gun.name,
    )
    const archivedItem = {
      id: gun.id || `archived-${Date.now()}`,
      name: gun.name,
      type: gun.type || gun.category || 'Hardware',
      category: gun.type || gun.category || 'Hardware',
      caliber: gun.caliber || '',
      price: Number(gun.price ?? gun.cook_time ?? 0),
      description: gun.description || '',
      image_url: gun.image_url || gun.image || '/guns/pistol.svg',
      image: gun.image_url || gun.image || '/guns/pistol.svg',
      ingredients: gun.ingredients || [],
      steps: gun.steps || [],
      archivedAt: new Date().toISOString(),
    }
    const next = [...filtered, archivedItem]
    writeArchive(next)
    setArchived(next)

    // Remove from restored list if it was there
    removeRestoredItem(matchId)

    window.dispatchEvent(new CustomEvent('archive-change', { detail: { action: 'archive', item: archivedItem } }))
  }, [])

  /** Restore an item from the archive back to the catalog. */
  const restoreItem = useCallback((gunId) => {
    const current = readArchive()
    const target = current.find(
      (i) => String(i.id) === String(gunId) || String(i.name) === String(gunId),
    )
    const next = current.filter(
      (i) => String(i.id) !== String(gunId) && String(i.name) !== String(gunId),
    )
    writeArchive(next)
    setArchived(next)

    if (target) {
      // Add to restored items so catalog guaranteed displays it
      addRestoredItem(target)

      // Try re-creating on server in background if it was deleted on server
      try {
        gunService.createGun(target).catch(() => {})
      } catch {
        /* ignore */
      }
    }

    window.dispatchEvent(
      new CustomEvent('archive-change', { detail: { action: 'restore', item: target } }),
    )
    return target
  }, [])

  /** Permanently remove from archive. */
  const permanentDelete = useCallback((gunId) => {
    const current = readArchive()
    const next = current.filter(
      (i) => String(i.id) !== String(gunId) && String(i.name) !== String(gunId),
    )
    writeArchive(next)
    setArchived(next)
    removeRestoredItem(gunId)
    window.dispatchEvent(new CustomEvent('archive-change', { detail: { action: 'permanentDelete' } }))
  }, [])

  /** Check if a gun is archived. */
  const isArchived = useCallback(
    (gunIdOrName) => {
      if (!gunIdOrName) return false
      return archived.some(
        (i) =>
          String(i.id) === String(gunIdOrName) ||
          (i.name && String(i.name).toLowerCase() === String(gunIdOrName).toLowerCase()),
      )
    },
    [archived],
  )

  /** Remove everything from archive. */
  const clearArchive = useCallback(() => {
    writeArchive([])
    setArchived([])
    window.dispatchEvent(new CustomEvent('archive-change', { detail: { action: 'clear' } }))
  }, [])

  return {
    archived,
    archiveItem,
    restoreItem,
    permanentDelete,
    isArchived,
    clearArchive,
    count: archived.length,
  }
}
