---
adr: '0007'
title: A model holds one language, chosen by the texts it keeps
date: 2026-10-05
status: Accepted
scope: project
tags: [exchange-format, import, i18n, interop]
---

# ADR 0007 — A model holds one language, chosen by the texts it keeps

## Context

Every text in the exchange format (name, documentation, label, property value) is a `LangString` with an `xml:lang`. Archipelago holds one text per field. Before #111 the reader ignored the tag and the writer labelled every text `en`, so a model authored in German came back out claiming English, without a word. Archi labels every text of an export with the one language its export wizard is given (`--xmlexchange.exportLang`). Its German export of a fixture is byte-identical to the English one apart from the tags.

## Decision

- **One optional `Workspace.language`**, an `xs:language` tag. Absent means `en`, in any case, so English workspaces keep their bytes (ADR 0004). The exchange writer labels every text with it.
- **The texts the model keeps decide it, by majority.** A text dropped and reported, a skipped duplicate, an empty text, a model-level property, and a fixed folder's label (Archipelago writes its own) do not vote. A property definition's name votes once a kept property uses it.
- **Tags compare ignoring case, as BCP 47 does**, and the spelling most texts use is kept. An untagged text votes for `en`, which is how it was always written. A tie goes to the tag that sorts first by code unit, so the result does not depend on file order.
- **A majority tag the schema does not allow is never held.** The model stays `en` rather than letting a minority decide.
- **Every text an export will label differently is reported** on import (`exchange.language-relabelled`). Untagged texts are included only when the model is not `en`.

## Alternatives considered

- **Report only (option 1 in #111)**: cheaper, but it would fire on every German file and still write `en`.
- **Per-field language (option 3)**: the format allows it, but the model would need a language on every text. That is overkill until multilingual models are a goal. A second language on a field stays reported as unread (#101).
- **The first tag in the file**: order-dependent, and a single stray text decides.

## Consequences

- `language` is a new optional field in canonical JSON and the published schema. The schema version is unchanged, as it was for `propertyTypes`, so an older build drops the field without saying so.
- No UI shows or sets the language yet.
- Known residue: a definition name counts if any kept property used it, even when that property's object was later skipped as a duplicate.

## References

Issue #111; PR #114 and its review; `src/io/consumption.ts` (`Ledger.text`, `forget`, `skip`); `src/io/exchange-format.ts` (`modelLanguage`).
