import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Coerce AI report list entries to strings. Models sometimes return
 * `{ issue, description }` objects instead of plain strings.
 */
export function reportBulletToString(item: unknown): string {
  if (typeof item === "string") return item
  if (item == null) return ""
  if (typeof item === "object") {
    const o = item as Record<string, unknown>
    const issue = o.issue
    const desc = o.description
    if (typeof issue === "string" && typeof desc === "string") return `${issue}: ${desc}`
    if (typeof issue === "string") return issue
    if (typeof desc === "string") return desc
    if (typeof o.text === "string") return o.text
    if (typeof o.recommendation === "string") return o.recommendation
  }
  try {
    return JSON.stringify(item)
  } catch {
    return String(item)
  }
}

export function normalizeReportBullets(items: unknown[] | undefined | null): string[] {
  if (!items?.length) return []
  return items.map(reportBulletToString).filter((s) => s.length > 0)
}
