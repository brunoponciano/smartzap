'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

interface TagPickerProps {
  selectedTags: string[]
  onSelect: (tag: string) => void
  availableTags: Array<{ tag: string; count: number }>
  isLoading?: boolean
}

export function TagPicker({ selectedTags, onSelect, availableTags, isLoading }: TagPickerProps) {
  const [open, setOpen] = useState(false)

  const sorted = [...availableTags].sort((a, b) => b.count - a.count)

  function handleSelect(tag: string) {
    onSelect(tag)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5" disabled={isLoading}>
          <Plus className="h-3.5 w-3.5" />
          Adicionar tag
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar tag..." />
          <CommandList>
            <CommandEmpty>Nenhuma tag encontrada.</CommandEmpty>
            <CommandGroup>
              {sorted.map(({ tag, count }) => {
                const disabled = selectedTags.includes(tag)
                return (
                  <CommandItem
                    key={tag}
                    value={tag}
                    disabled={disabled}
                    onSelect={() => !disabled && handleSelect(tag)}
                    className={disabled ? 'opacity-40 cursor-not-allowed' : ''}
                  >
                    <span className="flex-1">{tag}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {count.toLocaleString()}
                    </span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
