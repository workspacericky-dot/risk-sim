import { readFileSync, writeFileSync } from 'node:fs'

const source = readFileSync('ref/Cascading_Crosscutting/cascading-2025.md', 'utf8')
const nodes = new Map()
const edges = []
const levels = new Map()

for (const line of source.split(/\r?\n/)) {
  const node = line.match(/^\s*([A-Z][A-Za-z0-9]*)\["([\s\S]*)"\]\s*$/)
  if (node) {
    const parts = node[2].split(/<br\s*\/?>(?:<br\s*\/?>)?Indikator:(?:<br\s*\/?>)?/i)
    if (parts.length !== 2) throw new Error(`Indikator tidak ditemukan: ${node[1]}`)
    nodes.set(node[1], {
      id: node[1],
      title: parts[0].replaceAll(/<br\s*\/?>/g, ' ').trim(),
      indicators: parts[1].split(/<br\s*\/?>/i).map(value => value.replace(/^[\s•\u00e2\u20ac\u00a2]+/, '').trim()).filter(Boolean),
    })
    continue
  }
  const edge = line.match(/^\s*([A-Z][A-Za-z0-9]*)\s*-->\s*([A-Z][A-Za-z0-9]*)\s*$/)
  if (edge) edges.push({ from: edge[1], to: edge[2] })
  const group = line.match(/^\s*class\s+([A-Za-z0-9,]+)\s+(atas|menengah|taktis|operasional)\s*$/)
  if (group) for (const id of group[1].split(',')) levels.set(id, group[2])
}

for (const edge of edges) {
  if (!nodes.has(edge.from) || !nodes.has(edge.to)) throw new Error(`Relasi tidak dikenal: ${edge.from} -> ${edge.to}`)
}
for (const id of nodes.keys()) if (!levels.has(id)) throw new Error(`Tingkat tidak dikenal: ${id}`)

const result = {
  source: 'ref/Cascading_Crosscutting/cascading-2025.md',
  year: 2025,
  nodes: [...nodes.values()].map(node => ({ ...node, level: levels.get(node.id) })),
  edges,
}
writeFileSync('src/content/pohon-kinerja-2025.json', `${JSON.stringify(result, null, 2)}\n`)
console.log(`${result.nodes.length} simpul, ${edges.length} relasi, ${result.nodes.reduce((n, node) => n + node.indicators.length, 0)} indikator`)
