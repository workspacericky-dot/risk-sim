export type Level = 'atas' | 'menengah' | 'taktis' | 'operasional'
export type Indicator = string | { nama: string; satuan?: string; baseline?: string; target?: string; tahun_target?: string; sumber_data?: string }
export type Crosscut = { id: string; name: string; type: 'internal' | 'external'; outcome?: string; color?: string; targetId?: string }
export type PohonNode = { id: string; title: string; indicators: Indicator[]; level: Level; owner?: string; crosscuts?: Crosscut[] }
export type PohonSource = { nodes: PohonNode[]; edges: { from: string; to: string }[] }

export function indicatorName(value: Indicator) { return typeof value === 'string' ? value : value.nama }
