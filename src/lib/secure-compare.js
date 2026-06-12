/**
 * Constant-time string comparison for shared secrets (CRON_SECRET, webhook secret).
 *
 * Hashing both sides with SHA-256 first equalizes length (so `timingSafeEqual`, which throws
 * on unequal-length buffers, is always safe to call) and avoids leaking the secret's length.
 * Returns false for any nullish input.
 */
import crypto from 'node:crypto'

export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const ha = crypto.createHash('sha256').update(a).digest()
  const hb = crypto.createHash('sha256').update(b).digest()
  return crypto.timingSafeEqual(ha, hb)
}
