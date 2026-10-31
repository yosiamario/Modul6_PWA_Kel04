import { useState, useMemo } from 'react'
import { RefreshCw, Plus, Loader, AlertCircle, PackageOpen } from 'lucide-react'
import { useGuns } from '../hooks/useGuns'
import { useArchive, getRestoredItems } from '../hooks/useArchive'
import { invalidateCache } from '../utils/queryCache'
import GUNS_LOCAL from '../data/guns'
import GunCard from '../components/gun/GunCard'
import GunDetail from '../components/gun/GunDetail'
import AdvancedFilter from '../components/common/AdvancedFilter'
import ConfirmModal from '../components/modals/ConfirmModal'
import gunService from '../services/gunService'
import {
  matchesSearch,
  matchesCategory,
  sortItems,
  extractCategories,
} from '../utils/helpers'

/**
 * Catalog page — the main product listing.
 * Supports soft-delete / archiving, live API + offline fallback, cart, and search/filter.
 */
export default function Catalog({ onNavigate, cart }) {
  // ---- API data ----
  const { guns: apiGuns, loading, error, refetch } = useGuns({ limit: 50 })
  const [useLocal, setUseLocal] = useState(false)

  // ---- Soft Delete / Archive ----
  const { isArchived, archiveItem, archived } = useArchive()

  // Decide data source & merge restored items
  const rawGuns = useMemo(() => {
    let base = []
    if (useLocal || (error && apiGuns.length === 0)) {
      base = GUNS_LOCAL.map((g, i) => ({ ...g, id: g.id || `local-${i}` }))
    } else {
      base = [...apiGuns]
    }

    // Merge restored items so they are always visible even if deleted from server
    const restored = getRestoredItems()
    restored.forEach((r) => {
      if (!base.some((b) => String(b.id) === String(r.id) || b.name === r.name)) {
        base.unshift(r)
      }
    })

    return base
  }, [apiGuns, error, useLocal, archived])

  // ---- filters / sort (excluding soft-deleted / archived items) ----
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [sortKey, setSortKey] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')

  const activeGuns = useMemo(() => {
    return rawGuns.filter((g) => !isArchived(g.id) && !isArchived(g.name))
  }, [rawGuns, isArchived])

  const categories = useMemo(() => extractCategories(activeGuns), [activeGuns])

  const filteredGuns = useMemo(() => {
    let result = activeGuns.filter(
      (g) => matchesSearch(g, search) && matchesCategory(g, activeCategory),
    )
    return sortItems(result, sortKey, sortOrder)
  }, [activeGuns, search, activeCategory, sortKey, sortOrder])

  // ---- detail view ----
  const [selectedGun, setSelectedGun] = useState(null)

  // ---- soft delete / archive confirmation ----
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [archiveSuccess, setArchiveSuccess] = useState('')

  const handleSoftDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      setDeleteError('')

      // 1. Move to local archive (soft delete)
      archiveItem(deleteTarget)

      // 2. Try server delete if possible (catch errors gracefully so it never blocks soft delete)
      try {
        await gunService.deleteGun(deleteTarget.id)
      } catch {
        /* server unavailable or RLS protected — item is safely archived locally */
      }

      invalidateCache('gun')
      setArchiveSuccess(`"${deleteTarget.name}" moved to archive.`)
      setTimeout(() => setArchiveSuccess(''), 3000)

      setDeleteTarget(null)
      setSelectedGun(null)
      refetch()
    } catch (err) {
      setDeleteError(err.message || 'Failed to archive item.')
    } finally {
      setDeleting(false)
    }
  }

  // ---- If viewing a single product detail ----
  if (selectedGun) {
    return (
      <GunDetail
        gun={selectedGun}
        onBack={() => setSelectedGun(null)}
        onEdit={(g) => onNavigate && onNavigate('Edit', g)}
        onDelete={(g) => setDeleteTarget(g)}
        onAddToCart={cart ? cart.addToCart : undefined}
        isInCart={cart ? cart.isInCart(selectedGun.id || selectedGun.name) : false}
      />
    )
  }

  // ---- Main catalog view ----
  return (
    <>
      <section className="masthead">
        <h1 className="display">Hardware, by the spec sheet.</h1>
        <p className="lede">
          A small armory of pistols, rifles, and shotguns. Every piece listed
          with its type, caliber, and price — nothing else.
        </p>
      </section>

      {archiveSuccess && (
        <div className="toast toast--success" style={{ marginBottom: '16px' }}>
          ✓ {archiveSuccess}
        </div>
      )}

      {/* Advanced Filter Toolbar */}
      <AdvancedFilter
        categories={categories}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        search={search}
        onSearchChange={setSearch}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSortKeyChange={setSortKey}
        onSortOrderToggle={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
      />

      {/* Results Header */}
      <section className="catalog-content">
        <div className="list-head">
          <h2>Catalog</h2>
          <div className="list-actions">
            <span className="count">
              {filteredGuns.length} of {activeGuns.length} pieces
            </span>
            <button
              type="button"
              className="icon-btn"
              onClick={refetch}
              title="Refresh inventory from server"
              aria-label="Refresh"
            >
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>
            {onNavigate && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => onNavigate('Create')}
              >
                <Plus size={14} /> Add Piece
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && filteredGuns.length === 0 && (
          <div className="state-box">
            <Loader size={28} className="spin" />
            <p>Scanning armory shelves…</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && !useLocal && rawGuns.length === 0 && (
          <div className="state-box state-box--error">
            <AlertCircle size={28} />
            <p>{error}</p>
            <div className="state-box-actions">
              <button type="button" className="btn btn--outline" onClick={refetch}>
                Retry Connection
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setUseLocal(true)}
              >
                Load Local Fallback
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredGuns.length === 0 && rawGuns.length > 0 && (
          <div className="state-box">
            <PackageOpen size={36} stroke="var(--steel)" />
            <h3>No hardware matches</h3>
            <p className="lede">
              Adjust your search keywords or clear the category filter to see more
              results.
            </p>
            {(search || activeCategory !== 'All') && (
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={() => {
                  setSearch('')
                  setActiveCategory('All')
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        )}

        {/* Product Grid */}
        {filteredGuns.length > 0 && (
          <ul className="stock">
            {filteredGuns.map((gun) => (
              <GunCard
                key={gun.id || gun.name}
                gun={gun}
                onSelect={setSelectedGun}
                onEdit={onNavigate ? (g) => onNavigate('Edit', g) : undefined}
                onDelete={(g) => setDeleteTarget(g)}
                onAddToCart={cart ? cart.addToCart : undefined}
                isInCart={cart ? cart.isInCart(gun.id || gun.name) : false}
              />
            ))}
          </ul>
        )}

        {useLocal && (
          <p className="local-notice">
            Showing local catalog (server unavailable).{' '}
            <button
              type="button"
              className="link-btn"
              onClick={() => { setUseLocal(false); refetch() }}
            >
              Retry server
            </button>
          </p>
        )}
      </section>

      {/* Soft Delete (Archive) Confirmation Modal */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Archive Hardware Record"
        message={`Move "${deleteTarget?.name}" to archive? You can restore it anytime from your Profile page.`}
        confirmLabel="Archive"
        danger
        loading={deleting}
        onConfirm={handleSoftDelete}
        onCancel={() => { setDeleteTarget(null); setDeleteError('') }}
      />
      {deleteError && <div className="toast toast--error">{deleteError}</div>}
    </>
  )
}
