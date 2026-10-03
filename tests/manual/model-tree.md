# Model tree: folders, moving, selection

> Verifies that an Archi model's folders show in the model tree, that things can be filed
> by drag and drop and from the keyboard, and that the tree follows what the screen beside
> it shows. **8 minutes.**

## Preconditions

- [ ] Build under test: `<commit SHA or Pages deployment>`
- [ ] Test environment: `<local | preview | github-pages>` (see [README](README.md))
- [ ] An Archi model with folders and views, e.g. `src/io/fixtures/claims-platform.xml`

## Steps

1. Import the model (**Import a file**) — expected: the model tree sits between the left
   nav and the inventory, listing nine groups from **Strategy** to **Views**.
2. Open **Application → Claims applications → Legacy → Host-based** — expected: **Policy
   Host** appears, indented one step per level.
3. Drag **Policy Host** onto **Claims applications** — expected: a dashed outline marks
   the folder while you hover, and after the drop Policy Host sits directly in Claims
   applications.
4. Drag it onto **Business** — expected: no outline appears and nothing moves (an
   application cannot be filed under Business).
5. Click **Application**, then **+ Folder** — expected: a folder named "New folder" appears
   with its name selected. Type a name and press Enter.
6. With the new folder active, press **F2**, change the name, press Enter — expected:
   renamed. Press **Delete** — expected: it is gone; anything inside it moved up a level.
7. Click inside the tree and use only the keyboard: ↑/↓ move, → opens a folder and then
   steps into it, ← closes it or goes to its parent, Home/End jump to the first and last
   row, Enter opens. Typing a letter jumps to the next row starting with it — and must not
   switch screens (the app's `g` and `i` shortcuts stay out of the tree).
8. Select an element row, press ⌘X (Ctrl+X), move to a folder of the same group, press ⌘V
   (Ctrl+V) — expected: the element moves there. Press ⌘Z (Ctrl+Z) — expected: it is back
   where it was; ⇧⌘Z (Ctrl+Shift+Z) moves it again. The header's **Undo** tooltip names
   the move.
9. Open **Views → Landscapes → Claims landscape**, then click **Claims Engine** in the tree —
   expected: it is selected on the canvas, the view stays open.
10. Click another shape on the canvas — expected: the tree opens to that element and
    highlights it.
11. Type in **Filter tree…** — expected: only matches remain, inside their folders; Escape
    brings the whole tree back.
12. Click **Model tree** in the left nav — expected: the panel hides; reload, and it stays
    hidden until you click it again.

## Acceptance

- [ ] The folder structure matches the one in Archi
- [ ] Moves are refused across groups and into a folder's own subfolders
- [ ] The keyboard alone can reach, open and move everything
- [ ] The tree's highlight always matches the fact sheet or canvas beside it
- [ ] Judgement: the panel reads as part of the app — hairlines, square boxes, mono codes

## Notes for the tester

- Every move and folder edit is undoable with ⌘Z and the header's **Undo**.
