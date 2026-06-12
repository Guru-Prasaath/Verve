import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a number as Indian Rupees, e.g. 4200 -> "₹4,200". */
export function formatINR(value: number, opts?: { compact?: boolean }) {
  if (opts?.compact && value >= 100000) {
    return `₹${(value / 100000).toFixed(value % 100000 === 0 ? 0 : 1)}L`
  }
  return `₹${Math.round(value).toLocaleString('en-IN')}`
}

/** Compact whole numbers, e.g. 1240 -> "1,240". */
export function formatNumber(value: number) {
  return Math.round(value).toLocaleString('en-IN')
}

/** "3 days ago", "today", "in 2 days" style relative phrasing from a day count. */
export function daysAgoLabel(days: number) {
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 14) return `${days} days ago`
  if (days < 60) return `${Math.round(days / 7)} weeks ago`
  return `${Math.round(days / 30)} months ago`
}

export function percent(part: number, whole: number) {
  if (!whole) return 0
  return (part / whole) * 100
}
