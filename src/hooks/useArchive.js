import { useState, useCallback } from 'react'

// ---------------------------------------------------------------------------
// useArchive — Soft-delete / archive items via localStorage.
// ---------------------------------------------------------------------------

const ARCHIVE_KEY = 'bore_barrel_archive'

const readArchive = () => {
  try {
    return JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]')
  } catch {
    return []
  }
}

const writeArchive = (items) => {
  try {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(items))
  } catch { /* quota exceeded */ }
}

export function useArchive() {
  const [archived, setArchived] = useState(readArchive)

  const sync = useCallback((updater) => {
    setArchived((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      writeArchive(next)
      return next
    })
  }, [])

  /** Move a gun to the archive instead of permanently deleting it. */
  const archiveItem = useCallback((gun) => {
    sync((current) => {
      if (current.some((a) => String(a.id) === String(gun.id))) return current
      return [
        ...current,
        {
          id: gun.id,
          name: gun.name,
          type: gun.type || gun.category || '',
          caliber: gun.caliber || '',
          price: Number(gun.price ?? gun.cook_time ?? 0),
          description: gun.description || '',
          image_url: gun.image_url || gun.image || '/guns/pistol.svg',
          ingredients: gun.ingredients || [],
          steps: gun.steps || [],
          archivedAt: new Date().toISOString(),
        },
      ]
    })
  }, [sync])

  /** Restore an item from the archive back to the catalog. */
  const restoreItem = useCallback((gunId) => {
    let restored = null
    sync((current) => {
      restored = current.find((i) => String(i.id) === String(gunId))
      return current.filter((i) => String(i.id) !== String(gunId))
    })
    return restored
  }, [sync])

  /** Permanently remove from archive. */
  const permanentDelete = useCallback((gunId) => {
    sync((current) => current.filter((i) => String(i.id) !== String(gunId)))
  }, [sync])

  /** Check if a gun is archived. */
  const isArchived = useCallback(
    (gunId) => readArchive().some((i) => String(i.id) === String(gunId)),
    [],
  )

  /** Remove everything from archive. */
  const clearArchive = useCallback(() => sync([]), [sync])

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
