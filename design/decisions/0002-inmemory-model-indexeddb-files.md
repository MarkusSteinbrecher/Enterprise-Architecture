---
adr: '0002'
title: In-memory model + IndexedDB snapshots; files are the source of truth
date: 2026-08-06
status: Accepted
scope: project
tags: [storage, indexeddb, local-first, sqlite, tinybase]
---

# ADR 0002 — In-memory model + IndexedDB snapshots; files are the source of truth

## Context

GitHub Pages cannot set HTTP headers, the dataset is 500–5,000 elements (single-digit MB), and queries are referential/graph-shaped. Storage research (2026-08-06) compared SQLite WASM variants, IndexedDB wrappers, TinyBase, RxDB, PouchDB, and the in-memory + snapshot pattern.

## Decision

The whole model lives **in memory** (Maps + adjacency indexes); **IndexedDB (via `idb`) persists debounced snapshots** with rolling generations; **exported files are the source of truth** — canonical JSON saved via the File System Access API on Chromium, download fallback elsewhere. All mutations flow through a command stack (undo/redo, dirty counter). Web Locks + BroadcastChannel guard against a second tab.

## Alternatives considered

- **SQLite WASM (`opfs-sahpool`)** — works header-free on Pages, but SQL is the wrong shape for multi-hop graph traversal at this scale, and it adds worker/wasm plumbing plus a single-tab lock for zero query benefit.
- **TinyBase** — genuinely good fit (built-in relationships/indexes/reactive queries, CRDT path); rejected in favour of owning a thin model layer with no framework coupling. Revisit if reactive-query needs outgrow hand-rolled subscriptions.
- **RxDB** (premium storage paywall), **PouchDB** (CouchDB-replication shaped), **LokiJS** (unmaintained) — rejected.

## Consequences

- Browser storage is treated as a cache: Safari can evict it after 7 days idle, so the save-state indicator and file workflow are core UX, not chrome.
- A CRDT (Automerge/Yjs) can later replace the mutation path without rearchitecting, because state stays JSON-shaped behind the command interface.
- Implemented in issue #4.

## References

Concept §5.2; browser-persistence research 2026-08-06 (sqlite.org persistence docs, PowerSync review, caniuse).
