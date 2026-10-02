import type { PropertyValue } from '@/model'
import { setKey } from './records'

/**
 * Small pieces the canonical JSON reader and writer share with the view and
 * folder serialiser (#75). Internal to `io/`; not re-exported from the index.
 */

export function byId(a: { id: string }, b: { id: string }): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/** Drop undefined and empty values so absent data never shows up as noise in a diff. */
export function prune(object: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(object)) {
    if (value === undefined) continue
    if (Array.isArray(value) && value.length === 0) continue
    if (isRecord(value) && !Array.isArray(value) && Object.keys(value).length === 0) continue
    setKey(out, key, value)
  }
  return out
}

export function emptyToUndefined<T extends object>(value: T): T | undefined {
  return Object.keys(value).length ? value : undefined
}

export function readProperties(value: unknown): Record<string, PropertyValue> {
  if (!isRecord(value)) return {}
  const out: Record<string, PropertyValue> = {}
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
      setKey(out, key, raw)
    }
  }
  return out
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  // Arrays are excluded: a top-level JSON array must fail the workspace guard
  // rather than import as an empty workspace.
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}
