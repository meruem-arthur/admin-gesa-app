// Sends a push notification to the given Expo push tokens.
//
// Called only by the admin dashboard (same origin), so there is no CORS header:
// other websites can't call it from a browser. Callers must also prove they are an
// admin: the dashboard sends the signed-in user's Firebase ID token, and we ask
// Firestore (using that token, so your security rules apply) whether that user is in
// the /admins allowlist. No secrets are needed for this check.

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const PROJECT_ID    = process.env.FIREBASE_PROJECT_ID || 'gesa-app-2026'
const MAX_PER_CALL  = 100            // Expo rejects more than 100 messages per request
const MAX_TOKENS    = 5000

async function isAdmin(authHeader) {
  const match = /^Bearer (.+)$/.exec(authHeader || '')
  if (!match) return false
  const idToken = match[1]
  let uid
  try {
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString())
    uid = payload.user_id || payload.sub
  } catch { return false }
  if (!uid || !/^[A-Za-z0-9]+$/.test(uid)) return false
  try {
    // Firestore verifies the token's signature and applies the rules to this read.
    // Only admins may read /admins/{uid}, so a 200 means "this user is an admin".
    const r = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/admins/${uid}`,
      { headers: { Authorization: `Bearer ${idToken}` } },
    )
    return r.ok
  } catch { return false }
}

const isExpoToken = t => typeof t === 'string' && /^Expo(nent)?PushToken\[.+\]$/.test(t)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!(await isAdmin(req.headers.authorization))) {
    return res.status(401).json({ error: 'Not authorised. Sign in to the dashboard as an admin.' })
  }

  const { tokens, title, body } = req.body || {}
  if (!Array.isArray(tokens) || !tokens.length) return res.status(400).json({ error: 'No tokens provided' })
  if (typeof title !== 'string' || typeof body !== 'string' || !title.trim() || !body.trim()) {
    return res.status(400).json({ error: 'Title and message are required' })
  }

  const valid = [...new Set(tokens.filter(isExpoToken))].slice(0, MAX_TOKENS)
  if (!valid.length) return res.status(400).json({ error: 'No valid push tokens' })

  const result = { ok: true, attempted: valid.length, sent: 0, failed: 0, deadTokens: [], errors: {} }

  try {
    for (let i = 0; i < valid.length; i += MAX_PER_CALL) {
      const chunk = valid.slice(i, i + MAX_PER_CALL)
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(chunk.map(to => ({
          to,
          sound: 'default',
          title: title.trim().slice(0, 80),
          body: body.trim().slice(0, 200),
          channelId: 'default',      // the high-importance channel the app creates on Android
          priority: 'high',
        }))),
      })
      const json = await response.json().catch(() => ({}))
      const tickets = Array.isArray(json.data) ? json.data : null

      if (!response.ok || !tickets) {
        const why = json.errors?.[0]?.message || `Expo returned HTTP ${response.status}`
        result.failed += chunk.length
        result.errors[why] = (result.errors[why] || 0) + chunk.length
        continue
      }

      // One ticket per message, in order. "ok" means Expo accepted it for delivery.
      tickets.forEach((ticket, idx) => {
        if (ticket.status === 'ok') { result.sent += 1; return }
        result.failed += 1
        const code = ticket.details?.error || ticket.message || 'Unknown error'
        result.errors[code] = (result.errors[code] || 0) + 1
        if (ticket.details?.error === 'DeviceNotRegistered') result.deadTokens.push(chunk[idx])
      })
    }
    return res.status(200).json(result)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
