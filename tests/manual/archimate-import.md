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
2. Choose the `.archimate` file — expected: the dialog closes with nothing to report (the
   model's purpose is kept as its documentation since #95), and the nav reads **39 elements ·
   48 relations**.
3. In the model tree, open **Application → Claims applications → Legacy → Host-based** —
   expected: **Policy Host** is there, as in Archi's model tree.
4. Open **Views → Landscapes → Claims landscape** — expected: the diagram looks like it does
   in Archi: the same boxes in the same places, processes nested inside **Handle Claim**,
   the Claims Engine in its blue fill and bold font.
5. Compare one bent connection (Payment Calculation → Payment Service) with Archi — expected:
   it bends at the same corners.
6. Import `src/io/fixtures/archi-images.archimate`, or your own Archi model with images in
   it — expected: it opens, and the report names each shape and specialization that showed
   an image, and the images the archive holds, since images are not carried yet.
7. Now the way back. Import the fixture again (step 2), click **Export** and save the XML.
   In Archi, choose **File → Import → Open Exchange XML Model…** and pick it — expected: the
   same 39 elements, 48 relationships and views as the original, in the same folders, and
   **Claims landscape** looks as it did in step 4. Text alignment and a shape's line width
   may differ: Archi's exchange import does not read them (see `src/io/README.md`). Skip this
   step if Archi is not installed, and note it as skipped.

## Acceptance

- [ ] Element, relationship and view counts match Archi's model tree
- [ ] Folders appear where Archi files them
- [ ] Diagrams match Archi: positions, nesting, colours, bends
- [ ] Anything not imported is named in the report, not silently missing
- [ ] The exported XML opens in Archi with the same counts, folders and diagrams (or skipped)
- [ ] Judgement: the report reads as information, not as an alarm

## Notes for the tester

- A connection between a shape and one nested inside it is hidden, as Archi hides it (#96).
  If you see one drawn, file it. Archi's own export leaves those connections out, so a model
  that went through Archi's exchange export can hold one connection fewer on a view than
  the `.archimate` file.
- Sketch and canvas views are not imported, and the report says so.
