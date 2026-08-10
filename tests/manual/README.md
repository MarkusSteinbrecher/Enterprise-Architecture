# Manual UAT scripts

Markdown checklists a non-engineer can follow without reading code. They verify that the
user-facing flow **works**; the Playwright specs in [`../e2e/`](../e2e) verify that it
**keeps working**. Each script pairs 1:1 with a spec of the same name:

| Flow                                          | Script                                       | Automated counterpart             |
| --------------------------------------------- | -------------------------------------------- | --------------------------------- |
| The app comes up, in both themes              | [`smoke.md`](smoke.md)                       | `../e2e/smoke.spec.ts`            |
| Empty state → demo workspace                  | [`first-run.md`](first-run.md)               | `../e2e/first-run.spec.ts`        |
| Faceted filtering and saved searches          | [`inventory-filter.md`](inventory-filter.md) | `../e2e/inventory-filter.spec.ts` |
| Editing an element and the save-state counter | [`fact-sheet-edit.md`](fact-sheet-edit.md)   | `../e2e/fact-sheet-edit.spec.ts`  |
| Export → reimport → export                    | [`file-round-trip.md`](file-round-trip.md)   | `../e2e/file-round-trip.spec.ts`  |

The scripts cover the same ground as the specs on purpose, plus the parts a machine cannot
judge: whether the wrong thing flashed on screen, whether a message reads as alarming,
whether the density is right. Where a script asks for a judgement rather than a check, it
says so.

## Running a UAT cycle

Definition lives here; **execution lives in GitHub** (HQ testing convention §6):

1. Open an issue from the **UAT cycle** template — one per cycle, one tester, one build.
2. Work through each script in scope, ticking as you go.
3. Every failure opens its own bug issue, linked back to the cycle issue and naming the
   script that surfaced it. Tick the cycle row as `— failed, see #<bug>`.
4. Close the cycle with a comment saying what passed, what did not, and what moved to the
   backlog.

Automated runs need none of this: CI runs `npm run test:e2e` on every pull request and
uploads traces, screenshots and video for anything that fails.

## Keeping them honest

A script that describes a screen the app no longer has is worse than no script. **Update
the script in the same PR that changes the feature it covers** — if there is no time for
the script, there is no time for the change (convention §7).

## Where to run

| Environment    | URL                                                                                 |
| -------------- | ----------------------------------------------------------------------------------- |
| `local`        | `npm run dev` → http://localhost:5173/Enterprise-Architecture/                      |
| `preview`      | `npm run build && npm run preview` → http://localhost:4173/Enterprise-Architecture/ |
| `github-pages` | https://markussteinbrecher.github.io/Enterprise-Architecture/                       |

Prefer `preview` or `github-pages`: the dev server does not exercise the production bundle
or the deep-link redirect. Every script starts from an **empty browser profile** — a fresh
private window, or DevTools → Application → Storage → _Clear site data_ — because the first
thing under test is what a new user sees.
