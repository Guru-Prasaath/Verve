import express from 'express'
import cors from 'cors'
import * as dotenv from 'dotenv'
import * as path from 'path'

/*
 * Verve — Stubbed Channel Service (a deliberately SEPARATE microservice)
 *
 * This process knows nothing about the CRM's database. It is a dumb delivery
 * simulator: the CRM calls POST /send with recipients + channel + message, the
 * service ACKs immediately (202-style), then asynchronously simulates the real
 * delivery lifecycle and calls back into the CRM's receipt webhook for each
 * recipient — Sent ➔ Delivered ➔ Opened ➔ Clicked ➔ Ordered, or Failed.
 *
 * Deploy this independently from the CRM. The two talk only over HTTP:
 *   CRM  --POST /send-->            Channel Service
 *   Channel Service --POST /api/campaigns/:id/receipt--> CRM
 */

dotenv.config({ path: path.join(__dirname, '../.env') })

const app = express()
app.use(cors())
app.use(express.json())

const CHANNEL_PORT = process.env.CHANNEL_PORT || 4100
// Where to send delivery receipts back to the CRM.
const CRM_URL = process.env.CRM_URL || 'http://127.0.0.1:4000'

// Simulated outcome probabilities — tuned to look like a healthy campaign.
const P_FAIL = 0.1
const P_OPEN = 0.7
const P_CLICK = 0.35
const P_ORDER = 0.15
const FAILURE_REASONS = ['Invalid Number', 'Spam Blocked', 'Unsubscribed', 'Bounce']
const AVG_ORDER_VALUE = 360

interface Recipient {
  id: string
  customerId: string
  name: string
}

interface ReceiptPayload {
  recipientId: string
  customerId: string
  state: 'Delivered' | 'Read' | 'Opened' | 'Clicked' | 'Ordered' | 'Failed'
  failureReason?: string | null
  orderValue?: number | null
}

const rand = () => Math.random()
const jitter = (base: number, spread: number) => base + Math.random() * spread

/** Retry with exponential backoff. */
async function sendReceiptCallbackWithRetry(
  campaignId: string,
  payload: ReceiptPayload,
  maxAttempts: number = 3
) {
  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(`${CRM_URL}/api/campaigns/${campaignId}/receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) return
      if (attempt === maxAttempts) {
        console.error(
          `[Channel] receipt final failure — campaign ${campaignId}, recipient ${payload.recipientId}: ${res.status}`
        )
      }
    } catch (err) {
      lastError = err
      if (attempt < maxAttempts) {
        const delayMs = Math.pow(2, attempt - 1) * 500
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }
  }
  if (lastError) {
    console.error('[Channel] receipt failed after retries:', lastError)
  }
}

/** Fire one delivery receipt back to the CRM with retries. */
function sendReceiptCallback(campaignId: string, payload: ReceiptPayload) {
  sendReceiptCallbackWithRetry(campaignId, payload).catch((err) => {
    console.error('[Channel] uncaught error in receipt callback:', err)
  })
}

/** Simulate the full engagement funnel for a single recipient. */
function simulateRecipient(campaignId: string, rec: Recipient) {
  // ~10% never make it past the carrier.
  if (rand() < P_FAIL) {
    const reason = FAILURE_REASONS[Math.floor(rand() * FAILURE_REASONS.length)]
    setTimeout(
      () =>
        sendReceiptCallback(campaignId, {
          recipientId: rec.id,
          customerId: rec.customerId,
          state: 'Failed',
          failureReason: reason,
        }),
      jitter(500, 1500)
    )
    return
  }

  // Delivered → maybe Read → maybe Opened → maybe Clicked → maybe Ordered
  setTimeout(() => {
    sendReceiptCallback(campaignId, {
      recipientId: rec.id,
      customerId: rec.customerId,
      state: 'Delivered',
    })

    if (rand() >= P_OPEN) return
    setTimeout(() => {
      sendReceiptCallback(campaignId, {
        recipientId: rec.id,
        customerId: rec.customerId,
        state: 'Read',
      })

      setTimeout(() => {
        sendReceiptCallback(campaignId, {
          recipientId: rec.id,
          customerId: rec.customerId,
          state: 'Opened',
        })

        if (rand() >= P_CLICK) return
        setTimeout(() => {
          sendReceiptCallback(campaignId, {
            recipientId: rec.id,
            customerId: rec.customerId,
            state: 'Clicked',
          })

          if (rand() >= P_ORDER) return
          setTimeout(() => {
            const orderValue = AVG_ORDER_VALUE + Math.round((rand() - 0.5) * 200)
            sendReceiptCallback(campaignId, {
              recipientId: rec.id,
              customerId: rec.customerId,
              state: 'Ordered',
              orderValue,
            })
          }, jitter(1000, 2000))
        }, jitter(800, 1500))
      }, jitter(300, 600))
    }, jitter(600, 1200))
  }, jitter(400, 1000))
}

app.get('/', (_req, res) => {
  res.json({ service: 'Verve Channel Service', status: 'online', crmTarget: CRM_URL })
})

// The CRM's "send API" calls this. We ACK immediately, then simulate async.
app.post('/send', (req, res) => {
  const { campaignId, recipients, channel } = req.body as {
    campaignId?: string
    recipients?: Recipient[]
    channel?: string
  }

  if (!campaignId || !Array.isArray(recipients)) {
    return res.status(400).json({ error: 'Missing campaignId or recipients[]' })
  }

  // Accept for delivery and return right away — the CRM does not block on us.
  res.status(202).json({ status: 'Accepted', messageCount: recipients.length })

  console.log(
    `[Channel] dispatching campaign ${campaignId} → ${recipients.length} recipients via ${channel}`
  )
  recipients.forEach((rec) => simulateRecipient(campaignId, rec))
})

app.listen(CHANNEL_PORT, () => {
  console.log(`📡 Channel Service running at http://localhost:${CHANNEL_PORT} (CRM: ${CRM_URL})`)
})

export default app
