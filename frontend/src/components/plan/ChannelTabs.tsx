import { useState } from 'react'
import {
  Mail,
  MessageCircle,
  MessageSquare,
  MessageSquareText,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MessagePreview } from '@/components/plan/MessagePreview'
import { cn } from '@/lib/utils'
import type { Channel, ChannelMessage } from '@/lib/types'

const CHANNEL_ICON: Record<Channel, LucideIcon> = {
  WhatsApp: MessageCircle,
  SMS: MessageSquare,
  Email: Mail,
  RCS: MessageSquareText,
}

export function ChannelTabs({
  messages,
  recommendedChannel,
}: {
  messages: ChannelMessage[]
  recommendedChannel: Channel
}) {
  const [active, setActive] = useState<string>(recommendedChannel)

  return (
    <Tabs value={active} onValueChange={setActive}>
      <TabsList className="flex-wrap">
        {messages.map((m) => {
          const Icon = CHANNEL_ICON[m.channel]
          const isRec = m.channel === recommendedChannel
          return (
            <TabsTrigger key={m.channel} value={m.channel}>
              <Icon className="h-3.5 w-3.5" />
              {m.channel}
              {isRec && (
                <Sparkles className="h-3 w-3 text-accent-foreground" />
              )}
            </TabsTrigger>
          )
        })}
      </TabsList>

      {messages.map((m) => (
        <TabsContent key={m.channel} value={m.channel} className="mt-4 space-y-3">
          {m.channel === recommendedChannel && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-accent-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Recommended channel
            </div>
          )}
          {m.subject && (
            <div className="text-sm">
              <span className="font-medium text-muted-foreground">Subject: </span>
              <span className="text-foreground">{m.subject}</span>
            </div>
          )}
          <MessagePreview
            channel={m.channel}
            previews={m.previews}
            subject={m.subject}
          />
          <details className="group">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              View raw template
            </summary>
            <code
              className={cn(
                'mt-2 block whitespace-pre-line rounded-md bg-surface-muted p-3 font-mono text-xs text-muted-foreground'
              )}
            >
              {m.template}
            </code>
          </details>
        </TabsContent>
      ))}
    </Tabs>
  )
}
