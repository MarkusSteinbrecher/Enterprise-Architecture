/**
 * How many elements a view may hand to the browser at once.
 *
 * The brief cites 500–5,000 elements, and the acceptance criterion is that a
 * 5,000-element workspace scrolls and filters without jank. That is a property of
 * *the inventory*, not of the table: the threshold used to live in
 * `InventoryTable.tsx`, so `?view=cards` on the same workspace mounted 5,000
 * card buttons and froze the tab — the same criterion, failing outright in the
 * view nobody had instrumented.
 *
 * The two views meet it differently, and the difference is honest rather than
 * incidental. The table is the scanning surface, so it virtualises and shows
 * everything. Cards carry less signal per element by design and are "the right
 * shape when scanning a small filtered set rather than a landscape" (their own
 * docblock), so above the threshold they render the first `LIST_WINDOW` and say
 * so, the way the command palette reports its own hit cap rather than hiding it.
 */
export const LIST_WINDOW = 150
