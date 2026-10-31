import { useState, useEffect, Suspense, lazy } from 'react'
import { Loader } from 'lucide-react'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import PWABadge from './components/PWABadge.jsx'
import ConfirmModal from './components/modals/ConfirmModal.jsx'
import SplashScreen from './components/common/SplashScreen.jsx'
import CartDrawer from './components/cart/CartDrawer.jsx'
import GunDetail from './components/gun/GunDetail.jsx'
import gunService from './services/gunService.js'
import { useCart } from './hooks/useCart.js'
import { useArchive } from './hooks/useArchive.js'
import { invalidateCache } from './utils/queryCache.js'
import './App.css'

// ---------------------------------------------------------------------------
// Lazy-loaded pages — only downloaded when the user navigates to them.
// ---------------------------------------------------------------------------
const Catalog = lazy(() => import('./pages/Catalog.jsx'))
const FavoritesPage = lazy(() => import('./pages/FavoritesPage.jsx'))
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'))
const CreateGunPage = lazy(() => import('./pages/CreateGunPage.jsx'))
const EditGunPage = lazy(() => import('./pages/EditGunPage.jsx'))
const EditProfilePage = lazy(() => import('./pages/EditProfilePage.jsx'))

/** Suspense fallback spinner */
function PageLoader() {
  return (
    <div className="state-box">
      <Loader size={28} className="spin" />
      <p>Loading…</p>
    </div>
  )
}

function App() {
  // Skip splash if deep-linked via ?gun= param
  const [showSplash, setShowSplash] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return !params.has('gun')
  })

  const [tab, setTab] = useState('Catalog')
  const [mode, setMode] = useState('list') // list | create | edit | detail | editProfile
  const [selectedGun, setSelectedGun] = useState(null)
  const [editingGun, setEditingGun] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Cart
  const cart = useCart()
  const [cartOpen, setCartOpen] = useState(false)

  // Archive (soft delete)
  const { archiveItem } = useArchive()

  // Deep-link: open a product directly from ?gun=<id>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const gunParam = params.get('gun')
    if (gunParam) {
      gunService
        .getGunById(gunParam)
        .then((res) => {
          if (res.success && res.data) {
            setSelectedGun(res.data)
            setMode('detail')
          }
        })
        .catch(() => {})
      // Clean the URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Unified navigation handler
  const handleNavigate = (target, payload) => {
    if (target === 'Create') {
      setMode('create')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (target === 'Edit') {
      setEditingGun(payload)
      setMode('edit')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (target === 'Detail') {
      setSelectedGun(payload)
      setMode('detail')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (target === 'EditProfile') {
      setMode('editProfile')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      // Tab change
      setTab(target)
      setMode('list')
      setSelectedGun(null)
      setEditingGun(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleBackToList = () => {
    setMode('list')
    setSelectedGun(null)
    setEditingGun(null)
  }

  // Soft delete → archive item, then optionally delete from server
  const handleSoftDelete = async (gun) => {
    if (!gun) return
    try {
      setDeleting(true)
      // Archive locally first
      archiveItem(gun)
      // Attempt server delete
      try {
        await gunService.deleteGun(gun.id)
      } catch {
        /* server unavailable — item is archived locally */
      }
      invalidateCache('gun')
      setDeleteTarget(null)
      handleBackToList()
      setTab('Catalog')
    } catch (err) {
      alert(err.message || 'Failed to archive record.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="shell">
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      <Header
        tab={mode === 'list' ? tab : ''}
        onTab={(newTab) => handleNavigate(newTab)}
        onNavigateCreate={() => handleNavigate('Create')}
        cartCount={cart.itemCount}
        onOpenCart={() => setCartOpen(true)}
      />

      <main className="main">
        <Suspense fallback={<PageLoader />}>
          {/* Sub-page views */}
          {mode === 'create' && (
            <CreateGunPage
              onBack={handleBackToList}
              onSuccess={() => {
                invalidateCache('gun')
                handleBackToList()
                setTab('Catalog')
              }}
            />
          )}

          {mode === 'edit' && (
            <EditGunPage
              gun={editingGun}
              gunId={editingGun?.id}
              onBack={handleBackToList}
              onSuccess={() => {
                invalidateCache('gun')
                handleBackToList()
                setTab('Catalog')
              }}
            />
          )}

          {mode === 'editProfile' && (
            <EditProfilePage
              onBack={() => {
                setMode('list')
                setTab('Profile')
              }}
            />
          )}

          {mode === 'detail' && selectedGun && (
            <GunDetail
              gun={selectedGun}
              onBack={handleBackToList}
              onEdit={(g) => handleNavigate('Edit', g)}
              onDelete={(g) => setDeleteTarget(g)}
              onAddToCart={cart.addToCart}
              isInCart={cart.isInCart(selectedGun.id || selectedGun.name)}
            />
          )}

          {/* Top-level Tabs */}
          {mode === 'list' && (
            <>
              {tab === 'Catalog' && (
                <Catalog
                  onNavigate={(dest, payload) => handleNavigate(dest, payload)}
                  cart={cart}
                />
              )}
              {tab === 'Favorites' && (
                <FavoritesPage
                  onSelectGun={(g) => handleNavigate('Detail', g)}
                  onNavigateCatalog={() => setTab('Catalog')}
                />
              )}
              {tab === 'Profile' && (
                <ProfilePage
                  onReplaySplash={() => setShowSplash(true)}
                  onNavigateEditProfile={() => handleNavigate('EditProfile')}
                  onRestoreArchived={() => {
                    invalidateCache('gun')
                    setTab('Catalog')
                  }}
                />
              )}
            </>
          )}
        </Suspense>
      </main>

      {/* Cart Drawer */}
      <CartDrawer
        items={cart.items}
        onUpdateQuantity={cart.updateQuantity}
        onRemove={cart.removeFromCart}
        onClear={cart.clearCart}
        total={cart.getTotal()}
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
      />

      {/* Global Delete Confirmation (soft delete → archive) */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Archive Hardware Record"
        message={`Move "${deleteTarget?.name}" to archive? You can restore it from your Profile.`}
        confirmLabel="Archive"
        danger
        loading={deleting}
        onConfirm={() => handleSoftDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />

      <PWABadge />
      <Footer />
    </div>
  )
}

export default App
