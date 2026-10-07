---
adr: '0010'
title: A shared synced folder is the first collaboration mode; one editor per model, enforced by a lock file
date: 2026-10-07
status: Proposed
scope: project
tags: [collaboration, files, sharepoint, onedrive, locking]
---

# ADR 0010 — A shared synced folder is the first collaboration mode; one editor per model, enforced by a lock file

## Context

The modelling concept (§4) and #59 plan collaboration as git with a split format first (option A) and a CRDT sync service later (option B). Both assume something the first real team does not have. The team's shared storage is a SharePoint document library. There is no git server it can use, and no Entra ID app registration, so the Microsoft Graph API is out of reach.

What the team does have is the OneDrive sync client. It mirrors a SharePoint library into a local folder on every architect's machine. Archipelago already writes files there: on Chromium browsers (the team uses Edge) the File System Access API keeps a handle to the model file, and every save goes straight back to it (#11). So SharePoint is already reachable as a transport, with no server and nothing leaving the browser except to a folder the user picked.

What is missing is coordination. Two architects who open the same `.json` and both save will lose one person's work silently. OneDrive either keeps the last write or produces a `<name>-<COMPUTERNAME>.json` conflict copy that nobody merges. The cross-tab `TabLock` (ADR 0002) does not help, because Web Locks are per browser profile, not per folder.

## Decision

**Add a third collaboration mode, ahead of A and B: a shared folder synced by any tool, with one editor per model at a time.**

- The user opens a **folder**, not only a file (`showDirectoryPicker`). The folder handle is persisted in IndexedDB, so it survives a reload.
- Next to each model `X.json` lives `X.json.lock`, a small JSON file naming who holds the model for editing, with a random token, a heartbeat and the app version. Whoever holds a valid lock is the **writer**; everyone else opens the model as a **reader**, which reuses the reader role and takeover screen that `TabLock` already drives.
- A **save guard** runs before every write to a model in a shared folder. It refuses to overwrite a file that changed on disk since we last read or wrote it, and offers to save a copy, reload, or overwrite after a second confirmation.
- The mode is opt-in per folder and touches nothing else. A single architect saving one file anywhere keeps today's behaviour.

The transport is deliberately **not** SharePoint-specific. Anything that syncs a folder (OneDrive, Dropbox, a network drive, Syncthing) works the same, which keeps the static, serverless deployment and the "server optional, never required" principle (concept §4).

## Alternatives considered

- **Graph API against SharePoint directly** (check-out/check-in, ETags, delta queries). This is the cleanest technically, but it needs an Entra ID app registration the team cannot get, and it would bind the product to Microsoft.
- **Git in the synced folder.** OneDrive corrupts `.git` internals; this is a known failure mode, not a risk.
- **Optimistic merge without locks.** Canonical JSON with stable ids (ADR 0004) makes a 3-way merge by object id possible, and that is the planned second step (see Consequences). It is not the first step, because it needs a base snapshot, conflict UI and view-level merge rules, while the lock is small and removes the failure that matters now: silent loss.
- **Wait for option A or B.** Neither is reachable for this team, so waiting means no collaboration at all.

## Consequences

- The "nothing leaves the browser except user-initiated downloads" constraint holds in spirit but needs one sentence of clarification in CLAUDE.md: the app may also write lock files and saves **into a folder the user explicitly granted**.
- Only Chromium browsers get this mode, because only they implement directory handles. Firefox and Safari keep the download workflow and say so.
- Sync is eventually consistent. Two people who both take a free lock within the sync delay can both believe they hold it. The save guard is what makes that race harmless: the second save sees a changed file and refuses. Version history in SharePoint is the last safety net.
- Machines' clocks disagree, so staleness is judged by **how long this machine has seen the heartbeat unchanged**, never by comparing a remote timestamp with the local clock.
- Merging becomes the natural next step. Keeping the last-read file as a base snapshot (which the save guard needs anyway) is exactly what a 3-way merge by id needs, so "save as copy" can later become "merge".
- Options A and B stay on the roadmap. The split format of option A is not required here; a single canonical JSON per model is fine as long as one person edits it at a time.

## References

Concept `archi-class-modelling-concept.md` §4; #59; ADR 0002 (TabLock); ADR 0004 (canonical JSON); implementation spec `design/specs/shared-folder-collaboration.md`.
