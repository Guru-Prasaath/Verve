import { useEffect, useRef, useState } from 'react'
import { formatNumber } from '@/lib/utils'

/** Counts up to `value` once on mount / whenever value changes. */
export function CountUp({
  value,
  duration = 900,
  className,
}: {
  value: number
  duration?: number
  className?: string
}) {
  const [display, setDisplay] = useState(0)
  const frame = useRef<number>(0)

  useEffect(() => {
    const start = performance.now()
    const from = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      // easeOutExpo
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
      setDisplay(Math.round(from + (value - from) * eased))
      if (t < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [value, duration])

  return <span className={className}>{formatNumber(display)}</span>
}
