import 'server-only'

import { randomUUID } from 'node:crypto'
import { createAdminClient } from '@/utils/supabase/admin'
import baseline from '@/content/pohon-kinerja-2025.json'

import { indicatorName, type Level, type PohonNode, type PohonSource } from '@/lib/pohon-types'
export type { PohonSource } from '@/lib/pohon-types'
export type PohonDocument = { source: PohonSource; revision: string; updatedAt: string | null; updatedBy: string | null }

const BUCKET = 'pohon-kinerja'
const OBJECT = '2025.json'

export function baselineDocument(): PohonDocument {
  return { source: { nodes: baseline.nodes as PohonNode[], edges: baseline.edges }, revision: 'baseline', updatedAt: null, updatedBy: null }
}

export async function getPohonDocument(): Promise<PohonDocument> {
  const { data, error } = await createAdminClient().storage.from(BUCKET).download(OBJECT)
  if (error) {
    if (/not found|does not exist|404/i.test(error.message)) return baselineDocument()
    throw new Error(`Diagram gagal dimuat: ${error.message}`)
  }
  const document = JSON.parse(await data.text()) as PohonDocument
  const problem = validatePohonSource(document.source)
  if (problem || typeof document.revision !== 'string') throw new Error(`Data diagram tersimpan tidak valid: ${problem ?? 'revisi kosong'}`)
  return document
}

export function validatePohonSource(value: unknown): string | null {
  if (!value || typeof value !== 'object') return 'Format diagram tidak valid.'
  const source = value as PohonSource
  if (!Array.isArray(source.nodes) || !Array.isArray(source.edges) || source.nodes.length < 1 || source.nodes.length > 500 || source.edges.length > 800) return 'Jumlah simpul atau hubungan tidak valid.'
  const ids = new Set<string>()
  const levels = new Set<Level>(['atas', 'menengah', 'taktis', 'operasional'])
  for (const node of source.nodes) {
    if (!node || typeof node.id !== 'string' || !/^[A-Za-z0-9_-]{1,40}$/.test(node.id) || ids.has(node.id)) return 'Kode simpul harus unik dan berisi huruf, angka, garis bawah, atau tanda hubung.'
    ids.add(node.id)
    if (typeof node.title !== 'string' || !node.title.trim() || node.title.length > 500 || !levels.has(node.level) || !Array.isArray(node.indicators) || node.indicators.length < 1 || node.indicators.length > 100) return `Isi simpul ${node.id} tidak valid.`
    if (node.owner !== undefined && (typeof node.owner !== 'string' || node.owner.length > 200)) return `Penanggung jawab ${node.id} tidak valid.`
    for (const indicator of node.indicators) {
      if (typeof indicator !== 'string' && (!indicator || typeof indicator !== 'object' || Array.isArray(indicator))) return `Indikator ${node.id} tidak valid.`
      const name = indicatorName(indicator)
      if (typeof name !== 'string' || !name.trim() || name.length > 500) return `Indikator ${node.id} tidak valid.`
      if (typeof indicator !== 'string') {
        for (const key of ['satuan', 'baseline', 'target', 'tahun_target', 'sumber_data'] as const) {
          if (indicator[key] !== undefined && (typeof indicator[key] !== 'string' || indicator[key]!.length > 500)) return `Metadata indikator ${node.id} tidak valid.`
        }
      }
    }
    if (node.crosscuts !== undefined) {
      if (!Array.isArray(node.crosscuts) || node.crosscuts.length > 100) return `Crosscutting ${node.id} tidak valid.`
      for (const crosscut of node.crosscuts) {
        if (!crosscut || typeof crosscut.id !== 'string' || crosscut.id.length > 100 || typeof crosscut.name !== 'string' || !crosscut.name.trim() || crosscut.name.length > 200 || !['internal', 'external'].includes(crosscut.type) || (crosscut.outcome !== undefined && (typeof crosscut.outcome !== 'string' || crosscut.outcome.length > 500)) || (crosscut.color !== undefined && (typeof crosscut.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(crosscut.color))) || (crosscut.targetId !== undefined && (typeof crosscut.targetId !== 'string' || crosscut.targetId.length > 40))) return `Crosscutting ${node.id} tidak valid.`
      }
    }
  }
  const parent = new Map<string, string>()
  const edges = new Set<string>()
  for (const edge of source.edges) {
    if (!edge || !ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to) return 'Hubungan merujuk simpul yang tidak ada atau dirinya sendiri.'
    const key = `${edge.from}:${edge.to}`
    if (edges.has(key) || parent.has(edge.to)) return 'Setiap simpul hanya boleh memiliki satu induk penjenjangan.'
    edges.add(key)
    parent.set(edge.to, edge.from)
  }
  for (const id of ids) {
    const seen = new Set<string>()
    let current: string | undefined = id
    while (current) {
      if (seen.has(current)) return 'Hubungan penjenjangan membentuk lingkaran.'
      seen.add(current)
      current = parent.get(current)
    }
  }
  for (const node of source.nodes) for (const crosscut of node.crosscuts ?? []) {
    if (crosscut.targetId && (!ids.has(crosscut.targetId) || crosscut.targetId === node.id)) return `Simpul crosscutting ${node.id} tidak valid.`
  }
  return null
}

export async function savePohonDocument(source: PohonSource, expectedRevision: string, userId: string): Promise<PohonDocument> {
  const current = await getPohonDocument()
  if (current.revision !== expectedRevision) throw new Error('Diagram telah diperbarui oleh administrator lain. Muat ulang halaman sebelum menyimpan.')
  const next: PohonDocument = { source, revision: randomUUID(), updatedAt: new Date().toISOString(), updatedBy: userId }
  const storage = createAdminClient().storage.from(BUCKET)
  if (current.revision !== 'baseline') {
    const snapshot = await storage.upload(`history/${current.revision}.json`, JSON.stringify(current), { contentType: 'application/json', upsert: false })
    if (snapshot.error && !/already exists|duplicate/i.test(snapshot.error.message)) throw new Error(`Cadangan diagram gagal disimpan: ${snapshot.error.message}`)
  }
  const result = await storage.upload(OBJECT, JSON.stringify(next), { contentType: 'application/json', upsert: true, cacheControl: '0' })
  if (result.error) throw new Error(`Diagram gagal disimpan: ${result.error.message}`)
  return next
}
