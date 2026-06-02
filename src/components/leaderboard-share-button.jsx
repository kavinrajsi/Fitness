'use client'

import { useState, useCallback } from 'react'
import { Icon } from '@/components/icon'

export function LeaderboardShareButton({ period }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const imageUrl = `/api/og/leaderboard?period=${period}`

  const fetchBlob = useCallback(async () => {
    const res = await fetch(imageUrl)
    return res.blob()
  }, [imageUrl])

  async function handleShare() {
    setLoading(true)
    try {
      const blob = await fetchBlob()
      const file = new File([blob], 'fitme-leaderboard.png', { type: 'image/png' })
      await navigator.share({ title: 'KyaReFitting aa Leaderboard', files: [file] })
    } catch {
      // user cancelled or API not supported — fall through
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setLoading(true)
    try {
      const blob = await fetchBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fitme-leaderboard-${period}.png`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }

  const canNativeShare =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [new File([''], 'test.png', { type: 'image/png' })] })

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Share leaderboard"
      >
        <Icon name="share" size={18} />
        Share
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="bg-background border border-border rounded-2xl overflow-hidden w-full max-w-sm shadow-xl">
            {/* Preview */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Leaderboard share card"
              className="w-full block"
            />

            {/* Actions */}
            <div className="p-4 flex gap-2">
              {canNativeShare && (
                <button
                  onClick={handleShare}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <Icon name="share" size={18} />
                  Share
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-50"
              >
                <Icon name="download" size={18} />
                Save
              </button>
              <button
                onClick={() => setOpen(false)}
                className="flex items-center justify-center px-3 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
                aria-label="Close"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
