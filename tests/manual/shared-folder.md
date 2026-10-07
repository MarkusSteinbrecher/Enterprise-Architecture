# Shared folder: two machines, one synced library

> Verifies what no test can: two real machines, a real sync client and its real
> delays (#147, ADR 0010; spec `design/specs/shared-folder-collaboration.md` §11).
> The automated journeys run real directory handles in one browser; this is the
> cross-machine half. **About 40 minutes, two people or two machines.**

## Preconditions

- [ ] Build under test: `<commit SHA or Pages deployment>`
- [ ] Machines **A** and **B**, each with Edge or Chrome, and the same SharePoint
      library (or OneDrive/Dropbox folder) synced locally on both
- [ ] In the folder: one Archipelago model, `Landscape.json` (save the demo there)
- [ ] B is a different person, or at least a different browser profile, with
      another display name

## Steps

1. **A:** Import → **Open a shared folder…** → **Open folder…**, pick the synced
   folder. Expected: the name prompt, once. Enter `A`. The folder lists
   `Landscape.json` and no lock or log files.
2. **A:** Open `Landscape.json`. Expected: "Taking Landscape.json for editing…"
   for about 10 s, then "Editing Landscape.json in …". `Landscape.json.lock`
   appears in the folder (criterion 2).
3. **B:** Open the same folder and model. Expected: read-only, "A is editing
   it"; **+ Element** is disabled (criterion 3).
4. **A:** Add an element and **SAVE FILE**. Expected: "Saved to …"; within a
   minute or so, B's model reloads by itself and shows the element, with a
   notice saying so (criterion 14).
5. **B:** Make no edits. **A:** reload the page and reopen the folder.
   Expected: the folder is offered under "Opened before" with no picker; the
   browser may ask permission on **Open** (criterion 1).
6. **A:** close the browser tab without closing the model. **B:** wait 30
   minutes (the stale time). Expected: "No sign of life for 30 minutes" and
   **Take over…** (criterion 9). Take over. Expected: B becomes the editor, and
   a line appears in B's `.archipelago-log-….jsonl` (criterion 8, takeover).
7. **Offline writer.** **B** holds the model. Take B's machine offline (Wi-Fi
   off). **A:** wait out the stale time, take over, add an element, save.
   **B:** add a different element and save: it succeeds locally (the documented
   limit, spec §1.1). Bring B back online. Expected, within a heartbeat after
   sync: B says it no longer holds the model, the save state reads **FILE
   CHANGED ON DISK** or a possible conflict copy `Landscape-<B's machine>.json`
   is listed, on both machines (criteria 5, 12, 13). Neither element is lost:
   one is in `Landscape.json`, the other in the conflict copy.
8. **Overwrite.** With A editing, change `Landscape.json` from B's side outside
   the app (or via a second profile that saves anyway). **A:** within a minute,
   the blocking notice "Landscape.json changed on disk" appears and the save
   state reads **FILE CHANGED ON DISK** (criterion 13). **SAVE FILE** →
   "The file changed on disk" → **Overwrite anyway…** → **Overwrite**. Expected:
   two confirmations, then saved, and a line `"action":"overwrite"` in A's log
   (criteria 6, 8).
9. **Save as copy.** Repeat step 8 but choose **Save as copy**. Expected: a file
   `Landscape (copy A <date> <time>).json` in the folder, opened in place of
   the model; `Landscape.json` unchanged (criterion 7). Use a display name with
   `/` or `:` once: the file name has `_` instead.
10. **Close.** **A:** **Close** in the strip above the model. Expected: the lock
    file disappears from the folder, on B too after sync (criterion 11).
11. In Firefox or Safari: the Import dialog says shared folders need a Chromium
    browser, and there is no folder button (criterion 16).

## Record

- [ ] Sync delays seen (seconds between a save on one machine and the reload on
      the other): ____
- [ ] Any conflict copy whose name the app did **not** list: ____
- [ ] Anything the strip or a notice said that was not true at the time: ____
