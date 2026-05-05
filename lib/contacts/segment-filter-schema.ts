import { z } from 'zod'
import { EMPTY_SEGMENT_FILTER, SegmentFilter } from '@/types/segment-filter'

const tagConditionSchema = z.object({
  tag: z.string().min(1).max(100),
})

const conditionGroupSchema = z.object({
  operator: z.enum(['AND', 'OR']),
  conditions: z.array(tagConditionSchema).max(20),
})

export const segmentFilterSchema = z.object({
  include: conditionGroupSchema,
  exclude: conditionGroupSchema,
})

export function parseSegmentParam(raw: string | null): SegmentFilter {
  if (!raw) return EMPTY_SEGMENT_FILTER
  try {
    const base64 = raw.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(base64)
    const parsed = JSON.parse(json)
    return segmentFilterSchema.parse(parsed) as SegmentFilter
  } catch {
    throw new Error('Invalid segment parameter')
  }
}
