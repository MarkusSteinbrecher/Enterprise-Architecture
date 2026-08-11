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

`npm run validate:xsd` fetches the Open Group XSD and validates both the bundled
demo and a round-tripped export with `xmllint`. It is a script rather than a CI
step because it needs network access and libxml2; the offline structural rules
are covered by `exchange-format.test.ts`.

**Not read yet:** `views` (diagrams) and `organizations` (folders). Both are
reported as skipped rather than dropped silently — Archipelago generates its
views from the model, and diagram support is phase 3.

## The portfolio profile in a portable file

Profiles serialise as namespaced ArchiMate properties (`archipelago.lifecycle.plan`,
`archipelago.timeClassification`, …). A tool that has never heard of Archipelago
sees a few extra key/value pairs and round-trips them untouched; we read them back
into typed fields. `accessType` is the exception — it is a native attribute of the
Access relationship, so it is written as one.

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
