export { appendAudit, readAudit, type AuditEntry } from './audit-log'
export {
  browserFolder,
  folderPermission,
  pickDirectory,
  supportsDirectoryAccess,
} from './browser-folder'
export { scanConflictCopies, type ConflictCopy } from './conflict-copies'
export {
  conflictCopyKind,
  copyFileName,
  fileSafeName,
  isAppCopyFileName,
  isLockFileName,
  isLogFileName,
  isModelFileName,
  lockFileName,
  logFileName,
  stemOf,
} from './file-names'
export { fingerprint } from './fingerprint'
export { listFolder, type FolderListing } from './listing'
export { decodeText, encodeText, failure, type Folder } from './folder'
export { parseLock, readLock, serialiseLock, type LockRead, type LockRecord } from './lock-file'
export {
  LockManager,
  systemClock,
  type AcquireOutcome,
  type Clock,
  type HeartbeatOutcome,
  type LockView,
} from './lock-manager'
export { memoryStore, type KeyedStore, type LockObservation, type ModelKey } from './memory'
export {
  guardedSave,
  saveAsCopy,
  type CopySave,
  type GuardedSave,
  type SaveRefusal,
} from './save-guard'
export {
  SharedModelSession,
  type AcquireResult,
  type LoadOutcome,
  type ModelCheck,
  type NotLogged,
  type ReaderTick,
  type SessionOptions,
  type Snapshot,
  type WriterTick,
} from './session'
export {
  DEFAULT_SETTINGS,
  readSettings,
  type SettingsResult,
  type SharedFolderSettings,
} from './settings'
