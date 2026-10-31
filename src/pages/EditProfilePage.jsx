import { useState } from 'react'
import { ArrowLeft, Camera, Save, Check } from 'lucide-react'
import userService from '../services/userService'

/**
 * EditProfilePage — Dedicated page for editing operator name, bio, and avatar.
 */
export default function EditProfilePage({ onBack }) {
  const [profile] = useState(() => userService.getUserProfile())
  const [username, setUsername] = useState(profile.username || 'Shooter')
  const [bio, setBio] = useState(profile.bio || '')
  const [avatar, setAvatar] = useState(profile.avatar || null)
  const [feedback, setFeedback] = useState('')

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setFeedback('Avatar image must be under 2MB.')
      setTimeout(() => setFeedback(''), 3000)
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      setAvatar(ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = (e) => {
    e.preventDefault()
    const updated = {
      ...profile,
      username: username.trim() || 'Shooter',
      bio: bio.trim(),
      avatar,
    }
    const result = userService.saveUserProfile(updated)
    if (result.success) {
      setFeedback('Profile saved successfully!')
      setTimeout(() => {
        setFeedback('')
        if (onBack) onBack()
      }, 1200)
    } else {
      setFeedback('Failed to save profile.')
    }
  }

  return (
    <div className="form-page">
      <div className="form-head">
        <button type="button" className="detail-back" onClick={onBack}>
          <ArrowLeft size={18} /> Back to Profile
        </button>
      </div>

      <div className="form-title-group">
        <h1 className="display">Edit Operator Profile</h1>
        <p className="lede">Update your callsign, station bio, and avatar.</p>
      </div>

      {feedback && (
        <div className="toast toast--success">
          <Check size={18} /> {feedback}
        </div>
      )}

      <form onSubmit={handleSave} className="entry-form">
        {/* Avatar */}
        <div className="card-box" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div className="avatar-wrap" style={{ width: 100, height: 100 }}>
            {avatar ? (
              <img src={avatar} alt="Avatar" className="avatar-img" />
            ) : (
              <div className="avatar-placeholder" style={{ width: 100, height: 100, fontSize: 36 }}>
                👤
              </div>
            )}
            <label htmlFor="edit-avatar-input" className="avatar-upload-btn" title="Change avatar">
              <Camera size={14} />
              <input
                id="edit-avatar-input"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden-file-input"
              />
            </label>
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 600 }}>Profile Photo</p>
            <p className="lede" style={{ fontSize: '0.85rem', margin: 0 }}>
              JPG, PNG or WebP. Max 2MB.
            </p>
          </div>
        </div>

        {/* Name */}
        <div className="form-group">
          <label htmlFor="edit-callsign" className="form-label">
            Callsign / Operator Alias
          </label>
          <input
            id="edit-callsign"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. Operator Delta, Master Gunsmith"
            className="form-input"
          />
        </div>

        {/* Bio */}
        <div className="form-group">
          <label htmlFor="edit-bio" className="form-label">
            Armory Notes / Station Bio
          </label>
          <textarea
            id="edit-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Qualifications, preferred calibers, unit assignment..."
            rows={4}
            className="form-textarea"
          />
        </div>

        {/* Actions */}
        <div className="form-actions-bar">
          <button type="button" className="btn btn--outline" onClick={onBack}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary">
            <Save size={16} /> Save Profile
          </button>
        </div>
      </form>
    </div>
  )
}
