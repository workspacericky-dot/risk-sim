'use server'

import { createClient } from '@/utils/supabase/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

type ExtractionRow = {
  pernyataan_risiko: string
  sumber_risiko: string | null
  dampak_potensial: string | null
  konteks: {
    tahun_penerapan: number
    selera_risiko: number
    unit: { nama_unit: string; tingkat: number } | null
  } | null
  analisis: {
    level_kemungkinan: number
    level_dampak: number
    status_risiko: number
    di_atas_selera_risiko: boolean
    existing_control: string | null
    rtp: {
      kegiatan_pengendalian: string | null
      target_waktu: string | null
      status_risiko_treated: number | null
    }[]
  }[]
}

function scoreColor(score: number): string {
  if (score >= 15) return '#ef4444'
  if (score >= 8) return '#f5a623'
  return '#22c55e'
}

function scoreLabel(score: number): string {
  if (score >= 15) return 'TINGGI'
  if (score >= 8) return 'SEDANG'
  return 'RENDAH'
}

function truncate(str: string | null | undefined, max: number): string {
  if (!str) return '-'
  return str.length > max ? str.slice(0, max) + '…' : str
}

export async function generateMarpSlides(): Promise<{ filePath: string; fileName: string }> {
  const supabase = await createClient()

  const { data: rows, error } = await supabase
    .from('risiko')
    .select(`
      pernyataan_risiko,
      sumber_risiko,
      dampak_potensial,
      konteks:penetapan_konteks!inner(
        tahun_penerapan,
        selera_risiko,
        unit:unit_kerja_id(nama_unit, tingkat)
      ),
      analisis:analisis_risiko(
        level_kemungkinan, level_dampak, status_risiko, di_atas_selera_risiko, existing_control,
        rtp(kegiatan_pengendalian, target_waktu, status_risiko_treated)
      )
    `)
    .order('created_at', { ascending: false }) as { data: ExtractionRow[] | null; error: unknown }

  if (error || !rows) throw new Error('Gagal mengambil data risiko.')

  const now = new Date()
  const bulan = now.toLocaleString('id-ID', { month: 'long', year: 'numeric' })
  const tahunList = [...new Set(rows.map((r) => {
    const k = Array.isArray(r.konteks) ? r.konteks[0] : r.konteks
    return k?.tahun_penerapan
  }).filter(Boolean))].join(', ')

  const totalRisiko = rows.length
  const prioritasRows = rows.filter((r) => {
    const a = r.analisis?.[0]
    return a?.di_atas_selera_risiko
  })
  const totalPrioritas = prioritasRows.length
  const withRtp = rows.filter((r) => r.analisis?.[0]?.rtp?.[0]?.kegiatan_pengendalian).length

  // Group by unit
  const byUnit = new Map<string, { count: number; prioritas: number }>()
  for (const row of rows) {
    const k = Array.isArray(row.konteks) ? row.konteks[0] : row.konteks
    const unitName = (k?.unit as any)?.nama_unit ?? 'Unknown'
    const isPrioritas = row.analisis?.[0]?.di_atas_selera_risiko ?? false
    const existing = byUnit.get(unitName) ?? { count: 0, prioritas: 0 }
    byUnit.set(unitName, { count: existing.count + 1, prioritas: existing.prioritas + (isPrioritas ? 1 : 0) })
  }
  const topUnits = [...byUnit.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 5)

  // Risk distribution for stacked bar (we'll use SVG)
  const tinggi = rows.filter((r) => (r.analisis?.[0]?.status_risiko ?? 0) >= 15).length
  const sedang = rows.filter((r) => { const s = r.analisis?.[0]?.status_risiko ?? 0; return s >= 8 && s < 15 }).length
  const rendah = rows.filter((r) => (r.analisis?.[0]?.status_risiko ?? 0) < 8).length

  // Top priority risks for detail slide (max 6)
  const topPrioritas = prioritasRows.slice(0, 6).map((r) => {
    const k = Array.isArray(r.konteks) ? r.konteks[0] : r.konteks
    const a = r.analisis?.[0]
    const rtp = a?.rtp?.[0]
    return {
      unit: (k?.unit as any)?.nama_unit ?? '-',
      pernyataan: r.pernyataan_risiko,
      skor: a?.status_risiko ?? 0,
      rtp: rtp?.kegiatan_pengendalian ?? null,
      skorTarget: rtp?.status_risiko_treated ?? null,
    }
  })

  const healthPct = totalRisiko > 0 ? Math.round(((totalRisiko - totalPrioritas) / totalRisiko) * 100) : 100
  // Donut: r=60, circ=~377
  const circ = 2 * Math.PI * 60
  const offset = circ - (circ * healthPct / 100)

  const marp = `---
marp: true
theme: default
paginate: true
style: |
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Raleway:wght@100;200;300&display=swap');

  :root {
    --a: #1e6b3f;
    --a2: #22c55e;
    --bg: #0a0f0c;
    --s: #0f1812;
    --b: #1a2e20;
    --m: #555;
    --t: #fff;
    --g: #22c55e;
    --r: #ef4444;
    --y: #f5a623;
    --body: #999;
    --label: #666;
  }

  section {
    background: var(--bg);
    color: var(--t);
    font-family: 'Raleway', sans-serif;
    font-weight: 200;
    padding: 56px 72px;
    line-height: 1.5;
  }

  h1 { font-family: 'Outfit'; font-weight: 800; font-size: 2.8em; color: var(--t); letter-spacing: -0.03em; line-height: 1; margin: 0 0 4px; }
  h2 { font-family: 'Raleway'; font-weight: 100; font-size: 1.2em; color: #888; margin: 0 0 20px; }
  h3 { font-family: 'Outfit'; font-weight: 600; font-size: 0.58em; color: var(--m); text-transform: uppercase; letter-spacing: 0.2em; margin: 0 0 12px; }
  strong { color: var(--a2); font-weight: 400; }

  section.lead { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
  section.lead h1 { font-size: 3.4em; }

  section::after { font-family: 'Outfit'; font-size: 0.6em; color: #151515; }

  .card { background: var(--s); border: 1px solid var(--b); border-radius: 12px; padding: 20px; position: relative; overflow: hidden; }
  .card-accent { position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: linear-gradient(90deg, var(--a2), transparent); }
  .tag { font-family: 'Outfit'; font-weight: 600; font-size: 0.52em; letter-spacing: 0.1em; text-transform: uppercase; padding: 3px 10px; border-radius: 4px; display: inline-block; }
  .row { border-radius: 6px; padding: 0 8px; }
---

<!-- _class: lead -->
<!-- _paginate: false -->

![bg brightness:0.08](https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1400)

# Laporan Manajemen Risiko

<div style="font-family: 'Raleway'; font-weight: 100; font-size: 0.9em; color: #ffffff55; margin-top: 8px;">Mahkamah Agung RI · ${bulan}</div>

<div style="display: flex; gap: 8px; margin-top: 24px; flex-wrap: wrap; justify-content: center;">
  <span style="background: #22c55e15; border: 1px solid #22c55e33; border-radius: 20px; padding: 4px 14px; font-family: 'Outfit'; font-size: 0.52em; color: #22c55eaa; font-weight: 400;">${totalRisiko} Risiko Teridentifikasi</span>
  <span style="background: #ef444415; border: 1px solid #ef444433; border-radius: 20px; padding: 4px 14px; font-family: 'Outfit'; font-size: 0.52em; color: #ef4444aa; font-weight: 400;">${totalPrioritas} Risiko Prioritas</span>
  <span style="background: #f5a62315; border: 1px solid #f5a62333; border-radius: 20px; padding: 4px 14px; font-family: 'Outfit'; font-size: 0.52em; color: #f5a623aa; font-weight: 400;">Tahun ${tahunList}</span>
</div>

---

### Ringkasan Eksekutif

<div style="display: flex; gap: 14px; margin-top: 4px;">
  <div class="card" style="flex: 1;">
    <div class="card-accent"></div>
    <div style="font-family: 'Outfit'; font-weight: 600; font-size: 0.52em; color: var(--m); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 10px;">Total Risiko</div>
    <div style="font-family: 'Outfit'; font-size: 2.4em; font-weight: 800; color: var(--t); line-height: 1;">${totalRisiko}</div>
    <div style="font-size: 0.65em; color: var(--body); margin-top: 6px;">Risiko teridentifikasi</div>
  </div>
  <div class="card" style="flex: 1;">
    <div style="position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: linear-gradient(90deg, var(--r), transparent);"></div>
    <div style="font-family: 'Outfit'; font-weight: 600; font-size: 0.52em; color: var(--m); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 10px;">Risiko Prioritas</div>
    <div style="font-family: 'Outfit'; font-size: 2.4em; font-weight: 800; color: var(--r); line-height: 1;">${totalPrioritas}</div>
    <div style="font-size: 0.65em; color: var(--body); margin-top: 6px;">Di atas selera risiko</div>
  </div>
  <div class="card" style="flex: 1;">
    <div style="position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: linear-gradient(90deg, var(--y), transparent);"></div>
    <div style="font-family: 'Outfit'; font-weight: 600; font-size: 0.52em; color: var(--m); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 10px;">Sudah Mitigasi</div>
    <div style="font-family: 'Outfit'; font-size: 2.4em; font-weight: 800; color: var(--y); line-height: 1;">${withRtp}</div>
    <div style="font-size: 0.65em; color: var(--body); margin-top: 6px;">Memiliki RTP aktif</div>
  </div>
  <div class="card" style="flex: 1;">
    <div style="position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: linear-gradient(90deg, var(--g), transparent);"></div>
    <div style="font-family: 'Outfit'; font-weight: 600; font-size: 0.52em; color: var(--m); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 10px;">Indeks Kesehatan</div>
    <div style="font-family: 'Outfit'; font-size: 2.4em; font-weight: 800; color: var(--g); line-height: 1;">${healthPct}%</div>
    <div style="font-size: 0.65em; color: var(--body); margin-top: 6px;">Risiko dalam toleransi</div>
  </div>
</div>

---

### Distribusi Level Risiko

<div style="display: flex; gap: 28px; align-items: center; margin-top: 12px;">
  <div style="flex: 1;">
    ${[
      { label: 'TINGGI (≥15)', count: tinggi, color: '#ef4444', pct: totalRisiko > 0 ? Math.round(tinggi/totalRisiko*100) : 0 },
      { label: 'SEDANG (8–14)', count: sedang, color: '#f5a623', pct: totalRisiko > 0 ? Math.round(sedang/totalRisiko*100) : 0 },
      { label: 'RENDAH (<8)', count: rendah, color: '#22c55e', pct: totalRisiko > 0 ? Math.round(rendah/totalRisiko*100) : 0 },
    ].map(({ label, count, color, pct }) => `
    <div style="margin-bottom: 18px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <span style="font-family: 'Outfit'; font-size: 0.55em; color: #aaa; letter-spacing: 0.05em;">${label}</span>
        <span style="font-family: 'Outfit'; font-weight: 700; font-size: 0.7em; color: ${color};">${count}</span>
      </div>
      <div style="background: #1a2020; border-radius: 4px; height: 8px; overflow: hidden;">
        <div style="height: 100%; width: ${pct}%; background: ${color}; border-radius: 4px;"></div>
      </div>
    </div>`).join('')}
  </div>

  <div style="flex: 0 0 180px; display: flex; flex-direction: column; align-items: center;">
    <svg width="160" height="160" viewBox="0 0 160 160">
      <circle cx="80" cy="80" r="60" fill="none" stroke="#1a2020" stroke-width="20"/>
      <circle cx="80" cy="80" r="60" fill="none" stroke="${healthPct >= 70 ? '#22c55e' : healthPct >= 40 ? '#f5a623' : '#ef4444'}" stroke-width="20"
        stroke-dasharray="${circ.toFixed(1)}"
        stroke-dashoffset="${offset.toFixed(1)}"
        transform="rotate(-90 80 80)"
        stroke-linecap="round"/>
      <text x="80" y="76" text-anchor="middle" font-family="Outfit" font-weight="800" font-size="22" fill="white">${healthPct}%</text>
      <text x="80" y="95" text-anchor="middle" font-family="Raleway" font-weight="200" font-size="10" fill="#666">Sehat</text>
    </svg>
    <div style="font-size: 0.6em; color: var(--body); text-align: center; margin-top: 4px;">Indeks Kesehatan Risiko</div>
  </div>
</div>

---

### Satuan Kerja dengan Risiko Terbanyak

<div style="margin-top: 8px; display: flex; flex-direction: column; gap: 10px;">
  ${topUnits.map(([unitName, data], i) => {
    const barPct = topUnits[0][1].count > 0 ? Math.round(data.count / topUnits[0][1].count * 100) : 0
    const prioBarPct = data.count > 0 ? Math.round(data.prioritas / data.count * 100) : 0
    return `
  <div class="card row" style="padding: 12px 16px;">
    <div class="card-accent"></div>
    <div style="display: flex; align-items: center; gap: 12px;">
      <div style="font-family: 'Outfit'; font-weight: 800; font-size: 1.1em; color: #1a2e20; background: var(--a2); border-radius: 6px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; shrink: 0;">${i + 1}</div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-family: 'Outfit'; font-weight: 600; font-size: 0.65em; color: var(--t); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${truncate(unitName, 60)}</div>
        <div style="margin-top: 4px; background: #111; border-radius: 3px; height: 5px; overflow: hidden;">
          <div style="height: 100%; width: ${barPct}%; background: linear-gradient(90deg, var(--a2), #1a5c30); border-radius: 3px;"></div>
        </div>
      </div>
      <div style="text-align: right; shrink: 0;">
        <span style="font-family: 'Outfit'; font-weight: 700; font-size: 0.75em; color: var(--t);">${data.count}</span>
        <span style="font-size: 0.55em; color: var(--body);"> risiko</span>
        ${data.prioritas > 0 ? `<span style="font-family: 'Outfit'; font-size: 0.52em; color: var(--r); margin-left: 6px; background: #ef444415; border: 1px solid #ef444422; border-radius: 4px; padding: 1px 6px;">${data.prioritas} prioritas</span>` : ''}
      </div>
    </div>
  </div>`}).join('\n')}
</div>

---

### Daftar Risiko Prioritas

${topPrioritas.length === 0 ? `
<div style="display: flex; align-items: center; justify-content: center; height: 200px; color: var(--body); font-style: italic; font-size: 0.8em;">
  Tidak ada risiko prioritas saat ini.
</div>` : `
<div style="margin-top: 4px; display: flex; flex-direction: column; gap: 8px;">
  ${topPrioritas.map((r, i) => `
  <div class="card" style="padding: 12px 16px;">
    <div style="position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: linear-gradient(90deg, ${scoreColor(r.skor)}, transparent);"></div>
    <div style="display: flex; align-items: flex-start; gap: 12px;">
      <span style="background: ${scoreColor(r.skor)}22; border: 1px solid ${scoreColor(r.skor)}44; border-radius: 6px; padding: 2px 8px; font-family: 'Outfit'; font-weight: 700; font-size: 0.65em; color: ${scoreColor(r.skor)}; shrink: 0;">${r.skor} · ${scoreLabel(r.skor)}</span>
      <div style="flex: 1; min-width: 0;">
        <div style="font-size: 0.68em; color: #ccc; font-weight: 300; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${truncate(r.pernyataan, 90)}</div>
        <div style="font-size: 0.55em; color: var(--body); margin-top: 2px;">${truncate(r.unit, 50)} ${r.rtp ? '· <span style="color:#22c55e">✓ Ada RTP</span>' : '· <span style="color:#ef4444">Belum ada RTP</span>'}</div>
      </div>
      ${r.skorTarget != null ? `<span style="font-family: 'Outfit'; font-weight: 700; font-size: 0.65em; color: #22c55e; shrink: 0;">→ ${r.skorTarget}</span>` : ''}
    </div>
  </div>`).join('\n')}
</div>`}

---

<!-- _class: lead -->
<!-- _paginate: false -->

# Penutup

<div style="font-family: 'Raleway'; font-weight: 100; font-size: 1em; color: #ffffff44; margin-top: 12px;">
  Laporan ini dibuat secara otomatis dari sistem<br/>Risk-Sim Analytics · Mahkamah Agung RI
</div>

<div style="margin-top: 32px; font-size: 0.65em; color: #555;">${bulan}</div>
`

  // Write to public/generated-slides/
  const dir = path.join(process.cwd(), 'public', 'generated-slides')
  await mkdir(dir, { recursive: true })

  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const fileName = `laporan-risiko-${timestamp}.md`
  const filePath = path.join(dir, fileName)
  await writeFile(filePath, marp, 'utf-8')

  return { filePath, fileName }
}
