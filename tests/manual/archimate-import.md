# Archi model import

> Verifies that a model saved by Archi opens with its folders and diagrams, and that the
> import report says what did not come across. **5 minutes.**

## Preconditions

- [ ] Build under test: `<commit SHA or Pages deployment>`
- [ ] Test environment: `<local | preview | github-pages>` (see [README](README.md))
- [ ] An Archi model file, e.g. `src/io/fixtures/claims-platform.archimate`, or one of your
      own saved by Archi 4.x or 5.x
- [ ] Empty browser profile, then **Start empty**

## Steps

1. Click **Import** — expected: the dialog says it takes an Archi model (.archimate), exchange
   XML or canonical JSON.
2. Choose the `.archimate` file — expected: the report reads **39 elements · 48
   relationships** for the fixture, and lists one info line saying the purpose text was not
   imported. Click **Done**.
3. In the model tree, open **Application → Claims applications → Legacy → Host-based** —
   expected: **Policy Host** is there, as in Archi's model tree.
4. Open **Views → Landscapes → Claims landscape** — expected: the diagram looks like it does
   in Archi: the same boxes in the same places, processes nested inside **Handle Claim**,
   the Claims Engine in its blue fill and bold font.
5. Compare one bent connection (Payment Calculation → Payment Service) with Archi — expected:
   it bends at the same corners.
6. Open your own Archi model, if you have one with images in it — expected: a clear message
   that models saved with images cannot be opened yet, and what to do instead.

## Acceptance

- [ ] Element, relationship and view counts match Archi's model tree
- [ ] Folders appear where Archi files them
- [ ] Diagrams match Archi: positions, nesting, colours, bends
- [ ] Anything not imported is named in the report, not silently missing
- [ ] Judgement: the report reads as information, not as an alarm

## Notes for the tester

- A connection between a shape and one nested inside it is drawn; Archi hides those. Do not
  file it: it is tracked separately.
- Sketch and canvas views are not imported, and the report says so.
