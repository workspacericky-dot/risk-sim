import crypto from 'node:crypto'
import fs from 'node:fs'

const env = {}
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (!match) continue
  env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '')
}

const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Konfigurasi Supabase lokal tidak lengkap.')

const settingResponse = await fetch(`${url}/rest/v1/siwas_report_settings?report_key=eq.ketepatan_waktu&select=updated_at`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
})
if (!settingResponse.ok) throw new Error(`Pengambilan pengaturan gagal (${settingResponse.status}).`)
const [setting] = await settingResponse.json()
if (!setting) throw new Error('Pengaturan SIWAS belum tersedia.')

const payload = Buffer.from(JSON.stringify({
  sub: 'public-siwas-visitor',
  version: setting.updated_at,
  exp: Date.now() + 60 * 60 * 1000,
})).toString('base64url')
const signature = crypto.createHmac('sha256', key).update(payload).digest('base64url')
const reportResponse = await fetch('http://localhost:3000/api/siwas-report', {
  headers: { Cookie: `risk_sim_siwas_access=${payload}.${signature}` },
})
const html = await reportResponse.text()
if (!reportResponse.ok) throw new Error(`Laporan gagal dimuat (${reportResponse.status}).`)

for (const expected of [
  'id="siwas-inspektorat"',
  'value="150"',
  'Non-Inspektorat',
  'id="analisis-inspektorat"',
  '"assessable": 49778',
  'id="risiko-ekstrem"',
]) {
  if (!html.includes(expected)) throw new Error(`Markup tidak memuat ${expected}.`)
}

const script = html.match(/<script id="risk-sim-siwas-motion">([\s\S]*?)<\/script>/)?.[1]
if (!script) throw new Error('Skrip interaksi SIWAS tidak ditemukan.')
new Function(script)

console.log(JSON.stringify({
  status: reportResponse.status,
  htmlBytes: html.length,
  filterOptions: (html.match(/<option /g) || []).length,
  scriptSyntax: 'valid',
}))
