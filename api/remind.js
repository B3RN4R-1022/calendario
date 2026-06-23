import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const CALLMEBOT = 'https://api.callmebot.com/whatsapp.php'

async function callMeBot(phone, key, message) {
  const params = new URLSearchParams({ phone, text: message, apikey: key })
  return fetch(`${CALLMEBOT}?${params}`).catch(() => {})
}

export default async function handler(req, res) {
  if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, name, whatsapp_phone, callmebot_key')

  if (!profiles?.length) return res.json({ sent: 0 })

  const now = new Date()
  const TZ = 'America/Sao_Paulo'
  const brtParts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(now).map(p => [p.type, p.value])
  )
  const todayDate = `${brtParts.year}-${brtParts.month}-${brtParts.day}`
  const hour = Number(brtParts.hour) % 24
  const minute = Number(brtParts.minute)
  const tasks = []
  let sent = 0

  // ── Resumo matinal às 05:30 ───────────────────────────
  if (hour === 5 && minute >= 25 && minute < 35) {
    const morningKey = `morning_${todayDate}`
    const { data: alreadySent } = await supabase
      .from('notif_log')
      .select('key')
      .eq('key', morningKey)
      .maybeSingle()

    if (!alreadySent) {
      const { data: todayEvents } = await supabase
        .from('events')
        .select('*')
        .eq('date', todayDate)
        .order('time', { ascending: true })

      let msg
      if (todayEvents?.length) {
        const lines = todayEvents.map(ev => {
          const profile = profiles.find(p => p.id === ev.user_id)
          const who = ev.is_shared ? '❤️ Os dois' : (profile?.name || '')
          return `• ${ev.time} — ${ev.title} (${who})`
        }).join('\n')
        msg = `☀️ *Bom dia! Compromissos de hoje:*\n${lines}`
      } else {
        msg = `☀️ *Bom dia!* Nenhum compromisso hoje. 🎉`
      }

      profiles.filter(p => p.whatsapp_phone && p.callmebot_key).forEach(p => {
        tasks.push(callMeBot(p.whatsapp_phone, p.callmebot_key, msg))
      })
      tasks.push(supabase.from('notif_log').insert({ key: morningKey }))
      sent++
    }
  }

  // ── Lembretes por compromisso ─────────────────────────
  const [ty, tm, td] = todayDate.split('-').map(Number)
  const tomorrow = new Date(Date.UTC(ty, tm - 1, td + 1))
  const tomorrowDate = tomorrow.toISOString().slice(0, 10)
  const dates = [todayDate, tomorrowDate]

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .in('date', dates)

  for (const ev of events || []) {
    const evTime = new Date(`${ev.date}T${ev.time}:00-03:00`)
    const diffMin = (evTime - now) / 60000

    const owner   = profiles.find(p => p.id === ev.user_id)
    const partner = profiles.find(p => p.id !== ev.user_id)
    const active  = profiles.filter(p => p.whatsapp_phone && p.callmebot_key)

    // 3h antes → avisa o dono (ou os dois se compartilhado)
    if (!ev.notified_3h && diffMin > 170 && diffMin <= 185) {
      const msg = `⏰ *Daqui 3 horas:*\n${ev.title} às ${ev.time}`
      if (ev.is_shared) {
        active.forEach(p => tasks.push(callMeBot(p.whatsapp_phone, p.callmebot_key, msg)))
      } else if (owner?.whatsapp_phone) {
        tasks.push(callMeBot(owner.whatsapp_phone, owner.callmebot_key, msg))
      }
      tasks.push(supabase.from('events').update({ notified_3h: true }).eq('id', ev.id))
      sent++
    }

    // 1h antes → avisa o dono (ou os dois se compartilhado)
    if (!ev.notified_1h && diffMin > 50 && diffMin <= 65) {
      const msg = `⏰ *Daqui 1 hora:*\n${ev.title} às ${ev.time}`
      if (ev.is_shared) {
        active.forEach(p => tasks.push(callMeBot(p.whatsapp_phone, p.callmebot_key, msg)))
      } else if (owner?.whatsapp_phone) {
        tasks.push(callMeBot(owner.whatsapp_phone, owner.callmebot_key, msg))
      }
      tasks.push(supabase.from('events').update({ notified_1h: true }).eq('id', ev.id))
      sent++
    }

    // Na hora → avisa o OUTRO: "Fulano está em: [evento]"
    if (!ev.notified_now && diffMin > -5 && diffMin <= 5) {
      if (ev.is_shared) {
        const msg = `🔔 *Para os dois agora:*\n${ev.title} às ${ev.time}`
        active.forEach(p => tasks.push(callMeBot(p.whatsapp_phone, p.callmebot_key, msg)))
      } else if (partner?.whatsapp_phone) {
        const msg = `🔔 *${owner?.name || 'Alguém'} está em:*\n${ev.title}`
        tasks.push(callMeBot(partner.whatsapp_phone, partner.callmebot_key, msg))
      }
      tasks.push(supabase.from('events').update({ notified_now: true }).eq('id', ev.id))
      sent++
    }
  }

  await Promise.allSettled(tasks)
  return res.json({ sent })
}
