# Import and export

Interop is the differentiator (concept §3.3): ArchiMate-native round-tripping and
git-friendly files are what LeanIX does not give you. Concept reference: §5.3.

| File | What it owns |
|---|---|
| `canonical-json.ts` | the native format — deterministic, diffable |
| `exchange-format.ts` | Open Group ArchiMate Model Exchange Format, in and out |
| `profile-properties.ts` | how the portfolio profile survives an exchange round trip |
| `json-schema.ts` | the published schema, built from the metamodel |
| `demo.ts`, `demo/archisurance.xml` | the bundled demo workspace |
| `fixtures/junction-flow.xml` | a junction chain as a certified tool writes it |
| `problems.ts` | structured import problems |

## Canonical JSON

The point is git. Two exports of the same model must be byte-identical, and a
one-field edit must produce a one-line diff. So keys are sorted at every depth,
arrays are sorted by id rather than by insertion order (Map iteration order is an
implementation detail), absent and empty values are omitted rather than written
as `null`, and the file ends with a newline.

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

**Not read yet:** the format's `views` (diagrams) and `organizations` (folders).
Both are reported as skipped rather than dropped silently — Archipelago generates
its views from the model, and diagram support is phase 3. A *diagram* is not one
of our `ViewDefinition`s: ours are saved report definitions, and those do survive
(see "What the format has no home for" below).

### Where the two shapes disagree

Four places where the schema and the model do not line up. Each was losing data
until #36; each is now a mapping with a test.

**Junctions.** The catalogue follows the specification, which has one `Junction`;
the schema has two concrete types, `AndJunction` and `OrJunction`. So the flavour
travels beside the type as `Element.junctionKind` (absent means `and`, which is
what an unqualified junction is) and the reader and writer map between the two.
Before this, importing a file with a junction dropped the junction **and every
relationship touching it**, so whole flow chains vanished, and exporting one
produced XML that failed validation. Absent is the *only* spelling of `and` that
gets written: reading `AndJunction` back as an explicit `and` made two files
holding one model differ byte for byte, which is what ADR 0004 exists to stop.

**Identifiers.** `xs:ID` values are XML names: no leading digit, no punctuation
beyond `_.-`. Ids we generate always qualify (`el-<uuid>`), but the native reader
accepts anything, so an id that arrived in a JSON file need not — and writing one
unchanged produced a file no ArchiMate tool would read. The writer rewrites what
it must, applies the same mapping to `source`/`target`, and reports each rewrite;
a relationship whose endpoint is not in the model is left out rather than written
as an unresolvable reference. `fromCanonicalJson` warns at import time, so the
surprise lands when the file is read rather than when it is exported.

**Property types.** The schema types a property *definition*, not each value, so
`"pii": true` and `"capacity": 42` came back as the strings `"true"` and `"42"` —
enough to break a filter and to make the next canonical-JSON export differ from
the last. Definitions are now typed from the values the model actually holds. A
key used inconsistently (a number here, a word there) falls back to `string` and
says so, because the format allows one type per key.

Two halves of that were still lossy until the #37 review. A `number` value is
only read as one when its *text* survives the trip: `Number` is not reversible,
so `0912345678`, `1.50` and a twenty-digit account number all came back spelled
differently and the next export wrote the new spelling. And the schema's
`currency`, `date` and `time` have no counterpart in `PropertyValue` — their
values are text here — so `typeof value` could only ever say `string` and a
re-export declared them as `string`. The declaration is now kept on
`Workspace.propertyTypes` and written back; the value decides whenever it can say
more than "string".

**Empty strings.** `<value xml:lang="en"></value>` parses to its attributes
alone. That is the empty string, not "no value"; reading it as absent dropped the
property and made the second export differ from the first.

### What the format has no home for

Saved views and tag groups are not ArchiMate concepts, so the schema has nowhere
to put them — and dropping them meant an Archipelago → XML → Archipelago trip
destroyed every saved view and every custom tag colour in silence. They now
travel as two namespaced model properties (`archipelago.views`,
`archipelago.tagGroups`) holding canonical JSON. Tag groups identical to the
shipped default are left out and restored on the way back, so an ordinary file
carries neither. Model-level properties that are *not* ours are reported as
skipped: there is nowhere in a `Workspace` to keep them.

`exportExchange` returns the XML **and** the problems; `exportExchangeXml` is the
XML alone, for callers that have no way to show them. Prefer the former — a
caller that ignores the problems is back to losing data quietly.

## The portfolio profile in a portable file

Profiles serialise as namespaced ArchiMate properties (`archipelago.lifecycle.plan`,
`archipelago.timeClassification`, …). A tool that has never heard of Archipelago
sees a few extra key/value pairs and round-trips them untouched; we read them back
into typed fields. `accessType` is the exception — it is a native attribute of the
Access relationship, so it is written as one.

Two details that are easy to get wrong. Keys are stripped on import from an
**allowlist** of the keys this module reads, not by namespace prefix: a key a
newer build wrote (or an architect borrowed the prefix for) has to survive as an
ordinary property rather than being deleted. That allowlist was only half the
job — a key this build *does* know but whose value it cannot read
(`archipelago.timeClassification: "Banana"`) was stripped by one function and
rejected by the other, and nothing reconciled them, so it vanished with
`problems: []`. `readPortfolioProfile` now hands back what it could not read and
`stripProfileKeys` keeps exactly those: what became a field is what leaves.

And tags travel as a comma-separated list — readable in any tool's property sheet
— unless a tag contains a comma or padding, in which case the whole list is
written as a JSON array. The two forms have to be told apart *exactly*: testing
the first character for `[` is a guess, and it was wrong for a tag spelled like
the escaped form (`["a"]` came back as the single tag `a`; `[]` took
`profile.tags` with it). One function, `asTagArray`, decides — and the writer
refuses the comma form for anything the reader would take as JSON.

## Import problems are data, not exceptions

A real model file is usually *mostly* right: an unknown element type, a
relationship pointing at something that was deleted, a diagram we do not read yet.
Refusing a 4,000-element file over any of those would be useless. An import
returns what it could build plus a structured list of what it could not, and the
UI shows both.

## The demo workspace

`demo/archisurance.xml` ships as exchange-format XML rather than as a JavaScript
object on purpose: "Explore the demo" runs the same import path a user's own file
runs, so the code that gets exercised most is the code that must not break.

**Provenance.** It is an insurance landscape *in the spirit of* The Open Group's
ArchiSurance case study — 29 elements and 47 relationships authored for this
project, carried over from the design prototype. The Open Group's own ArchiSurance
model is copyrighted and the widely-mirrored copies are GPL-3.0; neither can be
bundled in an MIT repository. Lifecycle dates and portfolio assessments are
illustrative — they exist so the reports have colour, and they describe no real
organisation.
