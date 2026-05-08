export interface LeadBoxSegment {
  id: string
  name: string
  contact_count: number | null
  created_at: string
}

export const leadboxService = {
  async listSegments(): Promise<LeadBoxSegment[]> {
    const res = await fetch('/api/leadbox/segments')
    if (!res.ok) throw new Error('Erro ao buscar segmentos do LeadBox')
    return res.json()
  },

  async getPhones(segmentId: string): Promise<string[]> {
    const res = await fetch(`/api/leadbox/segments/${encodeURIComponent(segmentId)}/phones`)
    if (!res.ok) throw new Error('Erro ao buscar phones do LeadBox')
    const data: { phones: string[] } = await res.json()
    return data.phones
  },
}
