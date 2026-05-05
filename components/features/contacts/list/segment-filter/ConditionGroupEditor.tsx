'use client'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { TagConditionRow } from './TagConditionRow'
import { TagPicker } from './TagPicker'
import type { ConditionGroup, GroupOperator } from '@/types/segment-filter'

interface ConditionGroupEditorProps {
  title: string
  group: ConditionGroup
  availableTags: Array<{ tag: string; count: number }>
  onOperatorChange: (op: GroupOperator) => void
  onAddTag: (tag: string) => void
  onRemoveTag: (id: string) => void
  isLoading?: boolean
}

export function ConditionGroupEditor({
  title,
  group,
  availableTags,
  onOperatorChange,
  onAddTag,
  onRemoveTag,
  isLoading,
}: ConditionGroupEditorProps) {
  const countMap = new Map(availableTags.map(({ tag, count }) => [tag, count]))

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>

      {group.conditions.length >= 2 && (
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={group.operator}
          onValueChange={(val) => val && onOperatorChange(val as GroupOperator)}
        >
          <ToggleGroupItem value="AND">TODAS as tags</ToggleGroupItem>
          <ToggleGroupItem value="OR">QUALQUER tag</ToggleGroupItem>
        </ToggleGroup>
      )}

      {group.conditions.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {group.conditions.map((condition) => (
            <TagConditionRow
              key={condition.id}
              condition={condition}
              count={countMap.get(condition.tag)}
              onRemove={() => onRemoveTag(condition.id)}
            />
          ))}
        </div>
      )}

      <TagPicker
        selectedTags={group.conditions.map((c) => c.tag)}
        onSelect={onAddTag}
        availableTags={availableTags}
        isLoading={isLoading}
      />
    </div>
  )
}
