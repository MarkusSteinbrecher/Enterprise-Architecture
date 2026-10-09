# Shared folders

A model kept in a folder that a sync client (OneDrive, Dropbox, a network
drive) mirrors to every architect's machine, edited by one person at a time
(ADR 0010; spec `design/specs/shared-folder-collaboration.md`, #147).

This directory holds the protocol, React-free. Every decision is made here and
returned as data; the UI applies it. The folder is reached only through
`Folder` (`folder.ts`), so everything runs in tests against the sync world in
`src/test/sync-world.ts`, which delays what one machine writes before another
sees it and makes conflict copies as OneDrive does.

| File                                  | What it decides                                                                                                                                                                               |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lock-file.ts`                        | The lock's canonical JSON, and what counts as a lock. A file it cannot read is held by someone unknown, never free.                                                                           |
| `lock-manager.ts`                     | Taking the lock (write, settle, re-read), the heartbeat, self-fencing at half the stale time, staleness by this machine's watch of the counter, release, unlock.                              |
| `save-guard.ts`                       | The two checks before every write, and save as copy.                                                                                                                                          |
| `session.ts`                          | One open model: load, acquire, the writer's and the reader's tick, save, overwrite (logged first), unlock, close. `diverged` is what the save-state indicator reads beside the dirty counter. |
| `conflict-copies.ts`, `file-names.ts` | Possible conflict copies (`Landscape-PC.json`, `Landscape.json-PC.lock`); copy names safe for Windows and SharePoint; the lock and log names.                                                 |
| `audit-log.ts`                        | One log per browser profile; takeovers, unlocks and overwrites.                                                                                                                               |
| `settings.ts`                         | The timings and the display name, guarded on the way in.                                                                                                                                      |
| `memory.ts`                           | What is remembered per `[folderKey, fileName]` pair: lock observations, dismissed copies.                                                                                                     |

## What it cannot do

A synced folder is eventually consistent, and the browser cannot see the sync
client. Every check reads this machine's copy. Three cases get past the lock
and the save guard (spec §1.1): two people taking a free lock while sync is
slower than the settle delay; a writer that went offline and was taken over as
stale; and a save that has not arrived yet. In each, the sync client keeps one
version and renames the other. The writer's tick, which re-fingerprints the
model and scans for conflict copies every heartbeat, is what tells the user.
The tests end each of those cases with a client told.

## Still to come

Folder access over `FileSystemDirectoryHandle`, IndexedDB for `memory.ts`, and
the Open folder screen are the second PR of #147. The writer and reader
screens, the save dialog and the OPFS journey are the third.
