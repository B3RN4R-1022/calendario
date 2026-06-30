import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const CALLMEBOT = 'https://api.callmebot.com/whatsapp.php'

async function send(phone, key, message) {
  const params = new URLSearchParams({ phone, text: message, apikey: key })
  return fetch(`${CALLMEBOT}?${params}`).catch(() => {})
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const { toAll, excludeUserId, toUserId, message } = req.body || {}
  if (!message) return res.status(400).json({ error: 'message required' })

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, whatsapp_phone, callmebot_key')

  let targets = profiles || []
  if (toUserId)      targets = targets.filter(p => p.id === toUserId)
  else if (excludeUserId) targets = targets.filter(p => p.id !== excludeUserId)

  await Promise.allSettled(
    targets
      .filter(p => p.whatsapp_phone && p.callmebot_key)
      .map(p => send(p.whatsapp_phone, p.callmebot_key, message))
  )

  res.json({ ok: true, sent: targets.length })
}
