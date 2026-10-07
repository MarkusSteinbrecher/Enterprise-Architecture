# Shared-folder collaboration: lock file + save guard

**Decision:** ADR 0010 (Proposed). **Relates to:** #59, #11 (file workflow), ADR 0002 (`TabLock`), ADR 0004 (canonical JSON).
**Suggested branch:** `feat/<issue#>-shared-folder-lock`.

## 1. Problem

A team keeps its models in a SharePoint library that each architect syncs locally with the OneDrive client. Archipelago can already save into that folder through the File System Access API (#11). Two architects who open the same model and both save lose one person's work silently: OneDrive keeps the last write or makes a `<name>-<COMPUTERNAME>.json` conflict copy nobody merges.

This issue makes that safe: **one editor per model at a time, enforced by a lock file next to the model, and no save ever overwrites a file that changed underneath it.**

No Graph API, no Entra ID, no server. The folder is the only shared medium, and nothing here is SharePoint-specific.

## 2. Scope

**In**

- Open a folder (`showDirectoryPicker`), persist its handle, list the models in it.
- Lock file per model: acquire, heartbeat, release, detect takeover, stale detection, manual takeover.
- Save guard on every save of a model in a shared folder.
- Reader mode for models locked by someone else, reusing the existing reader role.
- Detection of OneDrive conflict copies.

**Out (later issues)**

- 3-way merge by object id. This issue keeps the base snapshot merge would need (§7), but on conflict it offers *save as copy*, not *merge*.
- Exchange XML or `.archimate` as the shared format. Shared folders hold canonical JSON only (ADR 0004).
- Firefox and Safari: no directory handles there. They keep today's download workflow, and the folder action is hidden with a one-line explanation.

## 3. Where it fits in the code

| Today | Change |
|---|---|
| `src/io/file-system.ts` holds a `SaveFileHandle` per file | Add a `SharedFolder` abstraction over a `FileSystemDirectoryHandle` (§4) |
| `src/ui/files/FileWorkspaceProvider.tsx` `save()` writes through the handle | Route saves of shared-folder models through `SaveGuard` (§6) |
| `src/store/tab-lock.ts` elects a writer across tabs with Web Locks | Keep it. The folder lock is a **second, independent gate**: a tab is the writer only if it holds both the tab lock and the folder lock. Compose them; do not merge them |
| `src/ui/files/TakeoverScreen.tsx` renders the reader state | Extend it with the reason (another tab vs. another person) and the lock owner's details |
| `src/store/persistence.ts` (IndexedDB) | Persist the folder handle, the model's base snapshot and fingerprint (§7) |

New module, suggested: `src/io/shared-folder/` with `lock-file.ts`, `lock-manager.ts`, `fingerprint.ts`, `save-guard.ts`, `conflict-copies.ts`, `README.md`. **All decision logic lives here, free of React**, so it is unit-testable; the UI is thin glue.

## 4. Folder access

- **Open folder…** in the file menu and first-run screen calls `showDirectoryPicker({ mode: 'readwrite' })`.
- The handle is stored in IndexedDB. On the next visit, call `queryPermission`, and `requestPermission` from a **user gesture** if needed. Never assume a stored handle is still granted.
- List `*.json` files that parse as an Archipelago workspace. Ignore everything else, including lock files and conflict copies, which get their own treatment (§8).
- Opening a model from the folder uses the folder handle to get its file handle, so saves still go through the existing `saveWorkspaceToFile`.
- `createWritable()` writes to a swap file and moves it into place on `close()`, so model writes are atomic without extra work. The lock file is written the same way.

## 5. The lock file

**Name:** `<model file name>.lock`, e.g. `Landscape.json.lock`. Do not use a `~$` prefix: OneDrive does not sync those. Verify early that OneDrive syncs the chosen name.

**Content:** canonical JSON (sorted keys, ADR 0004).

```json
{
  "appVersion": "0.x.y",
  "displayName": "Markus",
  "heartbeatAt": "2026-10-07T08:27:03.000Z",
  "heartbeatSeq": 42,
  "schemaVersion": 1,
  "since": "2026-10-07T08:12:03.000Z",
  "token": "2b0f…"
}
```

- `token`: `crypto.randomUUID()` per acquisition. **Ownership is decided by token only**, because the same person may be on two machines or in two browser profiles.
- `displayName`: asked once, stored in the app's preferences. It is what others see. There is no other identity.
- `heartbeatSeq`: incremented on every heartbeat. Staleness is measured by how long **this** machine has seen it unchanged (§5.3), so clock skew between machines cannot make a live lock look stale.
- An unparseable or unknown-version lock file is treated as **held by someone else**. It fails closed, shown as "locked, owner unknown", with manual takeover available. This is a guard that must be tested on unreadable input (CLAUDE.md).

### 5.1 Acquire

1. Read the lock. If it is held by someone else and not stale, open as a reader (§9).
2. Otherwise write a new lock with a fresh token.
3. Wait `settleMs` (default 10,000) without blocking the UI, showing "Taking the model for editing…".
4. Re-read the lock. If our token is still there, we are the writer. Anything else (a different token, a missing file, unreadable content) means we lost: open as a reader and say who won.
5. Re-read the model file. If its fingerprint differs from what we loaded, reload it before allowing edits.

### 5.2 While holding

- Every `heartbeatMs` (default 60,000), read the lock. If our token is still there, rewrite it with `heartbeatSeq + 1`.
- If the token is gone or foreign, the lock was taken over. Switch to reader **immediately**, keep the in-memory edits, and show the single action **Save as copy** (§6.2). Never write to the model after losing the lock.
- On `visibilitychange` back to visible (after sleep), run the heartbeat at once rather than waiting for the timer.

### 5.3 Stale locks

- While a reader watches a lock, it records the local time whenever `heartbeatSeq` changes. When it has been unchanged for `staleAfterMs` (default 15 minutes), the lock is **stale**.
- A lock seen for the first time cannot be judged stale until it has been watched for `staleAfterMs`. Show it as "held" in the meantime. An "Unlock" action with confirmation covers the urgent case.
- Stale locks are offered for takeover ("Markus's lock looks abandoned: no sign of life for 17 minutes. Take over?"), never taken silently. Taking over runs the acquire procedure.

### 5.4 Release

- On **Close model**, **Open another model**, or after a successful save followed by close, delete the lock if, and only if, it still holds our token.
- `beforeunload` cannot await file I/O reliably. Attempt the release, but rely on staleness for the rest. Do not claim the lock was released.

### 5.5 Manual takeover

Available for any foreign lock, from the reader screen. It shows owner, since and last heartbeat seen, requires an explicit confirm, then runs acquire. Append a line to `.archipelago-log.jsonl` in the folder: time, display name, action, model, previous owner. Canonical JSON per line; values escaped by JSON, never joined by hand.

## 6. Save guard

### 6.1 Rule

Before writing a model in a shared folder:

1. **We hold the lock.** Re-read it. If the token is not ours, refuse.
2. **The file has not changed underneath us.** Read the file and compare its fingerprint with the one stored at our last read or write. If it differs, refuse.
3. Write. After `close()` resolves, store the new fingerprint and base snapshot, then `markSaved()`. This is the observed write the save-state invariant demands (CLAUDE.md, Constraints).

**Fingerprint:** SHA-256 of the file's bytes (`crypto.subtle.digest`). `lastModified` and `size` may be kept as a fast pre-check, but the hash decides, since sync clients can rewrite timestamps.

### 6.2 On refusal

A dialog with three outcomes, none of which marks the model clean:

- **Save as copy** writes `<name> (copy <displayName> <yyyy-MM-dd HHmm>).json` into the same folder. That copy then becomes the open file, with its own lock.
- **Discard my changes and reload** reads the file from disk.
- **Overwrite anyway** is shown only when check 2 failed, not check 1. It needs a second confirmation and is logged (§5.5).

The dirty counter stays as it was after **Save as copy** for the original model. The copy is a different file, so the indicator must say where the work now lives.

## 7. Base snapshot

Store in IndexedDB, per shared model: the fingerprint and the canonical JSON as last read or written. The save guard needs the fingerprint; a later merge issue needs the JSON as its base. Keeping both now costs one extra entry.

## 8. Conflict copies

When opening a folder and when opening a model, look for OneDrive conflict copies, matching `<stem>-<anything>.json` and `<stem>.json-<anything>.lock`, with modification times after the model was last saved by this app. List them in a non-blocking notice: "OneDrive kept 1 conflicting copy of Landscape.json. Open it to compare." No automatic action.

Treat the name pattern as a heuristic. A model a user deliberately named `Landscape-v2.json` must not be reported. Test the pattern with names that contain `-` and that look like the copy pattern.

## 9. Reader mode for a locked model

- Reuse the `reader` role. Navigation, inventory, fact sheets, views, reports and export all work. Every command is refused, as for a reader tab today.
- The reader screen names the owner, since when and the last heartbeat seen. It offers **Take over** (when stale) and **Unlock** (always, with confirmation).
- Poll the lock and the model file every `pollMs` (default 15,000) while visible. When the model file changes on disk, reload it automatically: readers have nothing to lose. When the lock is released or goes stale, say so and offer **Edit**.

## 10. Configuration

In the app's preferences, all with the defaults above: `displayName`, `settleMs`, `heartbeatMs`, `staleAfterMs`, `pollMs`. Validate them through guards on the write path; an empty field yields the default, never `0`.

## 11. Acceptance criteria

1. **Open folder** lists the workspace models in a chosen folder, and the folder is offered again after a reload without the picker (permission re-requested from a click if needed).
2. Opening a model with no lock makes this tab the writer after the settle delay, and writes a lock file containing a fresh token and the display name.
3. Opening a model whose lock is held by another token, with a live heartbeat, opens it as a reader showing the owner's name. No command can change the model.
4. Two clients acquiring the same free lock within the settle delay end with **exactly one** writer.
5. A writer whose token disappears from the lock file switches to reader within one heartbeat, keeps its in-memory edits, and can save them only as a copy.
6. A save is refused when the model file's hash differs from the one recorded at last read or write, and refused when the lock is not ours. Neither refusal marks the model clean.
7. **Save as copy** writes a new file in the folder, opens it, and leaves no write on the original.
8. **Overwrite anyway** requires two confirmations and writes a line to `.archipelago-log.jsonl`.
9. A lock whose `heartbeatSeq` has not changed for `staleAfterMs` of **local** observation is shown as stale and offered for takeover. A remote `heartbeatAt` far in the past or future, with a changing `heartbeatSeq`, is **not** stale.
10. An unparseable lock file is treated as held by an unknown owner, not as free.
11. Closing a model deletes the lock only when it holds our token. A lock with a foreign token is never deleted except by explicit takeover.
12. OneDrive-style conflict copies of an open model are listed in a notice. `Landscape-v2.json` saved by the app itself is not.
13. Models opened outside a shared folder (single file, download fallback, demo) behave exactly as before. The existing file-workflow tests pass unchanged.
14. In Firefox and Safari the folder action is absent, and the app says why.

## 12. Tests

- **Unit (Vitest) over `src/io/shared-folder/`:** drive every branch of §5 and §6 with an in-memory directory fake, a controllable clock and a controllable random source. Include a **delayed-visibility fake**: two clients over one store, where a write by one becomes visible to the other only after a configurable delay. Criteria 4, 5 and 9 depend on it.
- **Every fallback fires in a test** (CLAUDE.md): unreadable lock, permission denied, `requestPermission` refused, the file vanishing between check and write, the lock vanishing during the settle delay, a heartbeat write failing.
- **The fake tests the protocol, not the environment** (CLAUDE.md). Add a Playwright journey that uses **real** directory handles from the origin-private file system (`navigator.storage.getDirectory()`). It is the same `FileSystemDirectoryHandle` API, minus the picker, so open, lock, save, refusal and save-as-copy run against a real implementation. Two browser contexts share one origin's OPFS only within one profile, so the cross-machine race stays a unit test.
- **Remove each guard and watch its test fail**, one guard at a time, before claiming a criterion.
- **Manual UAT script** in `tests/manual/`: two machines, one synced SharePoint library, covering criteria 2–8, 11 and 12 with real OneDrive sync delays.

## 13. Housekeeping in the same PR

- ADR 0010 status to Accepted once the sponsor agrees, and add it to `design/decisions/README.md`.
- CLAUDE.md, Constraints: extend "Nothing leaves the browser except file downloads the user initiates" with "…or writes into a folder the user explicitly granted (ADR 0010)."
- `src/io/README.md`: a short section on shared folders and the lock protocol.
- `session-log.md` entry.

## 14. Open questions for the sponsor

1. **Display name:** free text, or should the app suggest something? There is no directory to look people up in.
2. **Default timings:** 10 s settle, 60 s heartbeat, 15 min stale. OneDrive normally syncs within seconds but can lag for minutes. Shorter means faster takeover; longer means fewer false stale locks.
3. **Hosting:** the app is served from public GitHub Pages. Can the team's browsers reach it, or does the same static build need an internal host?
