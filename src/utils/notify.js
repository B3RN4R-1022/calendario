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

export function sendToUser(profile, message) {
  if (!profile?.id) return
  post({ toUserId: profile.id, message })
}

export function notifyBoth(profilesMap, message) {
  post({ toAll: true, message })
}
