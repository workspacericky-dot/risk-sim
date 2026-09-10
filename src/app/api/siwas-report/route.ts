import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { cookies } from 'next/headers'
import { SIWAS_COOKIE, SIWAS_PUBLIC_SUBJECT, getSiwasSetting, isUnlockTokenValid } from '@/lib/siwas-access'

export const dynamic = 'force-dynamic'

const enhancementStyles = String.raw`
<style id="risk-sim-siwas-theme">
@font-face{font-family:Inter;src:url('/fonts/Inter-Variable.ttf') format('truetype');font-weight:100 900;font-display:swap}
@font-face{font-family:'IBM Plex Serif';src:url('/fonts/IBMPlexSerif-Regular.ttf') format('truetype');font-weight:400;font-display:swap}
@font-face{font-family:'IBM Plex Serif';src:url('/fonts/IBMPlexSerif-Bold.ttf') format('truetype');font-weight:700;font-display:swap}
:root{--blue:#087f5b;--blue-dark:#6ee7b7;--paper:#e4edf3;--pearl:#f2f7fa;--dark:#0f172a;--hair:#d6e3eb}
html{scroll-padding-top:104px}
body{font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:linear-gradient(160deg,#e4edf3 0%,#d6e8f5 45%,#cbe2f4 100%);background-attachment:fixed}
h1,h2,h3{font-family:'IBM Plex Serif',ui-serif,Georgia,serif;letter-spacing:-.025em}
.global-nav{background:rgba(15,23,42,.94);backdrop-filter:blur(18px)}
.sub-nav{background:rgba(255,255,255,.82);box-shadow:0 10px 35px rgba(15,23,42,.06)}
.hero,.section:not(.dark),footer{background-color:rgba(255,255,255,.7)}
.parchment{background:rgba(228,237,243,.86)!important}
.chart-panel,.utility-card,.sla-card,.comparison-card,.table-shell,.formula-note article{box-shadow:0 12px 35px rgba(15,23,42,.07);transition:transform .35s ease,box-shadow .35s ease,border-color .35s ease}
.utility-card:hover,.sla-card:hover,.comparison-card:hover,.formula-note article:hover{transform:translateY(-7px);box-shadow:0 22px 48px rgba(15,23,42,.14);border-color:rgba(110,231,183,.55)}
.hero-stat,.kpi,.insight,.evidence-grid article{transition:transform .3s ease,background-color .3s ease}
.hero-stat:hover{transform:translateY(-5px);background:#f0fdf4}
.kpi:hover,.insight:hover,.evidence-grid article:hover{transform:translateY(-4px)}
.pill{transition:transform .25s ease,box-shadow .25s ease,background-color .25s ease}.pill:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(8,127,91,.28)}
.chart-panel svg rect[fill="#0066cc"],.chart-panel svg circle[fill="#0066cc"]{fill:#087f5b}.chart-panel svg polyline[stroke="#0066cc"],.chart-panel svg circle[stroke="#0066cc"]{stroke:#087f5b}
.sla-comparison{margin-top:40px}.sla-comparison h3{margin-bottom:8px}.sla-comparison>p{margin:0 0 18px;color:#cbd5e1}.sla-change-table{min-width:820px}.sla-change-table th:not(:first-child),.sla-change-table td:not(:first-child){text-align:right}.status-pill{display:inline-block;border-radius:999px;padding:4px 9px;font-size:12px;font-weight:700;white-space:nowrap}.status-tight{background:#fff1f0;color:#b42318}.status-same{background:#f2f4f7;color:#475467}.status-longer{background:#ecfdf3;color:#067647}.sla-reading{border-left:4px solid var(--blue-dark);margin-top:20px;padding:4px 0 4px 20px;color:#dbe4ee}.sla-reading strong{color:#fff}
.siwas-filter{background:rgba(15,23,42,.96);color:#fff;padding:18px 24px;border-bottom:1px solid rgba(255,255,255,.1)}.siwas-filter-inner{width:min(1180px,100%);margin:auto;display:flex;align-items:center;justify-content:space-between;gap:24px}.siwas-filter-copy b{display:block;font-family:'IBM Plex Serif',ui-serif,serif;font-size:19px}.siwas-filter-copy span{display:block;color:#aebdca;font-size:13px;margin-top:2px}.siwas-filter-control{display:flex;align-items:center;gap:10px}.siwas-filter label{font-size:13px;color:#dbe4ee}.siwas-filter select{min-width:260px;border:1px solid rgba(255,255,255,.25);border-radius:12px;background:#fff;color:#0f172a;padding:11px 38px 11px 14px;font:600 14px Inter,system-ui,sans-serif;cursor:pointer}.filter-context{display:inline-flex;align-items:center;border-radius:999px;background:#dff7ec;color:#087f5b;padding:7px 12px;font-size:13px;font-weight:700;margin-bottom:14px}.filtered-analysis[hidden]{display:none!important}.filtered-bars{display:grid;gap:13px}.filtered-bar{display:grid;grid-template-columns:minmax(210px,1fr) minmax(220px,2fr) 70px;gap:14px;align-items:center}.filtered-bar-label{font-size:14px}.filtered-bar-track{height:12px;background:#e5e7eb;border-radius:999px;overflow:hidden}.filtered-bar-track i{display:block;height:100%;background:linear-gradient(90deg,#087f5b,#34d399);border-radius:inherit;transition:width .55s cubic-bezier(.2,.8,.2,1)}.filtered-bar-value{text-align:right;font-size:14px;font-weight:700}.filtered-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:34px}.filtered-grid h3{font-size:23px;margin-bottom:16px}.empty-state{padding:36px;border:1px dashed #94a3b8;border-radius:16px;text-align:center;color:#64748b}.scope-note{margin-top:18px!important;padding:14px 16px;border-radius:12px;background:rgba(110,231,183,.1);color:#d8f8e9!important;font-size:14px!important}
.reveal{opacity:0;transform:translateY(30px);transition:opacity .75s cubic-bezier(.2,.8,.2,1),transform .75s cubic-bezier(.2,.8,.2,1)}.reveal.is-visible{opacity:1;transform:none}
@media(max-width:760px){.siwas-filter-inner{align-items:stretch;flex-direction:column;gap:12px}.siwas-filter-control{align-items:stretch;flex-direction:column}.siwas-filter select{width:100%;min-width:0}.filtered-bar{grid-template-columns:1fr 62px}.filtered-bar-track{grid-column:1/-1;grid-row:2}.filtered-grid{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.reveal{opacity:1;transform:none;transition:none}*{animation-duration:.01ms!important;transition-duration:.01ms!important}}
@media print{body{background:#fff}.reveal{opacity:1;transform:none}}
</style>`

const slaComparisonMarkup = String.raw`
<div class="sla-comparison">
  <h3>Perubahan standar waktu penanganan</h3>
  <p>Perbandingan standar waktu dalam LKjIP Bawas 2024 dan 2025. Standar tahun 2025 mengikuti SOP Penanganan Pengaduan 2024 serta memperlihatkan jalur yang mengalami pengetatan dan jalur yang tetap atau memperoleh waktu lebih panjang.</p>
  <div class="table-shell">
    <table class="sla-change-table">
      <thead><tr><th>Jenis tindak lanjut</th><th>Standar 2024</th><th>Standar 2025</th><th>Perubahan</th></tr></thead>
      <tbody>
        <tr><td><strong>Pengarsipan / Arsip</strong></td><td>23 hari kerja</td><td>23 hari kerja</td><td><span class="status-pill status-same">Tetap</span></td></tr>
        <tr><td><strong>Gabung Berkas</strong></td><td>23 hari kerja</td><td>23 hari kerja</td><td><span class="status-pill status-same">Tetap</span></td></tr>
        <tr><td><strong>Delegasi Pemeriksaan</strong></td><td>74 hari kerja (PTB)</td><td>41 hari kerja</td><td><span class="status-pill status-tight">−33 hari · −44,6%</span></td></tr>
        <tr><td><strong>Konfirmasi</strong></td><td>49 hari kerja</td><td>45 hari kerja</td><td><span class="status-pill status-tight">−4 hari · −8,2%</span></td></tr>
        <tr><td><strong>Klarifikasi</strong></td><td>95 hari kerja</td><td>48 hari kerja</td><td><span class="status-pill status-tight">−47 hari · −49,5%</span></td></tr>
        <tr><td><strong>Memorandum / Delegasi Internal</strong></td><td>46 hari kerja</td><td>48 hari kerja</td><td><span class="status-pill status-longer">+2 hari · +4,3%</span></td></tr>
        <tr><td><strong>Jawab Surat / Surat Jawaban</strong></td><td>46 hari kerja</td><td>48 hari kerja</td><td><span class="status-pill status-longer">+2 hari · +4,3%</span></td></tr>
        <tr><td><strong>Pelaksanaan Pemantauan</strong></td><td>46 hari kerja</td><td>48 hari kerja</td><td><span class="status-pill status-longer">+2 hari · +4,3%</span></td></tr>
        <tr><td><strong>Pemeriksaan oleh Tim Bawas</strong></td><td>66 hari kerja</td><td>80 hari kerja</td><td><span class="status-pill status-longer">+14 hari · +21,2%</span></td></tr>
        <tr><td><strong>Pencabutan</strong></td><td>46 hari kerja</td><td>Tidak tercantum</td><td><span class="status-pill status-same">Tidak diperbandingkan</span></td></tr>
      </tbody>
    </table>
  </div>
  <p class="sla-reading"><strong>Makna pengetatan.</strong> Penurunan paling tajam terjadi pada Klarifikasi dan Delegasi Pemeriksaan, masing-masing hampir separuh dari standar sebelumnya. Namun perubahan tidak berlaku merata untuk semua jalur. Setelah dibobot dengan komposisi penyelesaian tiap jenis tindak lanjut, rata-rata waktu yang tersedia turun dari 53,8 menjadi 41,4 hari kerja atau 23,1%. Pada saat yang sama, pengaduan masuk meningkat 28,8%; kombinasi tenggat efektif yang lebih singkat dan volume yang lebih tinggi memperkuat alasan penggunaan target transisi serta kebutuhan metode kerja yang lebih efisien.</p>
</div>`

const filterMarkup = String.raw`
<aside class="siwas-filter" aria-label="Filter laporan per inspektorat"><div class="siwas-filter-inner">
  <div class="siwas-filter-copy"><b>Filter unit pengawasan</b><span>Angka ringkasan terpilih dihitung dari kolom inspektur_wilayah.</span></div>
  <div class="siwas-filter-control"><label for="siwas-inspektorat">Tampilkan</label><select id="siwas-inspektorat">
    <option value="all">Seluruh unit</option><option value="110">Inspektorat Wilayah I</option><option value="120">Inspektorat Wilayah II</option><option value="130">Inspektorat Wilayah III</option><option value="140">Inspektorat Wilayah IV</option><option value="150">Inspektorat Wilayah V</option><option value="20">Non-Inspektorat</option><option value="unassigned">Belum terklasifikasi</option>
  </select></div>
</div></aside>`

const filteredAnalysisMarkup = String.raw`
<section class="section parchment filtered-analysis" id="analisis-inspektorat" hidden><div class="wrap">
  <div class="section-head"><span class="filter-context" id="filtered-context"></span><p class="eyebrow">Ringkasan unit terpilih</p><h2 id="filtered-heading"></h2><p id="filtered-intro"></p></div>
  <div class="kpi-grid" id="filtered-kpis"></div>
  <div class="chart-panel" style="margin-top:36px"><h3 style="margin-bottom:24px">Kepatuhan per tahap</h3><div class="filtered-bars" id="filtered-bars"></div></div>
  <div class="table-shell" style="margin-top:24px"><table><thead><tr><th>Kode</th><th>Transisi</th><th>SLA</th><th>Dapat dinilai</th><th>Kepatuhan</th><th>Terlambat</th><th>Lewat tenggat terbuka</th><th>Median HK</th><th>P90 HK</th></tr></thead><tbody id="filtered-stage-rows"></tbody></table></div>
  <div class="filtered-grid"><div><h3>Tren per kuartal</h3><div class="table-shell"><table style="min-width:560px"><thead><tr><th>Kuartal</th><th>Pengaduan</th><th>Tahap dinilai</th><th>Kepatuhan</th></tr></thead><tbody id="filtered-quarter-rows"></tbody></table></div></div><div><h3>Pengaduan selesai paling terlambat</h3><div class="table-shell"><table style="min-width:620px"><thead><tr><th>ID</th><th>Tahap</th><th>Durasi</th><th>Melebihi SLA</th></tr></thead><tbody id="filtered-extreme-rows"></tbody></table></div></div></div>
</div></section>`

const enhancementScript = (analytics: string) => String.raw`
<script id="risk-sim-siwas-motion">
(()=>{const DATA=${analytics};const nf=new Intl.NumberFormat('id-ID');const pf=new Intl.NumberFormat('id-ID',{style:'percent',minimumFractionDigits:1,maximumFractionDigits:1});const esc=(value)=>String(value??'').replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));const num=(value)=>nf.format(value||0);const pct=(value)=>value==null?'—':pf.format(value);const duration=(value)=>value==null?'—':new Intl.NumberFormat('id-ID',{maximumFractionDigits:1}).format(value);const metric=(value,label)=>'<div class="kpi"><b>'+value+'</b><span>'+label+'</span></div>';
const select=document.getElementById('siwas-inspektorat');const dynamic=document.getElementById('analisis-inspektorat');const heroStats=[...document.querySelectorAll('#ringkasan .hero-stat')];const heroEyebrow=document.querySelector('#ringkasan .eyebrow');const legacy=[document.getElementById('insight'),document.getElementById('sla'),document.getElementById('segmentasi'),document.getElementById('risiko-ekstrem')].filter(Boolean);const target=document.getElementById('target2025');if(target){const note=document.createElement('p');note.className='scope-note';note.textContent='Bagian Pertimbangan Target 2025 menggunakan angka institusi secara keseluruhan dan tidak berubah mengikuti filter unit.';target.querySelector('.section-head')?.append(note)}
function render(code){const group=DATA.groups[code]||DATA.groups.all;const filtered=code!=='all';heroEyebrow.textContent='SIWAS · SOP 2024 · '+group.label;[num(group.reports),num(group.assessable),pct(group.compliance),num(group.overdueOpen)].forEach((value,index)=>{const field=heroStats[index]?.querySelector('b');if(field)field.textContent=value});legacy.forEach((section)=>section.hidden=filtered);dynamic.hidden=!filtered;if(!filtered)return;document.getElementById('filtered-context').textContent=group.label;document.getElementById('filtered-heading').textContent=group.reports?'Kinerja '+group.label+' dapat ditelusuri sampai tingkat tahapan.':group.label+' belum memiliki pengaduan pada data ini.';document.getElementById('filtered-intro').textContent=group.reports?num(group.reports)+' pengaduan menghasilkan '+num(group.assessable)+' tahap yang dapat dinilai. Kepatuhan gabungan mencapai '+pct(group.compliance)+'.':'Kode unit tetap disediakan agar struktur pelaporan siap digunakan ketika data tersedia.';document.getElementById('filtered-kpis').innerHTML=metric(pct(group.compliance),'kepatuhan gabungan')+metric(num(group.onTime),'tahap tepat waktu')+metric(num(group.late),'tahap terlambat selesai')+metric(num(group.overdueOpen),'tahap lewat tenggat dan belum selesai');
document.getElementById('filtered-bars').innerHTML=group.assessable?group.stages.map((stage)=>'<div class="filtered-bar"><span class="filtered-bar-label"><b>'+esc(stage.code)+'</b> · '+esc(stage.label)+'</span><span class="filtered-bar-track"><i style="width:'+((stage.compliance||0)*100).toFixed(2)+'%"></i></span><span class="filtered-bar-value">'+pct(stage.compliance)+'</span></div>').join(''):'<div class="empty-state">Belum ada tahap yang dapat dinilai.</div>';document.getElementById('filtered-stage-rows').innerHTML=group.stages.map((stage)=>'<tr><td><span class="code">'+esc(stage.code)+'</span></td><td><strong>'+esc(stage.label)+'</strong></td><td>'+num(stage.sla)+' HK</td><td>'+num(stage.assessable)+'</td><td>'+pct(stage.compliance)+'</td><td>'+num(stage.late)+'</td><td>'+num(stage.overdueOpen)+'</td><td>'+duration(stage.median)+'</td><td>'+duration(stage.p90)+'</td></tr>').join('');document.getElementById('filtered-quarter-rows').innerHTML=group.quarters.filter((quarter)=>quarter.reports||quarter.assessable).map((quarter)=>'<tr><td><strong>'+esc(quarter.quarter)+'</strong></td><td>'+num(quarter.reports)+'</td><td>'+num(quarter.assessable)+'</td><td>'+pct(quarter.compliance)+'</td></tr>').join('')||'<tr><td colspan="4">Belum ada data kuartal.</td></tr>';document.getElementById('filtered-extreme-rows').innerHTML=group.extremes.map((item)=>'<tr><td><code>'+esc(item.id)+'</code></td><td>'+esc(item.stage)+' · '+esc(item.label)+'</td><td>'+num(item.duration)+' HK</td><td>+'+num(item.overBy)+' HK</td></tr>').join('')||'<tr><td colspan="4">Tidak ada pengaduan selesai yang melampaui SLA.</td></tr>';dynamic.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})}
select.addEventListener('change',()=>render(select.value));render('all');const items=document.querySelectorAll('.section-head,.sla-card,.kpi,.insight,.chart-panel,.utility-card,.comparison-card,.table-shell,.evidence-grid article,.formula-note article,.sla-comparison,.recommendation');items.forEach((el,i)=>{el.classList.add('reveal');el.style.transitionDelay=(i%5)*55+'ms'});if(!('IntersectionObserver'in window)){items.forEach(el=>el.classList.add('is-visible'));return}const observer=new IntersectionObserver(entries=>entries.forEach((entry)=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}}),{threshold:.08,rootMargin:'0px 0px -40px'});items.forEach((el)=>observer.observe(el))})();
</script>`

export async function GET() {
  const setting = await getSiwasSetting()
  const cookieStore = await cookies()
  if (!setting || !isUnlockTokenValid(cookieStore.get(SIWAS_COOKIE)?.value, SIWAS_PUBLIC_SUBJECT, setting)) {
    return new Response('PIN laporan diperlukan.', { status: 401 })
  }

  const reportPath = path.join(process.cwd(), 'src', 'content', 'laporan_ketepatan_waktu_SIWAS.html')
  const analyticsPath = path.join(process.cwd(), 'src', 'content', 'siwas-inspektorat.json')
  const [source, analyticsSource] = await Promise.all([readFile(reportPath, 'utf8'), readFile(analyticsPath, 'utf8')])
  const analytics = analyticsSource.replaceAll('<', '\\u003c')
  const html = source
    .replace('</head>', `${enhancementStyles}</head>`)
    .replace('<main>', `${filterMarkup}<main>`)
    .replace('<section class="section dark" id="insight">', `${filteredAnalysisMarkup}<section class="section dark" id="insight">`)
    .replace('<section class="section dark"><div class="wrap"><div class="section-head"><p class="eyebrow">Risiko ekstrem</p>', '<section class="section dark" id="risiko-ekstrem"><div class="wrap"><div class="section-head"><p class="eyebrow">Risiko ekstrem</p>')
    .replace('<div class="formula-note">', `${slaComparisonMarkup}<div class="formula-note">`)
    .replace('</body>', `${enhancementScript(analytics)}</body>`)

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store, max-age=0',
      'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self' data:; font-src 'self'; frame-ancestors 'self'",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'same-origin',
    },
  })
}
