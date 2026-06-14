import {
  Cell,
  Funnel,
  FunnelChart as ReFunnelChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { FunnelStage } from '@/lib/types'
import { formatNumber, percent } from '@/lib/utils'

const COLORS = ['#7c5a3e', '#8f6843', '#a87f4f', '#c5985c', '#e0a458']

export function FunnelChart({ funnel }: { funnel: FunnelStage[] }) {
  const top = funnel[0]?.count || 1

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <ReFunnelChart>
            <Tooltip
              formatter={(v) => [formatNumber(Number(v)), 'count']}
              contentStyle={{
                borderRadius: 10,
                border: '1px solid var(--border)',
                fontSize: 12,
              }}
            />
            <Funnel dataKey="count" data={funnel} isAnimationActive>
              <LabelList
                position="right"
                dataKey="stage"
                stroke="none"
                fill="var(--foreground)"
                fontSize={12}
              />
              <LabelList
                position="left"
                dataKey="count"
                stroke="none"
                fill="var(--muted-foreground)"
                fontSize={12}
                formatter={(v) => formatNumber(Number(v))}
              />
              {funnel.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Funnel>
          </ReFunnelChart>
        </ResponsiveContainer>
      </div>

      <ul className="flex flex-col justify-center gap-2.5">
        {funnel.map((s, i) => {
          const ofTop = percent(s.count, top)
          const prev = i > 0 ? funnel[i - 1].count : s.count
          const step = percent(s.count, prev)
          return (
            <li key={s.stage} className="flex items-center gap-3">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              <span className="w-20 text-sm font-medium text-foreground">
                {s.stage}
              </span>
              <span className="w-16 text-right text-sm tabular-nums text-foreground">
                {formatNumber(s.count)}
              </span>
              <div className="flex-1">
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${ofTop}%`,
                      background: COLORS[i % COLORS.length],
                    }}
                  />
                </div>
              </div>
              <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
                {i === 0 ? '100%' : `${step.toFixed(0)}%`}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
