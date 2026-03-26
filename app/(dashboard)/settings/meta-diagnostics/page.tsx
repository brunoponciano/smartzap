'use client'

import { MetaDiagnosticsView } from '@/components/features/settings/MetaDiagnosticsView'
import { useMetaDiagnosticsController } from '@/hooks/useMetaDiagnostics'

export default function MetaDiagnosticsPage() {
  const c = useMetaDiagnosticsController()

  return (
    <MetaDiagnosticsView
      data={c.data}
      checks={c.checks}
      filteredChecks={c.filteredChecks}
      counts={c.counts}
      overall={c.overall}
      isLoading={c.isLoading}
      isFetching={c.isFetching}
      filter={c.filter}
      setFilter={c.setFilter}
      onRefresh={() => c.refetch()}
      onRunAction={c.runAction}
      isActing={c.isActing}
    />
  )
}
