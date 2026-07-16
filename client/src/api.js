export async function okullariGetir() {
  const res = await fetch('/api/schools')
  if (!res.ok) throw new Error(`Veri alınamadı (${res.status})`)
  return res.json()
}

export async function okullariYenile(geminiEtkin) {
  const res = await fetch('/api/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ geminiEtkin }),
  })
  if (!res.ok) throw new Error(`Yenileme başarısız (${res.status})`)
  return res.json()
}
