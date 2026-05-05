export type GroupOperator = 'AND' | 'OR'

export interface TagCondition {
  id: string
  tag: string
}

export interface ConditionGroup {
  operator: GroupOperator
  conditions: TagCondition[]
}

export interface SegmentFilter {
  include: ConditionGroup
  exclude: ConditionGroup
}

export const EMPTY_SEGMENT_FILTER: SegmentFilter = {
  include: { operator: 'AND', conditions: [] },
  exclude: { operator: 'OR', conditions: [] },
}

export function isSegmentFilterEmpty(f: SegmentFilter): boolean {
  return f.include.conditions.length === 0 && f.exclude.conditions.length === 0
}

function stripIds(f: SegmentFilter): object {
  return {
    include: {
      operator: f.include.operator,
      conditions: f.include.conditions.map(({ tag }) => ({ tag })),
    },
    exclude: {
      operator: f.exclude.operator,
      conditions: f.exclude.conditions.map(({ tag }) => ({ tag })),
    },
  }
}

export function encodeSegment(f: SegmentFilter): string {
  const json = JSON.stringify(stripIds(f))
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeSegment(s: string): SegmentFilter {
  try {
    const base64 = s.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(base64)
    return JSON.parse(json) as SegmentFilter
  } catch {
    return EMPTY_SEGMENT_FILTER
  }
}
