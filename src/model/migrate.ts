import { SCHEMA_VERSION, type Workspace } from './workspace'

/**
 * Bring a workspace written by an earlier build up to the current shape.
 *
 * This is for workspaces that arrive as objects rather than text — the
 * IndexedDB snapshots an earlier build stored. Files go through the canonical
 * JSON reader, which validates every field and migrates on the way in; a
 * snapshot was written by our own code and is trusted to have the shape its
 * `schemaVersion` says.
 *
 * - **1 → 2** (#75): `views` held saved report definitions. They move to
 *   `reports`, and `views` now holds hand-drawn diagrams, of which a v1
 *   workspace has none. Folders are new.
 * - **2 → 3** (#84): only the version moves. Relationships gained optional
 *   `isDirected` and `modifier`, which a schema-2 workspace never has.
 */
export function migrateWorkspace(stored: Workspace): Workspace {
  const version = stored.schemaVersion || SCHEMA_VERSION
  if (version >= SCHEMA_VERSION) return stored
  if (version >= 2) return { ...stored, schemaVersion: SCHEMA_VERSION }
  const legacy = stored as unknown as LegacyV1
  return {
    ...stored,
    schemaVersion: SCHEMA_VERSION,
    reports: legacy.views ?? [],
    views: [],
    folders: [],
  }
}

interface LegacyV1 {
  views?: Workspace['reports']
}
