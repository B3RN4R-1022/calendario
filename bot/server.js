import express from 'express'
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  BufferJSON,
  initAuthCreds,
} from '@whiskeysockets/baileys'
import { wrapSocket } from 'baileys-antiban'
import { createClient } from '@supabase/supabase-js'
import pino from 'pino'

const app = express()
app.use(express.json())

// ── Config ────────────────────────────────────────────
const BOT_SECRET   = process.env.BOT_SECRET
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!BOT_SECRET || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Faltam variáveis: BOT_SECRET, SUPABASE_URL, SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const BUCKET   = 'whatsapp-auth'

// ── Auth persistida no Supabase Storage ───────────────
async function ensureBucket() {
  await supabase.storage.createBucket(BUCKET, { public: false }).catch(() => {})
}

async function readFile(key) {
  try {
    const { data, error } = await supabase.storage.from(BUCKET).download(key)
    if (error) return null
    return JSON.parse(await data.text(), BufferJSON.reviver)
  } catch { return null }
}

async function writeFile(key, value) {
  const json = JSON.stringify(value, BufferJSON.replacer)
  await supabase.storage.from(BUCKET)
    .upload(key, json, { upsert: true, contentType: 'application/json' })
}

async function useSupabaseAuthState() {
  await ensureBucket()
  let creds = await readFile('creds.json')
  if (!creds) creds = initAuthCreds()

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {}
          await Promise.all(ids.map(async id => {
            const val = await readFile(`${type}-${id}.json`)
            if (val) data[id] = val
          }))
          return data
        },
        set: async (data) => {
          const tasks = []
          for (const [cat, items] of Object.entries(data)) {
            for (const [id, value] of Object.entries(items)) {
              if (value) tasks.push(writeFile(`${cat}-${id}.json`, value))
            }
          }
          await Promise.all(tasks)
        },
      },
    },
    saveCreds: () => writeFile('creds.json', creds),
  }
}

// ── WhatsApp + antiban ────────────────────────────────
let sock        = null
let isConnected = false

async function connect() {
  const { state, saveCreds } = await useSupabaseAuthState()
  const { version }          = await fetchLatestBaileysVersion()

  const rawSock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys:  makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
    },
    printQRInTerminal: true,
    logger: pino({ level: 'silent' }),
  })

  // Wrap com antiban: simula digitação humana e varia conteúdo
  sock = wrapSocket(rawSock)

  rawSock.ev.on('creds.update', saveCreds)

  rawSock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    isConnected = connection === 'open'
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode
      if (code !== DisconnectReason.loggedOut) {
        console.log('🔄 Reconectando...')
        setTimeout(connect, 4000)
      } else {
        console.log('⚠️  Desconectado. Reinicie para escanear o QR novamente.')
      }
    } else if (connection === 'open') {
      console.log('✅ WhatsApp conectado com antiban ativo!')
    }
  })
}

connect()

// ── Segurança ─────────────────────────────────────────
app.use((req, res, next) => {
  if (req.path === '/health') return next()
  if (req.headers['x-bot-secret'] !== BOT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
})

// ── Endpoints ─────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true, connected: isConnected }))

app.post('/send', async (req, res) => {
  if (!isConnected) return res.status(503).json({ error: 'WhatsApp não conectado' })
  const { groupId, message } = req.body
  if (!groupId || !message) return res.status(400).json({ error: 'Falta groupId ou message' })
  try {
    await sock.sendMessage(groupId, { text: message })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/groups', async (_req, res) => {
  if (!isConnected) return res.status(503).json({ error: 'WhatsApp não conectado' })
  try {
    const groups = await sock.groupFetchAllParticipating()
    const list   = Object.entries(groups).map(([id, g]) => ({ id, name: g.subject }))
    res.json(list)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.listen(process.env.PORT || 3000, () => console.log('🤖 Bot rodando...'))
