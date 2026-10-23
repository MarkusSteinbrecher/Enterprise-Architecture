import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Is the workspace schema in the built site where its `$id` says it is (#189)?
 *
 * `SCHEMA_ID` names a URL on GitHub Pages, and Pages serves `dist/` under the
 * project base, so the file must be at the `$id`'s path with the origin and
 * the base stripped. `scripts/check-published-schema.ts` runs this at the end
 * of `npm run build`. The path is worked out from the `$id`, not shared with the
 * step that copies the file there, so the two cannot agree on a wrong place.
 *
 * Node-only: it reads the file system, and nothing in the app imports it.
 */

/** The GitHub Pages project base: `base` in vite.config.ts when BASE_PATH is unset. */
export const PAGES_BASE = '/Enterprise-Architecture/'

/**
 * Where in `dist/` a Pages URL is served from. Throws on a URL it cannot map,
 * so a `$id` that moves off Pages fails the build rather than the check
 * looking somewhere harmless.
 */
export function distPathOf(url: string): string {
  const parsed = new URL(url)
  if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.github.io')) {
    throw new Error(`${url} is not a GitHub Pages URL, so it does not name a file in dist/`)
  }
  if (!parsed.pathname.startsWith(PAGES_BASE)) {
    throw new Error(`${url} is not under the Pages base ${PAGES_BASE}`)
  }
  return parsed.pathname.slice(PAGES_BASE.length)
}

/**
 * What is wrong with the schema `dist` serves at `schemaId`, or `undefined`
 * when it is there and byte-identical to `designFile`.
 */
export function publishedSchemaProblem(
  dist: string,
  schemaId: string,
  designFile: string,
): string | undefined {
  const path = distPathOf(schemaId)
  const served = join(dist, path)
  if (!isFile(served)) {
    return `dist/${path} is missing, so ${schemaId} would 404`
  }
  if (!readFileSync(served).equals(readFileSync(designFile))) {
    return `dist/${path} is not byte-identical to ${designFile}`
  }
  return undefined
}

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}
