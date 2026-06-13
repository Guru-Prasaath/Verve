export async function sendToChannelWithRetry(
  channelUrl: string,
  campaignId: string,
  recipients: any[],
  channel: string,
  maxAttempts: number = 3
) {
  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(`${channelUrl}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, recipients, channel }),
      })
      if (res.ok) return
      if (attempt === maxAttempts) {
        console.error(
          `[CRM] send final failure — campaign ${campaignId}: ${res.status}`
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
    console.error('[CRM] send failed after retries:', lastError)
  }
}
