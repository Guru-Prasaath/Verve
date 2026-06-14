import { useState } from 'react'
import { Search, Users } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useCustomers } from '@/hooks'
import { daysAgoLabel, formatINR } from '@/lib/utils'
import type { Frequency } from '@/lib/types'

const FREQ_VARIANT: Record<Frequency, 'success' | 'info' | 'neutral'> = {
  daily: 'success',
  weekly: 'info',
  occasional: 'neutral',
}

export default function Customers() {
  const [query, setQuery] = useState('')
  const { data, isLoading, isFetching } = useCustomers(query)

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <PageHeader
        title="Customers"
        subtitle="The Daybreak base your co-pilot segments over - ~2,000 shoppers across 6 metros."
      />

      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, city, drink or store..."
            className="pl-9"
          />
        </div>
        <span className="shrink-0 text-sm text-muted-foreground">
          {isFetching ? 'Searching...' : `${data?.length ?? 0} shown`}
        </span>
      </div>

      {isLoading ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Home store</TableHead>
                <TableHead>Favourite drink</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead className="text-right">Lifetime value</TableHead>
                <TableHead className="text-right">Last order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : data && data.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={Users}
            title={query ? 'No results found' : 'No customers'}
            description={
              query
                ? `No customers match "${query}". Try a different search term.`
                : 'Unable to load customers. Try refreshing the page.'
            }
          />
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Home store</TableHead>
                <TableHead>Favourite drink</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead className="text-right">Lifetime value</TableHead>
                <TableHead className="text-right">Last order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((c) => (
                <TableRow
                  key={c.id}
                  className="transition-colors hover:bg-surface-muted"
                >
                  <TableCell className="font-medium text-foreground">
                    {c.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.city}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.homeStore}
                  </TableCell>
                  <TableCell>{c.favoriteDrink}</TableCell>
                  <TableCell>
                    <Badge variant={FREQ_VARIANT[c.frequency]}>{c.frequency}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatINR(c.lifetimeValue)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {daysAgoLabel(c.daysSinceLastOrder)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
