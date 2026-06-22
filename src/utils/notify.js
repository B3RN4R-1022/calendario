const CALLMEBOT = 'https://api.callmebot.com/whatsapp.php'

export async function sendToUser(profile, message) {
  if (!profile?.whatsapp_phone || !profile?.callmebot_key) return
  const params = new URLSearchParams({
    phone: profile.whatsapp_phone,
    text: message,
    apikey: profile.callmebot_key,
  })
  try {
    await fetch(`${CALLMEBOT}?${params}`, { mode: 'no-cors' })
  } catch (_) {}
}

export async function notifyBoth(profilesMap, message) {
  await Promise.all(Object.values(profilesMap).map(p => sendToUser(p, message)))
}
