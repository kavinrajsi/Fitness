# Google Health webhook subscriber

Near-real-time sync: Google Health pushes data-change notifications to this app, which
maps them to a user and re-syncs that user's `health_daily` — no waiting for the nightly
cron or a dashboard visit.

```
 Google Health  ──POST notification──▶  /api/webhooks/health
   (data change)                          │  verify secret
                                          │  healthUserId ─▶ profiles.google_health_user_id
                                          ▼
                                    syncUserHealth()  ──▶  health_daily / activity_sessions
```

## Moving parts (in this repo)

| Piece | Location |
|---|---|
| Receiver endpoint | `src/app/api/webhooks/health/route.js` |
| Per-user sync (shared with cron) | `src/lib/sync-user.js` → `syncUserHealth()` |
| healthUserId fetch | `src/lib/google-health.js` → `getHealthUserId()` (`GET /v4/users/me/identity`) |
| DB column + log source | `supabase/migrations/20260604000000_add_google_health_webhook_support.sql` |
| Shared secret | env `GOOGLE_HEALTH_WEBHOOK_SECRET` |

## Endpoint behavior

| Request | Response |
|---|---|
| Verification probe (`{"type":"verification"}`) **with** valid `Authorization` | `200` |
| Verification probe **without** valid `Authorization` | `401` |
| Notification with bad/missing secret | `401` |
| Notification, known `healthUserId` | sync user → `204` |
| Notification, unknown/uncaptured `healthUserId` | `204` (ack; captured on next sync) |
| Notification, processing error | `204` (ack; logged to `sync_logs`) |

`204` is required so Google stops retrying (it retries failed deliveries for up to 7 days).

## Setup

### 1. Set the secret (must match on both sides)

- Local: already added to `.env.local` as `GOOGLE_HEALTH_WEBHOOK_SECRET` (format `Bearer <random>`).
- Production: add the **same value** to Vercel env (`vercel env add GOOGLE_HEALTH_WEBHOOK_SECRET`).

### 2. Register the subscriber (one time, per GCP project)

Requires project-level credentials authorized for the Google Health API. Replace
`PROJECT_ID`, `SUBSCRIBER_ID`, your domain, and the secret (identical to the env value):

```http
POST https://health.googleapis.com/v4/projects/PROJECT_ID/subscribers?subscriberId=SUBSCRIBER_ID
Authorization: Bearer <project access token>
Content-Type: application/json

{
  "endpointUri": "https://YOUR_DOMAIN/api/webhooks/health",
  "subscriberConfigs": [
    {
      "dataTypes": ["steps", "active-energy-burned", "distance", "heart-rate", "weight", "height", "sleep", "exercise"],
      "subscriptionCreatePolicy": "AUTOMATIC"
    }
  ],
  "endpointAuthorization": {
    "secret": "Bearer <same value as GOOGLE_HEALTH_WEBHOOK_SECRET>"
  }
}
```

At registration Google sends the two verification probes; the endpoint must already be
deployed and the secret set. With `AUTOMATIC`, every consenting user is tracked
automatically — no per-user registration.

### 3. Capture `healthUserId`

The webhook can only map a notification once the user's `healthUserId` is stored. It is
captured automatically on each `syncUserHealth()` run (nightly cron and manual sync), so
existing users are mapped within ~24h or on their next manual sync.

## Notes & hardening

- **Signature**: each notification also includes a `GOOGLE-HEALTH-API-SIGNATURE` header
  (Tink public-key signature). This receiver verifies the shared `Authorization` secret
  only; full signature verification is a future hardening step.
- **Debounce**: each notification triggers a full per-user re-sync. If notification volume
  is high, consider debouncing (e.g. coalesce per user within a short window).
- Docs: https://developers.google.com/health/webhooks
