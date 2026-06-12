/**
 * Admin failure alerts — emails ADMIN_EMAIL the moment a sync hits a real failure
 * (a Google Health fetch that failed after retries, a dead token, a DB upsert error,
 * or an unhandled sync exception).
 *
 * Best-effort: wraps sendEmail, never throws — a failed alert must not break sync.
 */
import { ADMIN_EMAIL } from '@/lib/constants'
import { sendEmail } from '@/lib/email'

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Email the admin about one failure. `detail` fields (all optional except `source`):
 *   source  e.g. 'google-health' | 'token' | 'daily_metrics-upsert' | 'sync-exception'
 *   userId  the affected profile id
 *   label   the Google Health data type (steps, heart-rate, …)
 *   status  HTTP status that failed
 *   reason  short machine reason (e.g. 'reconnect_required')
 *   error   error message
 */
export async function notifyAdminOfFailure(detail = {}) {
  try {
    const { source = 'unknown', userId, label, status, reason, error } = detail
    const subjectBits = [source, label, status && `HTTP ${status}`].filter(Boolean).join(' · ')
    const subject = `[KyaReFitting] Sync failure: ${subjectBits}`

    const fields = { source, userId, dataType: label, status, reason, error, time: new Date().toISOString() }
    const rows = Object.entries(fields)
      .filter(([, value]) => value != null && value !== '')
      .map(
        ([key, value]) =>
          `<tr><td style="padding:4px 12px 4px 0;color:#888;font-family:monospace">${key}</td>` +
          `<td style="padding:4px 0;font-family:monospace">${escapeHtml(value)}</td></tr>`
      )
      .join('')

    const html =
      `<h2 style="margin:0 0 12px">Google Health sync failure</h2>` +
      `<table style="border-collapse:collapse">${rows}</table>`

    return await sendEmail({ to: ADMIN_EMAIL, subject, html })
  } catch (err) {
    console.error('[notify-admin] failed to send alert:', err?.message ?? err)
    return false
  }
}
