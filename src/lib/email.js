/**
 * Transactional email via ZeptoMail (Zoho) — used for admin failure alerts.
 *
 * REST API (no SDK): POST https://api.zeptomail.com/v1.1/email
 *   Authorization: Zoho-enczapikey <send-mail token>
 *   body: { from:{address,name}, to:[{email_address:{address}}], subject, htmlbody }
 *
 * Configured via env:
 *   ZEPTOMAIL_TOKEN      the Send Mail token (with or without the "Zoho-enczapikey " prefix)
 *   ZEPTOMAIL_FROM       verified sender address
 *   ZEPTOMAIL_FROM_NAME  optional sender display name (default "KyaReFitting")
 *   ZEPTOMAIL_API_URL    optional override (e.g. https://api.zeptomail.eu/v1.1/email for EU)
 *
 * Best-effort: never throws — returns true on a 2xx send, false otherwise (and logs).
 */

const DEFAULT_API_URL = 'https://api.zeptomail.com/v1.1/email'

export function isEmailConfigured() {
  return Boolean(process.env.ZEPTOMAIL_TOKEN && process.env.ZEPTOMAIL_FROM)
}

async function safeText(response) {
  try {
    return await response.text()
  } catch {
    return ''
  }
}

export async function sendEmail({ to, subject, html, text }) {
  if (!isEmailConfigured()) {
    console.warn('[email] ZEPTOMAIL_TOKEN/ZEPTOMAIL_FROM not set — skipping email:', subject)
    return false
  }

  const token = process.env.ZEPTOMAIL_TOKEN
  const authorization = token.startsWith('Zoho-enczapikey') ? token : `Zoho-enczapikey ${token}`

  try {
    const response = await fetch(process.env.ZEPTOMAIL_API_URL || DEFAULT_API_URL, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        from: {
          address: process.env.ZEPTOMAIL_FROM,
          name: process.env.ZEPTOMAIL_FROM_NAME || 'KyaReFitting',
        },
        to: [{ email_address: { address: to } }],
        subject,
        htmlbody: html,
        ...(text ? { textbody: text } : {}),
      }),
      cache: 'no-store',
    })
    if (!response.ok) {
      console.error('[email] ZeptoMail send failed:', response.status, await safeText(response))
      return false
    }
    return true
  } catch (err) {
    console.error('[email] ZeptoMail error:', err?.message ?? err)
    return false
  }
}
