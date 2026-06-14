import { Check, CheckCheck } from 'lucide-react'
import type { Channel, MessagePreview as Preview } from '@/lib/types'
import { cn } from '@/lib/utils'

/* WhatsApp / SMS render as chat bubbles; Email / RCS as a framed preview. */

function ChatBubble({
  preview,
  channel,
}: {
  preview: Preview
  channel: Channel
}) {
  const isWhatsApp = channel === 'WhatsApp'
  return (
    <div
      className={cn(
        'rounded-2xl px-3.5 py-2.5 shadow-sm',
        isWhatsApp
          ? 'rounded-tl-sm bg-[#e7f6df] text-[#14271a]'
          : 'rounded-tl-sm bg-surface-muted text-foreground'
      )}
    >
      <p className="whitespace-pre-line text-sm leading-relaxed">{preview.body}</p>
      <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
        9:14 AM
        {isWhatsApp ? (
          <CheckCheck className="h-3 w-3 text-info" />
        ) : (
          <Check className="h-3 w-3" />
        )}
      </div>
    </div>
  )
}

function ChatThread({
  previews,
  channel,
}: {
  previews: Preview[]
  channel: Channel
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-[#f7f4ee] p-4">
      {previews.map((p, i) => (
        <div key={i} className="flex flex-col gap-1">
          <span className="px-1 text-[11px] font-medium text-muted-foreground">
            to {p.customerName} · {p.store}
          </span>
          <div className="max-w-[88%]">
            <ChatBubble preview={p} channel={channel} />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmailPreview({ previews }: { previews: Preview[]; subject?: string }) {
  return (
    <div className="space-y-3">
      {previews.map((p, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-border bg-surface"
        >
          <div className="flex items-center justify-between border-b border-border bg-surface-muted/60 px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                DC
              </span>
              <span className="font-medium text-foreground">Daybreak Coffee</span>
              <span className="text-muted-foreground">to {p.customerName}</span>
            </div>
            <span className="text-[11px] text-muted-foreground">{p.store}</span>
          </div>
          <div className="px-4 py-3">
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
              {p.body}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function RcsPreview({ previews }: { previews: Preview[] }) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-[#f7f4ee] p-4">
      {previews.map((p, i) => (
        <div key={i} className="flex flex-col gap-1">
          <span className="px-1 text-[11px] font-medium text-muted-foreground">
            to {p.customerName} · {p.store}
          </span>
          <div className="max-w-[88%] overflow-hidden rounded-2xl rounded-tl-sm border border-border bg-surface shadow-sm">
            <div className="px-3.5 py-2.5">
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                {p.body}
              </p>
            </div>
            <div className="border-t border-border px-3.5 py-2 text-xs font-medium text-accent-foreground">
              Order now ›
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function MessagePreview({
  channel,
  previews,
  subject,
}: {
  channel: Channel
  previews: Preview[]
  subject?: string
}) {
  if (channel === 'WhatsApp' || channel === 'SMS')
    return <ChatThread previews={previews} channel={channel} />
  if (channel === 'Email')
    return <EmailPreview previews={previews} subject={subject} />
  return <RcsPreview previews={previews} />
}
