'use client'

import { useAtom } from 'jotai'
import { useResetAtom } from 'jotai/utils'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { contactService } from '@/services'
import { segmentFilterAtom } from '@/atoms/contact-filters'
import { isSegmentFilterEmpty } from '@/types/segment-filter'
import type { GroupOperator } from '@/types/segment-filter'
import { ConditionGroupEditor } from './ConditionGroupEditor'

export function SegmentFilterBuilder() {
  const [segmentFilter, setSegmentFilter] = useAtom(segmentFilterAtom)
  const resetSegmentFilter = useResetAtom(segmentFilterAtom)

  const tagsQuery = useQuery({
    queryKey: ['contactTagsWithCount'],
    queryFn: contactService.getTagsWithCount,
    staleTime: 5 * 60 * 1000,
  })

  const availableTags = tagsQuery.data ?? []

  function addTag(group: 'include' | 'exclude', tag: string) {
    setSegmentFilter((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        conditions: [
          ...prev[group].conditions,
          { id: crypto.randomUUID(), tag },
        ],
      },
    }))
  }

  function removeTag(group: 'include' | 'exclude', id: string) {
    setSegmentFilter((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        conditions: prev[group].conditions.filter((c) => c.id !== id),
      },
    }))
  }

  function toggleOperator(group: 'include' | 'exclude') {
    setSegmentFilter((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        operator: prev[group].operator === 'AND' ? 'OR' : ('AND' as GroupOperator),
      },
    }))
  }

  return (
    <div className="flex flex-col gap-4">
      <ConditionGroupEditor
        title="INCLUIR LEADS QUE TENHAM"
        group={segmentFilter.include}
        availableTags={availableTags}
        onOperatorChange={(op) =>
          setSegmentFilter((prev) => ({
            ...prev,
            include: { ...prev.include, operator: op },
          }))
        }
        onAddTag={(tag) => addTag('include', tag)}
        onRemoveTag={(id) => removeTag('include', id)}
        isLoading={tagsQuery.isLoading}
      />

      <ConditionGroupEditor
        title="EXCLUIR LEADS QUE TENHAM"
        group={segmentFilter.exclude}
        availableTags={availableTags}
        onOperatorChange={(op) =>
          setSegmentFilter((prev) => ({
            ...prev,
            exclude: { ...prev.exclude, operator: op },
          }))
        }
        onAddTag={(tag) => addTag('exclude', tag)}
        onRemoveTag={(id) => removeTag('exclude', id)}
        isLoading={tagsQuery.isLoading}
      />

      {!isSegmentFilterEmpty(segmentFilter) && (
        <Button variant="ghost" size="sm" onClick={resetSegmentFilter}>
          Limpar filtros
        </Button>
      )}
    </div>
  )
}
