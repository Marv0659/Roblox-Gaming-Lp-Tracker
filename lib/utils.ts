import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatting must give identical output on the server (Vercel, UTC) and in the browser,
 * or React hydration fails. So every formatter pins both the locale and the time zone.
 */
export const APP_LOCALE = "en-GB"
export const APP_TIME_ZONE = process.env.NEXT_PUBLIC_APP_TIME_ZONE ?? "Europe/Stockholm"

const numberFormat = new Intl.NumberFormat(APP_LOCALE)
const dateParts = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: APP_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function toDate(date: Date | string): Date {
  return typeof date === "string" ? new Date(date) : date
}

function parts(date: Date | string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const p of dateParts.formatToParts(toDate(date))) out[p.type] = p.value
  return out
}

/** 18876 → "18,876" */
export function formatNumber(value: number): string {
  return numberFormat.format(value)
}

/** Format as dd-mm-yyyy. */
export function formatDate(date: Date | string): string {
  const p = parts(date)
  return `${p.day}-${p.month}-${p.year}`
}

/** Format as dd-mm-yyyy, hh:mm. */
export function formatDateTime(date: Date | string): string {
  const p = parts(date)
  return `${p.day}-${p.month}-${p.year}, ${p.hour}:${p.minute}`
}

/** Format as hh:mm. */
export function formatTime(date: Date | string): string {
  const p = parts(date)
  return `${p.hour}:${p.minute}`
}

/** Format as "6 Oct" (fixed month names; ICU versions disagree on "Sep" vs "Sept"). */
export function formatShortDate(date: Date | string): string {
  const p = parts(date)
  return `${Number(p.day)} ${MONTHS[Number(p.month) - 1]}`
}
