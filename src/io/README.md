# Import and export

Interop is the differentiator (concept §3.3): ArchiMate-native round-tripping and
git-friendly files are what LeanIX does not give you. Concept reference: §5.3.

| File                                       | What it owns                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| `canonical-json.ts`                        | the native format — deterministic, diffable                               |
| `canonical-views.ts`                       | views and folders in the native format, and their repairs on read         |
| `exchange-format.ts`                       | Open Group ArchiMate Model Exchange Format, in and out                    |
| `profile-properties.ts`                    | how the portfolio profile survives an exchange round trip                 |
| `json-schema.ts`                           | the published schema, built from the metamodel                            |
| `demo.ts`, `demo/archisurance.xml`         | the bundled demo workspace                                                |
| `fixtures/junction-flow.xml`               | a junction chain as a certified tool writes it                            |
| `fixtures/workspace-v1.json`               | a schema-1 file, written by the schema-1 writer — the migration's input   |
| `exchange-views.ts`                        | diagrams and folders in the exchange format (#76)                         |
| `exchange-xml.ts`                          | XML escaping and reading helpers both exchange modules share              |
| `fixtures/claims-platform.archimate`       | an original Archi model (ours) with nesting, styles, bend-points, folders |
| `fixtures/claims-platform.xml`             | that model **as Archi 5.10 exported it** — the #76 import fixture         |
| `fixtures/unsupported-view-constructs.xml` | one of each view construct we cannot carry                                |
| `fixtures/archi-bendpoint-attachments.xml` | Archi's own MIT test file (attribution inside)                            |
| `archimate-native.ts`                      | Archi's own `.archimate` model file, read in (#13)                        |
| `default-sizes.ts`                         | the size Archi draws a shape at when the file does not say                |
| `fixtures/archi-coverage.{archimate,xml}`  | every `.archimate` edge case, and Archi 5.10's (XSD-invalid) export of it |
| `problems.ts`                              | structured import problems                                                |

## Canonical JSON

The point is git. Two exports of the same model must be byte-identical, and a
one-field edit must produce a one-line diff. So keys are sorted at every depth,
arrays are sorted by id rather than by insertion order (Map iteration order is an
implementation detail), absent and empty values are omitted rather than written
as `null`, and the file ends with a newline. Bend-points are the one array kept
in written order, because their order is the route.

Reading migrates. A file from an older schema is read at the current version,
with an `info` problem (`json.schema-upgraded`) saying the next save writes the
new format, so a schema-2 build reading it warns before dropping what it does
not know (#90). A schema-1 file's `views` were saved report definitions; they
arrive as `reports`. Stored IndexedDB snapshots are migrated by
`migrateWorkspace` on load.

The published schema is `design/archipelago-workspace.schema.json`, generated
from the element catalogue by `npm run schema`. A test fails if the checked-in
copy is stale, so the enumerations cannot drift from `src/model/`.

## Exchange format

Written by hand rather than through a serialiser library, because the schema pins
element order (`name`, `documentation`, `properties`) and identifier types
(`xs:ID` / `xs:IDREF`), and a generic object-to-XML mapper gives control over
neither. Reading uses `fast-xml-parser` with `removeNSPrefix`, so a file works
whichever namespace prefix its author happened to use.

`npm run validate:xsd` validates, with `xmllint`, every bundled file both as
checked in and as it comes back out of a round trip, plus a workspace whose ids
had to be rewritten and one carrying declared `currency`/`date`/`time` types. It
is a script rather than a CI step because it needs libxml2; the offline
structural rules are covered by `exchange-format.test.ts`.

The XSD is The Open Group's and is **not vendored** — the same licensing reason
their ArchiSurance model is not bundled either. It is fetched once and cached
under `node_modules/.cache/`, so only the first run of a fresh checkout needs the
network; `--refresh` re-fetches and `ARCHIMATE_XSD=<path>` uses your own copy.

`npm run validate:xsd` validates against `archimate3_Diagram.xsd`, which
includes the View and Model schemas; CI runs it in its own job.

### Diagrams and folders (#76)

`exchange-views.ts` reads and writes `<views><diagrams>` and `<organizations>`.
The mapping decisions:

- **Nodes.** `Element` → element node, `Container` → group, `Label` → note, or a
  view reference when it carries a `<viewRef>`. Connections are `Relationship`
  or `Line`. The format places nodes absolutely; we place them relative to their
  parent, so the boundary converts both ways. Bend-points are absolute on both
  sides.
- **What the format cannot hold is repaired on the way out, with a problem.** A
  view reaching above or left of the origin is shifted (`exchange.view-shifted`);
  fractional or zero sizes are rounded (`exchange.view-rounded`); a shape nested
  in a note or view reference — only element and group nodes may contain others
  — moves to the nearest real container at the same place
  (`exchange.nesting-flattened`); a node or connection id that clashes with
  another id in the file is renamed (`exchange.view-ids-renamed`).
- **Archi's defaults are not overrides.** Archi writes its whole computed style
  on every object — the type's fill, a grey outline, the platform font. A value
  equal to Archi's default for that kind of object is read as no override, so an
  imported view follows our theme except where someone actually chose a colour.
  The defaults were measured from Archi 5.10's own export of every element type.
  The platform font counts as the default only when most objects carry it.
- **What `<style>` cannot say travels in the view's `archipelago.style`
  property**: text alignment, text position, strikethrough, and a `literal` flag
  on every style we wrote. A literal style is read as written — otherwise an
  explicit override that happens to equal Archi's default (black text) would be
  dropped on our own round trip.
- **Folders.** Top-level items named like the fixed groups ("Business",
  "Technology & Physical", "Relations", "Views", …) are those groups. Every other
  item is a folder. Archi writes folder items without identifiers, so a folder's
  id comes from its label path (`folder-application-claims-applications-legacy`)
  — the same file always yields the same ids. We write `identifier` on folder
  items, so our own ids survive. A top-level item outside any group goes where
  most of its contents belong (`exchange.folder-group-inferred`).
- **Not carried, and said so:** connection attachment points
  (`exchange.connection-attachment-ignored`), connections ending on connections
  (`exchange.connection-on-connection`), labels bound to a concept
  (`exchange.label-binding-ignored`), node and view types other than the
  standard ones, and anything referring to what the file does not hold.
- **Malformed values are read as the native reader reads them, and said so**
  (`exchange.value-malformed`, #107), naming each attribute. A position that is
  not a number is read as 0, and a size as Archi's default; a node *missing* a
  position is still skipped (`exchange.node-no-bounds`). A bendpoint without two
  numbers is dropped, because exchange bendpoints are absolute and 0, 0 is the
  canvas origin. A colour component outside the schema's 0–255, or an opacity
  outside 0–100, is clamped and counted; a malformed opacity is read as opaque.
  A colour missing or garbling r, g or b, a line width that is not
  a positive integer, a font size that is not a number, and a font style token
  other than `plain`, `bold`, `italic` and `underline` are read as not set. Both
  readers count these with the one `measured()` in `exchange-xml.ts`.

Archi omits from its export a connection drawn between a shape and a shape
nested inside it — the nesting already shows the relationship — so an import
has what the file has, which can be one fewer than the Archi model.

Two parser details, both found here: numeric character references are decoded
(`htmlEntities`), so Archi's `&#xD;&#xA;` line breaks arrive as line breaks; and
the writer escapes CR (and LF and tab inside attributes), which every XML parser
would otherwise normalise away.

### Where the two shapes disagree

Five places where the schema and the model do not line up. Each was losing data
until it was found (#36, #84); each is now a mapping with a test.

**Junctions.** The catalogue follows the specification, which has one `Junction`;
the schema has two concrete types, `AndJunction` and `OrJunction`. So the flavour
travels beside the type as `Element.junctionKind` (absent means `and`, which is
what an unqualified junction is) and the reader and writer map between the two.
Before this, importing a file with a junction dropped the junction **and every
relationship touching it**, so whole flow chains vanished, and exporting one
produced XML that failed validation. Absent is the _only_ spelling of `and` that
gets written: reading `AndJunction` back as an explicit `and` made two files
holding one model differ byte for byte, which is what ADR 0004 exists to stop.

**Type-specific relationship attributes** (#84). The schema defines three
attributes on one relationship type each: `accessType` on Access, `isDirected`
on Association and `modifier` on Influence. The model carries the last two on
`Relationship` beside the type (`accessType` predates them and lives in the
profile). Absent `isDirected` means undirected, which is the schema default, so
`false`, `0` and absent are one model and only `isDirected="true"` is written.
`modifier` is any text — the schema's type is a union with `xs:string`, so `7`
is as valid as `++`. An attribute on the wrong type, or a value the schema
forbids, is an `ImportProblem` on the way in and on the way out; it is never
carried, because a model holding one exports a file the XSD rejects. The test
fixture `relationship-attributes.xml` was written by Archi itself.

**Identifiers.** `xs:ID` values are XML names: no leading digit, no punctuation
beyond `_.-`. Ids we generate always qualify (`el-<uuid>`), but the native reader
accepts anything, so an id that arrived in a JSON file need not — and writing one
unchanged produced a file no ArchiMate tool would read. The writer rewrites what
it must, applies the same mapping to `source`/`target`, and reports each rewrite;
a relationship whose endpoint is not in the model is left out rather than written
as an unresolvable reference. `fromCanonicalJson` warns at import time, so the
surprise lands when the file is read rather than when it is exported.

**Property types.** The schema types a property _definition_, not each value, so
`"pii": true` and `"capacity": 42` came back as the strings `"true"` and `"42"` —
enough to break a filter and to make the next canonical-JSON export differ from
the last. Definitions are now typed from the values the model actually holds. A
key used inconsistently (a number here, a word there) falls back to `string` and
says so, because the format allows one type per key.

Two halves of that were still lossy until the #37 review. A `number` value is
only read as one when its _text_ survives the trip: `Number` is not reversible,
so `0912345678`, `1.50` and a twenty-digit account number all came back spelled
differently and the next export wrote the new spelling. And the schema's
`currency`, `date` and `time` have no counterpart in `PropertyValue` — their
values are text here — so `typeof value` could only ever say `string` and a
re-export declared them as `string`. The declaration is now kept on
`Workspace.propertyTypes` and written back; the value decides whenever it can say
more than "string".

**Language.** Every text in the format carries an `xml:lang`, and Archi labels
all of them with the one language its export is given. The model holds one text
per field, so it holds one language: `Workspace.language` (absent is `en`), and
the writer labels every text with it. ADR 0007 has the rule. In short, the texts
the model keeps decide it by majority, with tags compared ignoring case and
untagged texts voting `en`. `Ledger.text` records each text it marks, and
`skip` and `forget` take back the ones the reader does not keep after all. A text
the next export labels differently is reported as `exchange.language-relabelled`
(#111, #114). Before, the reader ignored the tag and the writer wrote `en`, so a
German model came back out claiming to be English.

**Empty strings.** `<value xml:lang="en"></value>` parses to its attributes
alone. That is the empty string, not "no value"; reading it as absent dropped the
property and made the second export differ from the first.

### What the format has no home for

Saved reports and tag groups are not ArchiMate concepts, so the schema has nowhere
to put them — and dropping them meant an Archipelago → XML → Archipelago trip
destroyed every saved report and every custom tag colour in silence. They now
travel as two namespaced model properties (`archipelago.reports`,
`archipelago.tagGroups`) holding canonical JSON. Files written before schema 2
carry reports as `archipelago.views`, which is still read. Tag groups identical to the
shipped default are left out and restored on the way back, so an ordinary file
carries neither. Model-level properties that are _not_ ours are reported as
skipped: there is nowhere in a `Workspace` to keep them.

`exportExchange` returns the XML **and** the problems; `exportExchangeXml` is the
XML alone, for callers that have no way to show them. Prefer the former — a
caller that ignores the problems is back to losing data quietly.

## The portfolio profile in a portable file

Profiles serialise as namespaced ArchiMate properties (`archipelago.lifecycle.plan`,
`archipelago.timeClassification`, …). A tool that has never heard of Archipelago
sees a few extra key/value pairs and round-trips them untouched; we read them back
into typed fields. `accessType` is the exception — it is a native attribute of the
Access relationship, so it is written as one (see _Type-specific relationship
attributes_ above).

Two details that are easy to get wrong. Keys are stripped on import from an
**allowlist** of the keys this module reads, not by namespace prefix: a key a
newer build wrote (or an architect borrowed the prefix for) has to survive as an
ordinary property rather than being deleted. That allowlist was only half the
job — a key this build _does_ know but whose value it cannot read
(`archipelago.timeClassification: "Banana"`) was stripped by one function and
rejected by the other, and nothing reconciled them, so it vanished with
`problems: []`. `readPortfolioProfile` now hands back what it could not read and
`stripProfileKeys` keeps exactly those: what became a field is what leaves.

And tags travel as a comma-separated list — readable in any tool's property sheet
— unless a tag contains a comma or padding, in which case the whole list is
written as a JSON array. The two forms have to be told apart _exactly_: testing
the first character for `[` is a guess, and it was wrong for a tag spelled like
the escaped form (`["a"]` came back as the single tag `a`; `[]` took
`profile.tags` with it). One function, `asTagArray`, decides — and the writer
refuses the comma form for anything the reader would take as JSON.

## Import problems are data, not exceptions

A real model file is usually _mostly_ right: an unknown element type, a
relationship pointing at something that was deleted, a diagram we do not read yet.
Refusing a 4,000-element file over any of those would be useless. An import
returns what it could build plus a structured list of what it could not, and the
UI shows both.

### Readers account for what they consume (#101)

A reader ignores by omission: an attribute it never looks at leaves nothing for a
test to see. So both XML readers keep a `Ledger` (`consumption.ts`). Each
attribute and child element is marked where its value lands in the model or in a
problem, not where it is fetched, so a value that is read and then discarded is
still unread. A skipped object is marked whole, because it was reported as
skipped. After the read, `unread` walks the parsed file and every key left
unmarked becomes an `import.content-unread` warning, naming the object that
carries it. Keys a reader deliberately ignores (namespace declarations, Archi's
version, `targetConnections`) are listed in that reader's `IGNORED`, each with
its reason.

When a reader gains a field, it marks it. When a reader recognises something it
cannot hold, it reports it under its own code and marks it, or names it with
`ledger.lose`. `content-unread.test.ts` puts an unknown attribute and an unknown
child at each level of both formats, and requires every checked-in file to report
nothing unread.

## The demo workspace

`demo/archisurance.xml` ships as exchange-format XML rather than as a JavaScript
object on purpose: "Explore the demo" runs the same import path a user's own file
runs, so the code that gets exercised most is the code that must not break.

**Provenance.** It is an insurance landscape _in the spirit of_ The Open Group's
ArchiSurance case study — 29 elements and 47 relationships authored for this
project, carried over from the design prototype. The Open Group's own ArchiSurance
model is copyrighted and the widely-mirrored copies are GPL-3.0; neither can be
bundled in an MIT repository. Lifecycle dates and portfolio assessments are
illustrative — they exist so the reports have colour, and they describe no real
organisation.

## Archi's model file (#13)

`archimate-native.ts` reads a `.archimate` straight into the model rather than
through the exchange format. `readWorkspaceFile` chooses it by the root's Archi
namespace, not the extension. Both formats call their root `model`, so
`xml-root.ts` resolves the root element's own prefix to its namespace; a
mention of the URI in a comment or in documentation does not count. Each reader
also refuses the other's file rather than reading it as an empty model (#99):
the native reader anything outside Archi's namespaces (`archimate.wrong-namespace`),
the exchange reader only Archi's (`exchange.wrong-namespace`). An exchange file
with no namespace, or a near miss, is read with an info note
(`exchange.namespace-unexpected`). Archi's namespaces are its own and the
`http://www.bolton.ac.uk/archimate` of Archi 1 and 2, which Archi still opens. A
file that parses but whose root the scan cannot find is refused by both
(`*.root-unreadable`): the guard fails closed (#103). An older Archi's names are
read as Archi 5.10 reads them, by Archi's own rename table
(`ConverterExtendedMetadata.TYPE_MAP`, copied into `LEGACY_TYPES`): the
ArchiMate 2.x types, the British spellings, `DiagramModel`, the two junction
classes and `BusinessActivity`. A connection's old `relationship` attribute reads
as `archimateRelationship`, and with both present the later one wins, as in Archi.
Archi applies the table whatever the namespace, and so does this reader. What was
converted is reported once (`archimate.legacy-names-converted`), counting only
what was kept. The one deliberate difference: an `OrJunction` stays an
or-junction, where Archi 5.10 maps the class and opens it as an and-junction
(`archimate.legacy-or-junction`, #105).

Archi 5.10 also runs **compatibility handlers** on every model it opens, keyed on
the model's `version` attribute and not on its namespace, and this reader applies
them by the same rules (`archi-compatibility.ts`, #118). Below 3.0.0, a shape
with either side unset takes Archi's legacy default (120 × 55 for every element
but a junction, a Grouping too), and a group or element shape grows to hold its
children. Unset there is Archi's `-1` alone: a 0 or another negative is kept, as
Archi keeps it.
Below 4.0.0, the top-level folders named Connectors and Derived Relations are
emptied into Other and Relations, and a Location, Meaning or Value in a Business
subfolder moves to the top of its own group. Below 4.0.0 Archi also saves such a
moved subfolder as an `archimate:Folder` *element*, and it reads it back as a
folder, so this reader does too, whatever the version. Below 4.4.0, a group's or
Grouping's centred label (absent or written) is aligned left. At exactly 4.0.1
or 4.4.0, every shape's outline opacity becomes its fill opacity. Below 5.0.0,
thirteen element types swap their figure between 0 and 1, in the first diagrams
folder only, the one Archi walks. Figures are not drawn,
so this only decides whether one is reported as undrawn. The version is compared
as Archi compares it (`StringUtils.versionNumberAsInt`). **A missing version is
EMF's default, `""`, which counts as older than every threshold**, so Archi
applies every handler to a file without one, and so does this reader. What
changed is reported once (`archimate.archi-compatibility`), counting only what was
kept: a duplicate is skipped before it is read. The evidence is
Archi's own: one model saved by Archi 5.10 under each version around each
threshold (`fixtures/archi-compatibility/`), plus Open Day, and
`archi-compatibility.test.ts` requires the older file to read as Archi's save
does. A top-level folder that is none of the fixed groups is placed under Other
(`archimate.folder-type-unknown`). The warning says which kind it is: an
ordinary folder, an older Archi's `connectors` or `derived`, or a type Archi
5.10 does not define.

Archi's file is closer to the model than its
export is, and the export loses things, so the readers deliberately disagree in
a few places. `archimate-native.test.ts` reads each checked-in pair (one model
saved by Archi, and exported by Archi) and allows only these differences:

- **Archi's export loses things the native file has**: text alignment and
  position, a shape's line width, a line's name, folder ids (the export has
  none, so the exchange reader makes them up), and a connection between a shape
  and one nested in it (Archi hides it on screen and leaves it out of the export).
- **Default sizes.** A shape left at its default size is stored as `-1 × -1`.
  Archi's export writes that through as `w="-1"`, which fails its own XSD. Both
  readers resolve it from `default-sizes.ts` (`archimate.default-size`,
  `exchange.default-size`). Archi computes the export's bendpoints from the
  `-1`; the native reader computes them from the size Archi draws.
- **Alpha.** Archi stores opacity as 0–255 and the exchange format as a whole
  percent, so a native alpha moves by up to 1/255 on an exchange round trip.

Bendpoints are stored relative to both ends: the i-th of n is drawn at the
weighted mean of its source- and target-relative points, weight (i + 1)/(n + 1),
from integer centres, floored. That is GEF's `RelativeBendpoint`, and the
`v-rounding` view checks it against Archi's export at odd sizes.

Archi codes are mapped: access `0`–`3` (absent is `0`, Write), text alignment
`1`/`2`/`4`, text position `0`/`1`/`2`, viewpoint ids to the exchange names
(taken from Archi's export of all 24), and an SWT font string to name, size and
bold/italic. A specialization becomes the `Specialization` property, as Archi's
export does. **Absent means Archi's default**, because EMF writes no attribute
at it: an absent text alignment is centre (`TEXT_ALIGNMENT_EDEFAULT = 2`), so a
note, a group or a Grouping, which Archipelago draws left-aligned by default, is
given `center` explicitly (#100). A fixture attribute at Archi's default is a
sign of a hand edit, which is why `export-with-archi.sh` re-saves each model.

Re-saving the fixtures with Archi 5.10 (#100) showed three more things only
Archi's own serializer does, each of which the reader had got wrong:

- **A plain line has no `xsi:type`.** EMF omits it when it is the reference's
  declared type, `DiagramModelConnection`; read as untyped, every line in a real
  file was skipped.
- **A bendpoint at 0, 0 is `<bendpoint/>`.** Zero offsets are defaults too, and an
  element with nothing in it parses as `''`, which `list` dropped. `entries`
  keeps it.
- **Newer display settings are `<feature name value>` children, not attributes**
  (`IDiagramModelObject.FEATURE_*`): `lineAlpha` is read from its feature, and
  `gradient`, `iconColor`, `lineStyle` and the like are reported as display
  settings. A `lineAlpha` _attribute_ is not Archi's and is reported, not read.

Both readers keep names, keys, values and documentation **exactly as written**
(`trimValues: false`). Trimming changed them in silence and could merge two
property keys into one (#100).

Each of these is reported, never silently dropped: sketches and canvases,
images, a relationship that ends on a relationship, a connection that ends on a
connection, display settings without a counterpart (gradient, an alpha with no
colour to apply it to, …), connection routers, folder properties, a top-level
folder's documentation, relationship documentation (naming the imported
relationships that had it), and the model's purpose. So are, since #100: a
property key repeated on one object (the first value is kept, in both readers),
a specialization the file does not define or that the object's own
`Specialization` property shadows, a view without an id, a value Archi would not
write (`x="1e"`, a colour that is not `#rrggbb`), anything a shape or a line
carries that it has no place for here (properties, a line's documentation, a
label expression), and, in both readers, a connection whose shapes do not
draw its relationship's two ends (`*.connection-mismatch`, skipped rather than
left for `validate` to find). Anything else the file holds that the reader did not
read is `import.content-unread` (#101), including model `<metadata>` and a
specialization no imported concept uses. An Archi model saved with images is a zip archive, which is refused
with an explanation (`archimate.archive-unsupported`). Any other zip, such as a
`.docx`, is named as an archive, not as an Archi model (`file.archive-unrecognised`).

## Archi as the oracle for edited views (#127)

ADR 0008 makes Archi 5.10 the test of the editor: a view edited in Archipelago
and saved must open in Archi as it was drawn. `src/io/archi-roundtrip.test.ts`
holds that for one edited view, and every editor slice extends it.

- `src/test/edited-claims.ts` edits the claims landscape through the store,
  one command per edit: move, resize, re-parent both ways, bend-points added,
  moved and removed, appearance, a removed note, and a new element, relationship
  and note.
- `scripts/fixtures/build-edited-claims.ts` writes it with the exchange writer
  to `fixtures/claims-edited.xml`. A test fails when the writer's output has
  moved on from the checked-in file.
- `scripts/fixtures/archi-roundtrip.sh` has Archi import that file, save the
  model (`claims-edited.archi.archimate`) and export it again
  (`claims-edited.archi.xml`). Archi's command line exits 0 when an import
  fails, so the script checks that the files exist.
- `src/test/view-oracle.ts` compares the two, drawing by drawing: absolute
  bounds, parent, what is drawn, source and target, bend-points and every
  appearance field. Drawings are matched by id, because Archi's exchange import
  keeps every `identifier`. A drawing Archi made up has an id of its own and is
  reported as `extra`.

To re-run after an editor or writer change:

```sh
npx vite-node scripts/fixtures/build-edited-claims.ts
scripts/fixtures/archi-roundtrip.sh src/io/fixtures/claims-edited.xml \
  src/io/fixtures/claims-edited.archi.archimate src/io/fixtures/claims-edited.archi.xml
```

`export-with-archi.sh` runs both, after re-saving the claims model they start
from.

**What Archi changes, and why.** The test requires every difference to have one
of five reasons, each read from Archi 5.10's `XMLModelImporter` with `javap`,
and it pins which drawing has which reason:

| Difference | Reason |
|---|---|
| Text alignment, text position, strikethrough | The format has no attribute for them. `archipelago.style` carries them, and Archi keeps that property without drawing it. So the oracle removes the property before reading Archi's save. |
| A shape's line width is gone | `addNodeStyle` reads fill, line colour and font only. `addConnectionStyle` does read `lineWidth`, so a connection's must survive. |
| A font with no name comes back named | `addFont` starts from the user's default view font (`FontFactory.getDefaultUserViewFontData`). |
| An alpha one byte off | The format holds a percent, and Archi reads it as `round(a × 255 / 100)`. |
| Connections Archi added | `addNestedConnections` draws every relationship between a shape and the element shape it sits in. Archi hides them when drawing (#96). Its exporter leaves them out again (`XMLModelExporter.isNestedConnection`), and it also leaves out one we drew on purpose between nested shapes. |
