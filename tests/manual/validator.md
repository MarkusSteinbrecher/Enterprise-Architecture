# Validator: Archi's checks and the problems list

> Verifies that the validator runs when asked, lists what it finds by severity and by
> check, opens each finding's subject, says when its list is out of date, and remembers
> which checks are switched off. **6 minutes.**

## Preconditions

- [ ] Build under test: `<commit SHA or Pages deployment>`
- [ ] Test environment: `<local | preview | github-pages>` (see [README](README.md))
- [ ] The claims platform model, `src/io/fixtures/claims-platform.xml`

## Steps

1. Import the model (**Import a file**), then click **+ Element** in the inventory and
   create an element named "Claim form" — expected: its fact sheet opens.
2. Click **Validator** in the left nav — expected: "Not validated yet", and a list of eight
   rules on the right, all ticked.
3. Press **Validate** — expected: a line under the title reading
   `0 errors · 9 warnings · 1 advice`; under **Warnings**, an "Unused element" group with
   one finding and an "Unused relation" group with nine; under **Advice**, "Empty view"
   with one. Each group says **Archi**.
4. Click the "Claim form" finding — expected: its fact sheet opens.
5. Press **Delete…**, then **Delete from model** — expected: the sheet says "Claim form" is
   deleted, and that line is focused (a keyboard user's next Tab starts there).
6. Click **Validator** — expected: the last list is still there, with a notice that the
   model has changed since this run. The "Claim form" finding is no longer a link and says
   it is no longer in the model.
7. Press **Validate** — expected: the notice goes, the "Unused element" group is gone, and
   the line reads `0 errors · 9 warnings · 1 advice`.
8. Click the finding for the Composition from "Kubernetes Cluster" to "PostgreSQL" —
   expected: no view draws it, so the fact sheet of **Kubernetes Cluster** opens. Go back.
9. Click the "Target state (to do)" finding — expected: that view opens, empty. Go back.
10. Untick **Unused relations** — expected: the list stays as it was, with a notice that
    the checks have changed. Press **Validate** — expected: the "Unused relation" group is
    gone.
11. Reload the page and open **Validator** — expected: **Unused relations** is still
    unticked. Tick it again.
12. Press ⌘K (Ctrl+K), type "Validate model" and press Enter — expected: the validator
    opens with a fresh list.
13. _Judgement:_ do the findings read as advice rather than alarm, and is it clear which
    are Archi's checks and which are Archipelago's own?
