# Shared-folder collaboration: lock file + save guard

**Decision:** ADR 0010 (Proposed). **Relates to:** #59, #11 (file workflow), ADR 0002 (`TabLock`), ADR 0004 (canonical JSON).
**Suggested branch:** `feat/<issue#>-shared-folder-lock`.

## 1. Problem

A team keeps its models in a SharePoint library that each architect syncs locally with the OneDrive client. Archipelago can already save into that folder through the File System Access API (#11). Two architects who open the same model and both save lose one person's work silently: OneDrive keeps the last write or makes a `<name>-<COMPUTERNAME>.json` conflict copy nobody merges.

This issue makes that safe: **one editor per model at a time, enforced by a lock file next to the model, and no conflicting save goes unnoticed.** A save never overwrites a change that has reached this machine, and a change that had not reached it yet is caught afterwards and shown to the user.

No Graph API, no Entra ID, no server. The folder is the only shared medium, and nothing here is SharePoint-specific.

### 1.1 What a synced folder can and cannot guarantee

The folder is eventually consistent, and the browser cannot see the sync client's state. Every guarantee below is local: it holds for what has already arrived on this machine. Three situations get past the lock and the save guard:

1. **The acquire race.** Two clients take a free lock and their writes take longer than `settleMs` to cross. Both re-read their own token and both become writer.
2. **The offline writer.** A laptop loses its connection while holding the lock. Its heartbeats stop reaching the others, who see the lock go stale and take over. The laptop keeps heartbeating and saving locally; its save guard passes, because it only sees the local file.
3. **The change in flight.** The save guard reads the local file, which does not yet contain a colleague's save that is still syncing.

In all three, OneDrive resolves the clash by keeping one version as `X.json` and renaming the other to a conflict copy. Nothing is destroyed, but one person's work is in a file nobody opened. **So conflict-copy detection (§8) and the writer's own watch on the model file (§5.2) are what make the mode safe, not extras.** The lock keeps clashes rare; detection keeps them visible. SharePoint version history is the last safety net.

The UI and the documentation must not claim more than this. In particular, the save-state indicator must stop saying "saved" once the file it saved to is seen to hold something else (§8.2).

## 2. Scope

**In**

- Open a folder (`showDirectoryPicker`), persist its handle, list the models in it.
- Lock file per model: acquire, heartbeat, release, detect takeover, stale detection, manual takeover.
- Save guard on every save of a model in a shared folder.
- Writer-side watch on the model file while holding the lock.
- Reader mode for models locked by someone else, reusing the existing reader role.
- Detection of OneDrive conflict copies, on open and while a model is open.

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
| `src/store/persistence.ts` (IndexedDB) | Persist the folder handle, the model's base snapshot and fingerprint (§7), lock observations (§5.3), dismissed conflict notices (§8) |
| `store.markSaved()` has no inverse (`FileWorkspaceProvider.tsx`) | The indicator needs a way to leave the saved state when the saved file is overwritten from outside (§8.2) |

New module, suggested: `src/io/shared-folder/` with `lock-file.ts`, `lock-manager.ts`, `fingerprint.ts`, `save-guard.ts`, `conflict-copies.ts`, `file-names.ts`, `README.md`. **All decision logic lives here, free of React**, so it is unit-testable; the UI is thin glue.

## 4. Folder access

- **Open folder…** in the file menu and first-run screen calls `showDirectoryPicker({ mode: 'readwrite' })`.
- The handle is stored in IndexedDB together with a **folder key**: a `crypto.randomUUID()` assigned the first time the folder is opened. Opening a folder again finds its key by `isSameEntry` against the stored handles, not by name; two libraries may both be called `Architecture`.
- On the next visit, call `queryPermission`, and `requestPermission` from a **user gesture** if needed. Never assume a stored handle is still granted.
- **Listing** shows `*.json` files by name, minus lock files, the logs (§5.5) and suspected conflict copies (§8). It does **not** parse every file: with OneDrive's Files On-Demand, reading a file downloads it, and listing would download the whole library. A file is validated when it is opened; one that is not an Archipelago workspace is reported then, as for any import.
- Opening a model from the folder uses the folder handle to get its file handle, so saves still go through the existing `saveWorkspaceToFile`.
- `createWritable()` writes to a swap file and moves it into place on `close()`, so model writes are atomic locally. The lock file is written the same way. On Windows the sync client can hold the file open during upload, so `close()` can reject; that is a failed save (§6.1), never a clean one.

## 5. The lock file

**Name:** `<model file name>.lock`, e.g. `Landscape.json.lock`. Do not use a `~$` prefix: OneDrive does not sync those. OneDrive and SharePoint also reserve some names outright (a file named exactly `.lock`, `desktop.ini`, `_vti_`); `<name>.lock` is not one of them, but verify early that OneDrive syncs the chosen lock and log names.

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
- `displayName`: asked once, stored in the app's preferences. It is what others see. There is no other identity. When a foreign lock carries the user's own display name, say so: "Locked by you (Markus) in another browser or on another machine." A forgotten tab on the office desktop is the common case.
- `heartbeatSeq`: incremented on every heartbeat. Staleness is measured by how long **this** machine has seen it unchanged (§5.3), so clock skew between machines cannot make a live lock look stale.
- An unparseable or unknown-version lock file is treated as **held by someone else**. It fails closed, shown as "locked, owner unknown", with manual takeover available. This is a guard that must be tested on unreadable input (CLAUDE.md).
- **"Cannot read the lock" is not "the lock is foreign".** A read that throws (the sync client holding the file, a permission lapse) is a failed observation, not a result. Each step below says what a failed observation does.

### 5.1 Acquire

1. Read the lock. If it is held by someone else and not stale, open as a reader (§9). If the read fails, open as a reader and say the lock could not be read.
2. Otherwise write a new lock with a fresh token.
3. Wait `settleMs` (default 10,000) without blocking the UI, showing "Taking the model for editing…".
4. Re-read the lock. If our token is still there, we are the writer. Anything else (a different token, a missing file, unreadable content, a failed read) means we lost: open as a reader and say who won, if known.
5. Re-read the model file. If its fingerprint differs from what we loaded, reload it before allowing edits.

The settle delay only resolves races whose writes cross within `settleMs` (§1.1, case 1). It narrows the window; it does not close it.

### 5.2 While holding

Every `heartbeatMs` (default 60,000):

1. **Read the lock.** Our token: rewrite it with `heartbeatSeq + 1`. A foreign token or a missing file: the lock was taken over or unlocked. Switch to reader **immediately**, keep the in-memory edits, and show the single action **Save as copy** (§6.2). Never write to the model after losing the lock. A failed read: retry at the next heartbeat; do not demote on it.
2. **Fingerprint the model file** and compare it with the one stored at our last read or write. A difference while we hold the lock means someone wrote it anyway (§1.1) or the sync client swapped in another version. Raise the alarm in §8.2.
3. **Scan for conflict copies** of the open model (§8).

**Self-fencing.** If no heartbeat has completed (read and rewrite both succeeding) for `staleAfterMs / 2`, the writer demotes itself to reader as in step 1. Others start judging the lock stale after `staleAfterMs` of their own observation; the writer must stop believing it holds the lock before they can take it. This does not cover the offline writer (§1.1, case 2), whose local writes all succeed; nothing in the browser can see that the sync client is not uploading.

On `visibilitychange` back to visible (after sleep), run the heartbeat at once rather than waiting for the timer.

### 5.3 Stale locks

- While a reader watches a lock, it records the local time whenever `heartbeatSeq` changes. When it has been unchanged for `staleAfterMs` (default 15 minutes), the lock is **stale**.
- The observation (token, `heartbeatSeq`, local time first seen at that value) is kept in IndexedDB per model, so a reload on the same machine continues the watch instead of restarting it.
- A lock with no recorded observation cannot be judged stale until it has been watched for `staleAfterMs`. Show it as "held" in the meantime. An "Unlock" action with confirmation covers the urgent case.
- Stale locks are offered for takeover ("Markus's lock looks abandoned: no sign of life for 17 minutes. Take over?"), never taken silently. Taking over runs the acquire procedure. The prompt says that an offline colleague may still be editing, and that their work would then come back as a conflict copy.

### 5.4 Release

- On **Close model**, **Open another model**, or after a successful save followed by close, delete the lock if, and only if, it still holds our token.
- `beforeunload` cannot await file I/O reliably. Attempt the release, but rely on staleness for the rest. Do not claim the lock was released.

### 5.5 Manual takeover and the audit log

Takeover is available for any foreign lock, from the reader screen. It shows owner, since and last heartbeat seen, requires an explicit confirm, then runs acquire.

Takeovers, unlocks and overwrites (§6.2) are logged. Each browser profile writes **its own** log file, `.archipelago-log-<clientId>.jsonl`, where `clientId` is a `crypto.randomUUID()` stored once in IndexedDB. Appending through `createWritable` rewrites the whole file, so a single shared log written from several machines would itself produce conflict copies. Per-client files have one writer each. Anything that shows the history reads all of them and orders by time.

A line holds time, display name, action, model file name and previous owner. Canonical JSON per line; values escaped by JSON, never joined by hand.

## 6. Save guard

### 6.1 Rule

Before writing a model in a shared folder:

1. **We hold the lock.** Re-read it. If the token is not ours, or the read fails, refuse.
2. **The file has not changed underneath us.** Read the file and compare its fingerprint with the one stored at our last read or write. If it differs, or the file is gone, refuse.
3. **Write.** After `close()` resolves, store the fingerprint **of the bytes we wrote**, and those bytes as the base snapshot, then `markSaved()`. Do not re-read the file to fingerprint it: a change that lands in between would be recorded as ours. This is the observed write the save-state invariant demands (CLAUDE.md, Constraints). If `write()` or `close()` rejects, the save failed: store nothing, mark nothing.

Checks 1 and 2 only see this machine (§1.1, case 3). They catch every conflict that has already synced; the watch in §5.2 and the scan in §8 catch the rest after the fact.

**Fingerprint:** SHA-256 of the file's bytes (`crypto.subtle.digest`). `lastModified` and `size` may be kept as a fast pre-check, but the hash decides, since sync clients can rewrite timestamps.

### 6.2 On refusal

A dialog with three outcomes. The refusal itself marks nothing clean.

- **Save as copy** writes a new file into the same folder (naming below), then opens it as the current model and acquires its lock (§5.1). The copy was written and observed, so it is clean. The original file is not written, and its lock, if we held it, is released as in §5.4. The indicator and a notice name where the work now is: "Your changes are in `Landscape (copy Markus 2026-10-07 0827).json`. `Landscape.json` was not changed."
- **Discard my changes and reload** reads the file from disk.
- **Overwrite anyway** is shown only when check 2 failed, not check 1. It needs a second confirmation and is logged (§5.5).

**Copy file names** are built in `file-names.ts`:

- Pattern: `<stem> (copy <displayName> <yyyy-MM-dd HHmm>).json`, local time.
- The display name is user-authored. Replace every character Windows or SharePoint rejects in a file name (`" * : < > ? / \ |`, control characters) with `_`, trim leading and trailing spaces and dots, and drop a leading `~$`. An empty result becomes `user`.
- If the name exists, append ` 2`, ` 3`… inside the parentheses until it does not, checking with `getFileHandle` without `create`. The API has no exclusive create (`create: true` returns an existing file), so a name appearing between check and write is not caught. That gap is accepted: it needs the same display name saving a copy of the same model in the same minute, and the rename would surface as a conflict copy (§8).

## 7. Base snapshot

Store in IndexedDB, per shared model: the fingerprint and the canonical JSON as last read or written. The save guard needs the fingerprint; a later merge issue needs the JSON as its base. Keeping both now costs one extra entry.

**Key:** the IndexedDB array key `[folderKey, fileName]` (§4). Never a string built by joining the two; a file name may contain any separator you pick (CLAUDE.md). The lock observations (§5.3) and dismissed notices (§8) use the same key.

## 8. Conflict copies

### 8.1 Scanning

Scan when a folder is opened, when a model is opened, on every heartbeat (§5.2) and on every reader poll (§9). Conflict copies appear minutes after the fact, when sync catches up, so a scan only at open misses exactly the case it exists for.

A **suspected conflict copy** of `<stem>.json` is a file matching `<stem>-<anything>.json`, or `<stem>.json-<anything>.lock` for the lock. Do not filter by modification time: sync clients rewrite timestamps (§6.1), and a conflict copy of our own save carries our save's time. Exclude the app's own copy names (§6.2), which never use this pattern.

A name pattern cannot tell a OneDrive copy (`Landscape-DESKTOP7.json`) from a file a person named on purpose (`Landscape-v2.json`). So the notice says *possible*, and lets the user dismiss it:

> 1 file may be a conflicting copy of Landscape.json kept by OneDrive: `Landscape-DESKTOP7.json`. Open it to compare. [Dismiss]

A dismissed name is remembered per model (§7) and not reported again. A newly appearing name is. No automatic action.

### 8.2 The writer's file changed under its lock

When the writer's check in §5.2 finds the model file's fingerprint changed, the user's last save may have been moved into a conflict copy, and the file the app points at now holds someone else's version. This notice is **blocking**, not passive:

> Landscape.json changed on disk while you held it for editing. Your last save may have been moved to a conflicting copy by OneDrive. Your work is still open here.

From this moment:

- The save-state indicator **leaves the saved state.** It must not keep saying "saved" about a file whose contents it no longer matches (CLAUDE.md, Constraints). `markSaved()` has no inverse today; this issue adds one, or a separate "file diverged" state the indicator reads alongside the dirty counter. Either way it needs its own test.
- The next save is refused by check 2 and goes through §6.2, so the user chooses: save as copy, reload, or overwrite.
- The suspected conflict copies (§8.1) are listed in the same notice.

## 9. Reader mode for a locked model

- Reuse the `reader` role. Navigation, inventory, fact sheets, views, reports and export all work. Every command is refused, as for a reader tab today.
- The reader screen names the owner, since when and the last heartbeat seen. It offers **Take over** (when stale) and **Unlock** (always, with confirmation).
- Poll the lock and the model file every `pollMs` (default 15,000) while visible, and scan for conflict copies (§8.1). When the lock is released or goes stale, say so and offer **Edit**.
- When the model file changes on disk, **reload it automatically only if this reader holds no unsaved changes.** A writer demoted in §5.2 is a reader that does hold some. For it, show "Landscape.json changed on disk. Your edits are kept here; save them as a copy." and never reload without an explicit **Discard my changes and reload**.

## 10. Configuration

In the app's preferences, all with the defaults above: `displayName`, `settleMs`, `heartbeatMs`, `staleAfterMs`, `pollMs`. Validate them through guards on the write path; an empty field yields the default, never `0`. Reject `staleAfterMs` below `4 × heartbeatMs`, so self-fencing at `staleAfterMs / 2` leaves room for at least one missed heartbeat.

## 11. Acceptance criteria

1. **Open folder** lists the workspace models in a chosen folder without reading their contents, and the folder is offered again after a reload without the picker (permission re-requested from a click if needed).
2. Opening a model with no lock makes this tab the writer after the settle delay, and writes a lock file containing a fresh token and the display name.
3. Opening a model whose lock is held by another token, with a live heartbeat, opens it as a reader showing the owner's name. No command can change the model.
4. Two clients acquiring the same free lock, whose writes become visible to each other **within** the settle delay, end with exactly one writer. When the writes take **longer** than the settle delay, both may become writer; then the sync client keeps one version under the name, and the other client is told: its save is refused, or its writer watch or conflict scan raises §8. Neither client's work is lost unseen.
5. A writer whose token disappears from the lock file switches to reader within one heartbeat, keeps its in-memory edits, and can save them only as a copy. A failed lock read does not demote it; `staleAfterMs / 2` without a completed heartbeat does.
6. A save is refused when the model file's hash differs from the one recorded at last read or write, and refused when the lock is not ours or cannot be read. Neither refusal marks the model clean. A `close()` that rejects marks nothing clean.
7. **Save as copy** writes a new file in the folder, opens it, and leaves no write on the original. A display name containing `/`, `:` or `"` yields a valid file name, and a second copy in the same minute does not overwrite the first.
8. **Overwrite anyway** requires two confirmations and writes a line to this client's log file.
9. A lock whose `heartbeatSeq` has not changed for `staleAfterMs` of **local** observation is shown as stale and offered for takeover, including when that observation spans a reload. A remote `heartbeatAt` far in the past or future, with a changing `heartbeatSeq`, is **not** stale.
10. An unparseable lock file is treated as held by an unknown owner, not as free.
11. Closing a model deletes the lock only when it holds our token. A lock with a foreign token is never deleted except by explicit takeover.
12. A suspected conflict copy of an open model appearing **while** it is open is listed within one heartbeat or poll. The app's own copy names are never listed. A dismissed name is not listed again.
13. When the model file changes on disk while this tab holds its lock, the save-state indicator stops saying saved and a blocking notice explains why.
14. A reader with no unsaved changes reloads a changed model automatically. A demoted writer with unsaved changes never does.
15. Models opened outside a shared folder (single file, download fallback, demo) behave exactly as before. The existing file-workflow tests pass unchanged.
16. In Firefox and Safari the folder action is absent, and the app says why.

## 12. Tests

- **Unit (Vitest) over `src/io/shared-folder/`:** drive every branch of §5, §6 and §8 with an in-memory directory fake, a controllable clock and a controllable random source. Include a **delayed-visibility fake**: two clients over one store, where a write by one becomes visible to the other only after a configurable delay, and where concurrent writes to one name resolve as OneDrive does: one version keeps the name, the other is renamed to `<stem>-<CLIENT>.<ext>`. Run criterion 4 with the delay both below and above `settleMs`; criteria 5, 9, 12 and 13 depend on the same fake.
- **The three cases of §1.1 each get a scenario test** that ends with the losing client told, not with both clients believing they saved: the acquire race above `settleMs`, the offline writer (a client whose writes stop reaching the other while its local writes succeed), and the change in flight.
- **Every fallback fires in a test** (CLAUDE.md): unreadable lock, a lock read that throws (distinct from a foreign token), permission denied, `requestPermission` refused, the file vanishing between check and write, the lock vanishing during the settle delay, a heartbeat write failing until self-fencing, `close()` rejecting.
- **Separator and escaping** (CLAUDE.md): copy file names from display names containing every forbidden character, and display names that look like an already-sanitised name; a model file name containing `-` and `(copy` against the conflict pattern; lock observations for two folders with the same name.
- **The fake tests the protocol, not the environment** (CLAUDE.md). Add a Playwright journey that uses **real** directory handles from the origin-private file system (`navigator.storage.getDirectory()`). It is the same `FileSystemDirectoryHandle` API, minus the picker, so open, lock, save, refusal and save-as-copy run against a real implementation. Two browser contexts share one origin's OPFS only within one profile, so the cross-machine race stays a unit test.
- **Remove each guard and watch its test fail**, one guard at a time, before claiming a criterion.
- **Manual UAT script** in `tests/manual/`: two machines, one synced SharePoint library, covering criteria 2–8, 11–13 with real OneDrive sync delays, plus one run with a machine taken offline while holding the lock.

## 13. Housekeeping in the same PR

- ADR 0010 status to Accepted once the sponsor agrees, and add it to `design/decisions/README.md`.
- CLAUDE.md, Constraints: extend "Nothing leaves the browser except file downloads the user initiates" with "…or writes into a folder the user explicitly granted (ADR 0010)."
- `src/io/README.md`: a short section on shared folders, the lock protocol and its limits (§1.1).
- `session-log.md` entry.

## 14. Open questions for the sponsor

1. **Display name:** free text, or should the app suggest something? There is no directory to look people up in.
2. **Default timings:** 10 s settle, 60 s heartbeat, 15 min stale. OneDrive normally syncs within seconds but can lag for minutes. Shorter means faster takeover; longer means fewer offline colleagues wrongly judged gone (§1.1, case 2), whose work then returns as a conflict copy. Since **Unlock** already covers the urgent case, a longer stale default (30 minutes) is worth considering.
3. **Hosting:** the app is served from public GitHub Pages. Can the team's browsers reach it, or does the same static build need an internal host?
