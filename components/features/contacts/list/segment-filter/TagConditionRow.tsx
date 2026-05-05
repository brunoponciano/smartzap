'use client'

import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { TagCondition } from '@/types/segment-filter'

interface TagConditionRowProps {
  condition: TagCondition
  count?: number
  onRemove: () => void
}

export function TagConditionRow({ condition, count, onRemove }: TagConditionRowProps) {
  return (
    <div className="flex items-center gap-2">
      <Badge variant="secondary" className="gap-1.5 text-sm font-normal">
        {condition.tag}
        {count !== undefined && (
          <span className="text-xs text-muted-foreground">
            {count.toLocaleString()}
          </span>
        )}
      </Badge>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={onRemove}
        aria-label={`Remover tag ${condition.tag}`}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}
