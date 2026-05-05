import { SegmentFilter } from '@/types/segment-filter'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applySegmentFilter(query: any, filter: SegmentFilter): any {
  const { include, exclude } = filter

  if (include.conditions.length > 0) {
    if (include.operator === 'AND') {
      for (const { tag } of include.conditions) {
        query = query.contains('tags', [tag])
      }
    } else {
      const orClause = include.conditions
        .map(({ tag }) => `tags.cs.${JSON.stringify([tag])}`)
        .join(',')
      query = query.or(orClause)
    }
  }

  if (exclude.conditions.length > 0) {
    if (exclude.operator === 'OR') {
      for (const { tag } of exclude.conditions) {
        query = query.not('tags', 'cs', JSON.stringify([tag]))
      }
    } else {
      const orClause = exclude.conditions
        .map(({ tag }) => `tags.not.cs.${JSON.stringify([tag])}`)
        .join(',')
      query = query.or(orClause)
    }
  }

  return query
}
