import { useState } from 'react'
import { Share2, Check } from 'lucide-react'

/**
 * ShareButton — shares a unique link to a product via the
 * Web Share API (mobile) or copies it to the clipboard (desktop).
 */
export default function ShareButton({ gun, size = 16 }) {
  const [copied, setCopied] = useState(false)

  const shareUrl = `${window.location.origin}?gun=${encodeURIComponent(gun.id || gun.name)}`

  const handleShare = async (e) => {
    e?.stopPropagation()

    if (navigator.share) {
      try {
        await navigator.share({
          title: gun.name,
          text: `Check out ${gun.name} on Bore & Barrel`,
          url: shareUrl,
        })
      } catch {
        /* user cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl)
      } catch {
        // Fallback for older browsers
        const ta = document.createElement('textarea')
        ta.value = shareUrl
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      type="button"
      className={`share-btn${copied ? ' share-btn--copied' : ''}`}
      onClick={handleShare}
      title={copied ? 'Link copied!' : 'Share link'}
      aria-label={copied ? 'Link copied' : `Share ${gun.name}`}
    >
      {copied ? <Check size={size} /> : <Share2 size={size} />}
    </button>
  )
}
