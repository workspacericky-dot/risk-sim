'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, Building2, MessageSquareText, Star } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts'
import type { ZiAnovaSummary, ZiDashboardRow } from '@/lib/uji-publik-zi/data'

const COLORS = { rendah: '#059669', menengah: '#d97706', tinggi: '#e11d48' }

export function DashboardClient({ rows, anova }: { rows: ZiDashboardRow[]; anova: ZiAnovaSummary | null }) {
  const [unit, setUnit] = useState('semua')
  const [gender, setGender] = useState('semua')
  const [age, setAge] = useState('semua')
  const [occupation, setOccupation] = useState('semua')
  const filtered = useMemo(() => rows.filter((row) => (unit === 'semua' || row.unitName === unit) && (gender === 'semua' || row.gender === gender) && (age === 'semua' || row.ageGroup === age) && (occupation === 'semua' || row.occupation === occupation)), [rows, unit, gender, age, occupation])
  const summary = useMemo(() => summarize(filtered), [filtered])
  const ratingData = [1,2,3,4,5].map((rating) => ({ rating: `${rating} bintang`, jumlah: filtered.filter((row) => row.starRating === rating).length }))
  const occupationData = groupedAverage(filtered, (row) => row.occupation).slice(0, 10)
  const unitRisks = useMemo(() => groupUnitRisk(filtered), [filtered])
  const geo = unitRisks.filter((row) => row.latitude !== null && row.longitude !== null).map((row) => ({ ...row, x: row.longitude, y: row.latitude }))
  const flagged = filtered.filter((row) => row.mismatch || row.highRiskTags.length).slice(0, 8)
  return <div className="space-y-5">
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Filter label="Unit kerja" value={unit} onChange={setUnit} values={unique(rows.map((row) => row.unitName))}/>
        <Filter label="Kelamin" value={gender} onChange={setGender} values={['L','P']}/>
        <Filter label="Kelompok usia" value={age} onChange={setAge} values={unique(rows.map((row) => row.ageGroup))}/>
        <Filter label="Pekerjaan" value={occupation} onChange={setOccupation} values={unique(rows.map((row) => row.occupation))}/>
      </div>
    </section>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Stat label="Respons dianalisis" value={summary.count} note={`${summary.units} unit kerja`} icon={MessageSquareText}/>
      <Stat label="Rating rata-rata" value={summary.average.toFixed(2)} note="dari 5 bintang" icon={Star} tone="amber"/>
      <Stat label="Rating 1–2" value={`${summary.lowPct.toFixed(1)}%`} note="indikator utama CRI" icon={AlertTriangle} tone="rose"/>
      <Stat label="Anomali rating" value={summary.mismatches} note="perlu reviu evaluator" icon={Building2} tone="cyan"/>
    </div>
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 text-emerald-950 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Ringkasan eksekutif</p>
      <p className="mt-2 text-sm leading-relaxed">Dari <strong>{summary.count} respons</strong>, rating rata-rata adalah <strong>{summary.average.toFixed(2)} dari 5</strong>. Sebanyak <strong>{summary.lowPct.toFixed(1)}%</strong> memberi rating 1–2 dan <strong>{summary.mismatches}</strong> respons menunjukkan ketidaksesuaian rating dengan sentimen. {unitRisks[0] ? <>Unit dengan CRI tertinggi adalah <strong>{unitRisks[0].unitName}</strong> dengan skor <strong>{unitRisks[0].cri.toFixed(1)}</strong>.</> : null}</p>
    </section>
    <div className="grid gap-5 xl:grid-cols-2">
      <ChartCard title="Distribusi rating" description="Jumlah respons pada setiap tingkat kepuasan.">
        <ResponsiveContainer width="100%" height="100%"><BarChart data={ratingData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="rating" tick={{fontSize: 11}}/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="jumlah" radius={[8,8,0,0]} fill="#047857"/></BarChart></ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Rating menurut pekerjaan" description="Rata-rata rating untuk cohort yang terpilih.">
        <ResponsiveContainer width="100%" height="100%"><BarChart data={occupationData} layout="vertical" margin={{left: 18}}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" domain={[0,5]}/><YAxis type="category" dataKey="label" width={100} tick={{fontSize: 11}}/><Tooltip/><Bar dataKey="average" fill="#0f766e" radius={[0,8,8,0]}/></BarChart></ResponsiveContainer>
      </ChartCard>
    </div>
    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="p-5"><h2 className="font-bold text-slate-900">Profil risiko unit kerja</h2><p className="mt-1 text-sm text-slate-500">CRI: 40% rating rendah, 35% tag berisiko tinggi, 25% sentimen negatif.</p></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Unit</th><th className="px-3 py-3 text-right">Sampel</th><th className="px-3 py-3 text-right">Rating</th><th className="px-3 py-3 text-right">CRI</th><th className="px-5 py-3">Risiko</th></tr></thead><tbody className="divide-y divide-slate-100">{unitRisks.slice(0, 20).map((row) => <tr key={row.unitName}><td className="max-w-sm px-5 py-3 font-semibold text-slate-800">{row.unitName}</td><td className="px-3 py-3 text-right tabular-nums">{row.count}</td><td className="px-3 py-3 text-right tabular-nums">{row.average.toFixed(2)}</td><td className="px-3 py-3 text-right font-bold tabular-nums">{row.cri.toFixed(1)}</td><td className="px-5 py-3"><span className="rounded-full px-2.5 py-1 text-xs font-bold text-white" style={{backgroundColor: COLORS[row.risk]}}>{row.risk}</span></td></tr>)}</tbody></table></div></section>
      <ChartCard title="Sebaran geospasial unit" description={`${geo.length} unit memiliki koordinat; arah horizontal menunjukkan bujur dan vertikal menunjukkan lintang.`}>
        {geo.length ? <ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{top: 12,right: 14,bottom: 12,left: 4}}><CartesianGrid strokeDasharray="3 3"/><XAxis type="number" dataKey="x" name="Bujur" domain={['dataMin - 2','dataMax + 2']} tick={{fontSize:10}}/><YAxis type="number" dataKey="y" name="Lintang" domain={['dataMin - 2','dataMax + 2']} tick={{fontSize:10}}/><Tooltip cursor={{strokeDasharray:'3 3'}} content={<GeoTooltip/>}/><Scatter data={geo}>{geo.map((point) => <Cell key={point.unitName} fill={COLORS[point.risk]}/>)}</Scatter></ScatterChart></ResponsiveContainer> : <Empty text="Koordinat unit kerja belum tersedia pada data terpilih."/>}
      </ChartCard>
    </div>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-slate-900">Uji perbedaan rating antarkelompok</h2><p className="mt-1 text-sm text-slate-500">ANOVA dijalankan worker Python. Hasil merupakan sinyal statistik dan tetap memerlukan interpretasi evaluator.</p><div className="mt-4 grid gap-3 sm:grid-cols-3">{anova ? Object.entries(anova).map(([dimension,result]) => <article key={dimension} className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{dimension==='occupation'?'Pekerjaan':dimension==='age_group'?'Usia':'Kelamin'}</p>{result.status==='selesai'?<><p className="mt-2 text-lg font-bold text-slate-900">p = {Number(result.p_value).toFixed(4)}</p><p className={`mt-1 text-xs font-semibold ${result.significant_005?'text-rose-700':'text-emerald-700'}`}>{result.significant_005?'Perbedaan signifikan':'Belum signifikan'} · {result.groups} kelompok</p></>:<p className="mt-2 text-sm text-slate-500">Sampel belum cukup</p>}</article>) : <p className="col-span-3 rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">Jalankan worker Python untuk menghasilkan ANOVA.</p>}</div></section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-slate-900">Sinyal yang perlu direviu</h2><p className="mt-1 text-sm text-slate-500">Nama responden disembunyikan pada dashboard; identitas hanya tersedia pada halaman Detail Respons.</p>{flagged.length ? <div className="mt-4 grid gap-3 md:grid-cols-2">{flagged.map((row) => <article key={row.id} className="rounded-xl border border-rose-100 bg-rose-50/50 p-4"><div className="flex flex-wrap items-center gap-2 text-xs"><b className="text-slate-800">{row.unitName}</b><span className="rounded-full bg-white px-2 py-1 font-bold text-amber-700">{row.starRating} ★</span>{row.mismatch && <span className="rounded-full bg-rose-600 px-2 py-1 font-bold text-white">Mismatch</span>}</div><p className="mt-2 line-clamp-3 text-sm text-slate-700">{row.opinion}</p><p className="mt-2 text-xs text-rose-700">{unique([...row.sourceTags,...row.aiTags,...row.highRiskTags]).join(' · ') || 'Tanpa tag'}</p></article>)}</div> : <Empty text="Tidak ada anomali atau tag berisiko tinggi pada filter ini."/>}</section>
  </div>
}

function Filter({label,value,onChange,values}:{label:string;value:string;onChange:(value:string)=>void;values:string[]}) { return <label className="space-y-1 text-sm font-semibold text-slate-600"><span>{label}</span><select value={value} onChange={(event)=>onChange(event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal"><option value="semua">Semua</option>{values.map((item)=><option key={item} value={item}>{item}</option>)}</select></label> }
function Stat({label,value,note,icon:Icon,tone='emerald'}:{label:string;value:string|number;note:string;icon:typeof Star;tone?:'emerald'|'amber'|'rose'|'cyan'}) { const tones={emerald:'bg-emerald-50 text-emerald-700',amber:'bg-amber-50 text-amber-700',rose:'bg-rose-50 text-rose-700',cyan:'bg-cyan-50 text-cyan-700'}; return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className={`inline-flex rounded-xl p-2.5 ${tones[tone]}`}><Icon className="h-5 w-5"/></span><p className="mt-4 text-sm font-medium text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-500">{note}</p></article> }
function ChartCard({title,description,children}:{title:string;description:string;children:React.ReactNode}) { return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p><div className="mt-4 h-72">{children}</div></section> }
function Empty({text}:{text:string}) { return <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">{text}</div> }
function unique(values:string[]) { return [...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'id')) }
function summarize(rows:ZiDashboardRow[]) { return { count:rows.length, units:new Set(rows.map((row)=>row.unitName)).size, average:rows.length?rows.reduce((sum,row)=>sum+row.starRating,0)/rows.length:0, lowPct:rows.length?rows.filter((row)=>row.starRating<=2).length/rows.length*100:0, mismatches:rows.filter((row)=>row.mismatch).length } }
function groupedAverage(rows:ZiDashboardRow[],key:(row:ZiDashboardRow)=>string) { const groups=new Map<string,number[]>(); rows.forEach((row)=>groups.set(key(row),[...(groups.get(key(row))??[]),row.starRating])); return [...groups].map(([label,values])=>({label,average:Math.round(values.reduce((a,b)=>a+b,0)/values.length*100)/100,jumlah:values.length})).sort((a,b)=>b.jumlah-a.jumlah) }
function groupUnitRisk(rows:ZiDashboardRow[]) { const groups=new Map<string,ZiDashboardRow[]>(); rows.forEach((row)=>groups.set(row.unitName,[...(groups.get(row.unitName)??[]),row])); return [...groups].map(([unitName,items])=>{ const low=items.filter((row)=>row.starRating<=2).length/items.length*100; const high=items.filter((row)=>row.highRiskTags.length).length/items.length*100; const negative=items.reduce((sum,row)=>sum+Math.max(0,-(row.sentimentScore??0)),0)/items.length*100; const cri=low*.4+high*.35+negative*.25; return {unitName,count:items.length,average:items.reduce((sum,row)=>sum+row.starRating,0)/items.length,cri,risk:(cri>=65?'tinggi':cri>=35?'menengah':'rendah') as keyof typeof COLORS,latitude:items.find((row)=>row.latitude!==null)?.latitude??null,longitude:items.find((row)=>row.longitude!==null)?.longitude??null} }).sort((a,b)=>b.cri-a.cri) }
function GeoTooltip({active,payload}:{active?:boolean;payload?:Array<{payload:{unitName:string;cri:number;average:number;risk:string}}>} ) { const row=payload?.[0]?.payload; if(!active||!row)return null; return <div className="rounded-lg border bg-white p-3 text-xs shadow-lg"><b>{row.unitName}</b><p>CRI {row.cri.toFixed(1)} · risiko {row.risk}</p><p>Rating {row.average.toFixed(2)} / 5</p></div> }
