import { atomWithReset } from 'jotai/utils'
import { SegmentFilter, EMPTY_SEGMENT_FILTER } from '@/types/segment-filter'

export const segmentFilterAtom = atomWithReset<SegmentFilter>(EMPTY_SEGMENT_FILTER)
