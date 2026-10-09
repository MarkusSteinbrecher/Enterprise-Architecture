/**
 * The fingerprint of a model file (spec §6.1): SHA-256 of its bytes, as hex.
 * Sync clients rewrite modification times, so the hash decides whether a file
 * changed, never `lastModified`.
 */
export async function fingerprint(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
