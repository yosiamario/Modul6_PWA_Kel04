import { useState } from 'react'
import {
  Shield,
  Copy,
  Check,
  Heart,
  FileText,
  Camera,
  Play,
  Edit3,
  Trash2,
  RotateCcw,
  Archive,
  MapPin,
  Phone,
  Clock,
} from 'lucide-react'
import userService from '../services/userService'
import gunService from '../services/gunService'
import { useFavorites } from '../hooks/useFavorites'
import { useArchive } from '../hooks/useArchive'
import {
  getAllDraftIds,
  loadDraft,
  deleteDraft,
  formatDraftTime,
  getDraftTimestamp,
  clearAllDrafts,
} from '../utils/draftStorage'
import ConfirmModal from '../components/modals/ConfirmModal'

/**
 * ProfilePage — Operator profile, About & Contact sections,
 * saved drafts viewer, and soft-deleted (archived) items.
 */
export default function ProfilePage({ onReplaySplash, onNavigateEditProfile, onRestoreArchived }) {
  const [profile] = useState(() => userService.getUserProfile())
  const [copied, setCopied] = useState(false)
  const { favorites } = useFavorites()
  const { archived, restoreItem, permanentDelete, clearArchive } = useArchive()

  // Drafts
  const [draftIds, setDraftIds] = useState(() => getAllDraftIds())
  const [expandedDraft, setExpandedDraft] = useState(null)

  // Confirm modals
  const [deleteArchiveTarget, setDeleteArchiveTarget] = useState(null)
  const [clearArchiveConfirm, setClearArchiveConfirm] = useState(false)

  const handleCopyId = () => {
    if (profile.userId) {
      navigator.clipboard.writeText(profile.userId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDeleteDraft = (draftId) => {
    deleteDraft(draftId)
    setDraftIds(getAllDraftIds())
    if (expandedDraft === draftId) setExpandedDraft(null)
  }

  const handleClearAllDrafts = () => {
    clearAllDrafts()
    setDraftIds([])
    setExpandedDraft(null)
  }

  const handleRestoreItem = (gunId) => {
    const restored = restoreItem(gunId)
    if (restored && onRestoreArchived) onRestoreArchived(restored)
  }

  const handlePermanentDelete = async () => {
    if (deleteArchiveTarget) {
      try {
        await gunService.deleteGun(deleteArchiveTarget)
      } catch {
        /* server unavailable */
      }
      permanentDelete(deleteArchiveTarget)
      setDeleteArchiveTarget(null)
    }
  }

  return (
    <div className="profile-page">
      {/* Masthead */}
      <section
        className="masthead"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}
      >
        <div>
          <h1 className="display">Operator Profile</h1>
          <p className="lede">Operator credentials, procurement statistics, and armorer details.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onReplaySplash && (
            <button type="button" className="btn btn--outline btn--sm" onClick={onReplaySplash} title="Replay intro">
              <Play size={14} /> Replay Intro
            </button>
          )}
        </div>
      </section>

      {/* ── Operator Card ── */}
      <div className="profile-card">
        <div className="profile-card-top">
          <div className="avatar-wrap">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.username} className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">
                <Shield size={36} stroke="var(--brass)" />
              </div>
            )}
          </div>
          <div className="profile-identity">
            <h2 className="display">{profile.username || 'Shooter'}</h2>
            <div className="profile-id-row">
              <span className="mono-badge">{profile.userId}</span>
              <button type="button" className="icon-btn" onClick={handleCopyId} title="Copy User ID">
                {copied ? <Check size={14} color="var(--brass)" /> : <Copy size={14} />}
              </button>
            </div>
            {profile.bio && <p className="profile-bio">{profile.bio}</p>}
          </div>
        </div>

        {/* Edit Profile button */}
        {onNavigateEditProfile && (
          <button
            type="button"
            className="btn btn--outline"
            onClick={onNavigateEditProfile}
            style={{ alignSelf: 'flex-start' }}
          >
            <Edit3 size={14} /> Edit Profile
          </button>
        )}

        {/* Stats */}
        <div className="profile-stats">
          <div className="stat-item">
            <Heart size={20} className="stat-icon" stroke="var(--brass)" />
            <div className="stat-val">{favorites.length}</div>
            <div className="stat-label">Favorites</div>
          </div>
          <div className="stat-item">
            <FileText size={20} className="stat-icon" stroke="var(--steel)" />
            <div className="stat-val">{draftIds.length}</div>
            <div className="stat-label">Saved Drafts</div>
          </div>
          <div className="stat-item">
            <Archive size={20} className="stat-icon" stroke="var(--steel)" />
            <div className="stat-val">{archived.length}</div>
            <div className="stat-label">Archived</div>
          </div>
        </div>
      </div>

      {/* ── About Section ── */}
      <div className="profile-section-card">
        <h3 className="section-title">About</h3>
        <p className="lede">
          Bore &amp; Barrel sells a short, honest list of firearms. Each piece is priced from the bench
          — no markup theatre, no filler.
        </p>
        <p style={{ color: 'var(--steel)', fontSize: '0.9rem' }}>
          A one-room armory serving enthusiasts and professionals since day one.
        </p>
      </div>

      {/* ── Contact Section ── */}
      <div className="profile-section-card">
        <h3 className="section-title">Contact</h3>
        <div className="contact-items">
          <div className="contact-item">
            <MapPin size={16} stroke="var(--brass)" />
            <span>123 Range Road</span>
          </div>
          <div className="contact-item">
            <Clock size={16} stroke="var(--brass)" />
            <span>Tuesday – Saturday, 10 AM – 6 PM</span>
          </div>
          <div className="contact-item">
            <Phone size={16} stroke="var(--brass)" />
            <span>(555) 010-0100</span>
          </div>
        </div>
      </div>

      {/* ── Saved Drafts Section ── */}
      <div className="profile-section-card">
        <div className="section-header">
          <h3 className="section-title">
            <FileText size={18} /> Saved Drafts ({draftIds.length})
          </h3>
          {draftIds.length > 0 && (
            <button type="button" className="btn btn--outline btn--sm" onClick={handleClearAllDrafts}>
              Clear All
            </button>
          )}
        </div>

        {draftIds.length === 0 ? (
          <p className="lede" style={{ fontSize: '0.9rem' }}>
            No saved drafts. Drafts are auto-saved when creating or editing products.
          </p>
        ) : (
          <ul className="draft-list">
            {draftIds.map((id) => {
              const ts = getDraftTimestamp(id)
              const draft = expandedDraft === id ? loadDraft(id) : null
              return (
                <li key={id} className="draft-item">
                  <div className="draft-item-header">
                    <div className="draft-item-info">
                      <span className="draft-item-name">
                        {id === 'create' ? '🆕 New Product Draft' : `📝 Edit: ${id.substring(0, 12)}…`}
                      </span>
                      <span className="draft-item-time">{ts ? formatDraftTime(ts) : 'Unknown'}</span>
                    </div>
                    <div className="draft-item-actions">
                      <button
                        type="button"
                        className="btn btn--outline btn--sm"
                        onClick={() => setExpandedDraft(expandedDraft === id ? null : id)}
                      >
                        {expandedDraft === id ? 'Hide' : 'Preview'}
                      </button>
                      <button
                        type="button"
                        className="btn btn--danger-ghost"
                        onClick={() => handleDeleteDraft(id)}
                        title="Delete draft"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {draft && (
                    <div className="draft-preview">
                      <p><strong>Name:</strong> {draft.formData?.name || '(untitled)'}</p>
                      <p><strong>Type:</strong> {draft.formData?.type || '—'}</p>
                      <p><strong>Caliber:</strong> {draft.formData?.caliber || '—'}</p>
                      <p><strong>Price:</strong> ${draft.formData?.price || 0}</p>
                      {draft.formData?.description && (
                        <p><strong>Desc:</strong> {draft.formData.description.substring(0, 100)}</p>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* ── Archived Items (Soft Delete) ── */}
      <div className="profile-section-card">
        <div className="section-header">
          <h3 className="section-title">
            <Archive size={18} /> Archived Items ({archived.length})
          </h3>
          {archived.length > 0 && (
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={() => setClearArchiveConfirm(true)}
            >
              Clear All
            </button>
          )}
        </div>

        {archived.length === 0 ? (
          <p className="lede" style={{ fontSize: '0.9rem' }}>
            No archived items. Deleted products are moved here for safekeeping.
          </p>
        ) : (
          <ul className="archive-list">
            {archived.map((item) => (
              <li key={item.id} className="archive-item">
                <img
                  src={item.image_url || '/guns/pistol.svg'}
                  alt={item.name}
                  className="archive-item-img"
                />
                <div className="archive-item-info">
                  <span className="archive-item-name">{item.name}</span>
                  <span className="archive-item-meta">
                    {item.type || '—'} · Archived {item.archivedAt ? formatDraftTime(item.archivedAt) : ''}
                  </span>
                </div>
                <div className="archive-item-actions">
                  <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => handleRestoreItem(item.id)}
                    title="Restore"
                  >
                    <RotateCcw size={13} /> Restore
                  </button>
                  <button
                    type="button"
                    className="btn btn--danger-ghost"
                    onClick={() => setDeleteArchiveTarget(item.id)}
                    title="Delete permanently"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Confirm permanent delete */}
      <ConfirmModal
        open={Boolean(deleteArchiveTarget)}
        title="Permanently Delete"
        message="This will permanently remove this item. This action cannot be undone."
        confirmLabel="Delete Forever"
        danger
        onConfirm={handlePermanentDelete}
        onCancel={() => setDeleteArchiveTarget(null)}
      />

      <ConfirmModal
        open={clearArchiveConfirm}
        title="Clear Archive"
        message="Permanently remove all archived items?"
        confirmLabel="Clear All"
        danger
        onConfirm={() => {
          clearArchive()
          setClearArchiveConfirm(false)
        }}
        onCancel={() => setClearArchiveConfirm(false)}
      />
    </div>
  )
}
