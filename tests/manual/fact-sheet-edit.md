# Fact sheet: editing an element

> Verifies that an edit changes the sheet, is named in the history, moves the save-state
> counter by exactly one, and survives closing the tab. **6 minutes.**

## Preconditions

- [ ] Build under test: `<commit SHA or Pages deployment>`
- [ ] Test environment: `<local | preview | github-pages>`
- [ ] Empty browser profile, then **Explore the demo**
- [ ] Note the save-state indicator before you start — after loading the demo it reads
      **LOCAL · 1 UNSAVED**

## Steps

1. In the inventory, click the row **CRM System** — expected: its fact sheet opens, showing
   documentation, lifecycle, portfolio assessment, relations and properties on one screen.
2. Read the right rail — expected: a neighbourhood diagram, an "Appears in" section, and a
   History section saying _No changes to this element in this session._
3. Note the Functional fit — expected: **Unreasonable**, with two of four bars filled.
4. Click **Edit** — expected: the assessment values become dropdowns; the name, documentation
   and lifecycle dates become editable. The button now reads **Done**.
5. Set **Functional fit** to _Perfect_ — expected: the save-state indicator goes up by
   exactly one (to **LOCAL · 2 UNSAVED**), and the History rail gains one entry reading
   _Updated assessment of "CRM System"_. One edit, one line of history, one step on the counter.
6. Set **Technical fit** to _Fully adequate_ — expected: one more step on the counter, one
   more history entry.
7. Click **Done** — expected: the dropdowns become values again, showing _Perfect_ and
   _Fully adequate_ with their meters filled to four bars. The completeness ring may change;
   that is fine.
8. Reload the page — expected: the fact sheet comes back with both new values, and the
   save-state indicator reads **LOCAL · SAVED**. A restore is not an edit.
9. Go back to the inventory via the **INVENTORY** breadcrumb — expected: the row for CRM
   System shows the new fits in its Fit F / T column.
10. Type `crm` in the inventory's name filter, open CRM System, then use the **INVENTORY**
    breadcrumb again — expected: you land back on the filtered list, not the unfiltered one.

## Acceptance

- [ ] An edit is visible on the sheet immediately, without a save step
- [ ] Each edit moves the save-state counter by exactly one
- [ ] Each edit adds one history entry that names _what_ changed, not just "modified"
- [ ] Edits survive a reload, and the reload does not itself count as a change
- [ ] The inventory reflects the edit
- [ ] The breadcrumb returns to the inventory with the filters you arrived with

## Notes for the tester

- **Undo and redo do not exist in the UI yet** (issue #31). The model keeps a full undo
  stack, but nothing reaches it — no ⌘Z, no menu item. Do not file this; do report anything
  else that leaves you unable to reverse a change.
- The save-state counter means "changes not in your file". It counts _every_ change,
  including ones that put a value back where it was.
- The Relations, Assessment and Quality tabs at the top of the sheet are deliberately
  inert — everything lives on Overview for now.
