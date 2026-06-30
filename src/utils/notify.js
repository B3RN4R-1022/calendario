const API = '/api/notify'

async function post(body) {
  try {
    await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (_) {}
}

// Notifica todos MENOS o usuário atual
export function notifyOther(currentUserId, message) {
  post({ excludeUserId: currentUserId, message })
}

// Notifica todos
export function notifyBoth(_profilesMap, message) {
  post({ toAll: true, message })
}
