export default async function handler(req, res) {
  // Allow CORS from your admin dashboard
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { tokens, title, body } = req.body
  if (!tokens?.length) return res.status(400).json({ error: 'No tokens provided' })

  const messages = tokens.map(to => ({ to, sound: 'default', title, body }))

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    })
    const data = await response.json()
    return res.status(200).json({ ok: true, data })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
