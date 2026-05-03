# ADR-001: YAML Analysis Files as Source of Truth

**Date:** 2026-03-16
**Status:** Accepted

## Context

The EA knowledge base contains 36 analyses (1,062 elements) mapping TOGAF to agentic organisations. This content drives a website. Where does the source of truth live?

## Options Considered

1. **YAML files** — Structured analysis in `Documentation/analysis/*.yaml`. Export to JSON for website. YAML is human-readable, diffable, version-controlled.
2. **JSON data files directly** — Edit the website data files. Simpler pipeline but JSON is harder to read/edit and mixes content with presentation concerns.
3. **CMS/database** — Store content in a headless CMS. Rich editing but adds infrastructure and vendor dependency.

## Decision

**YAML files.** They are structured enough for automated export, readable enough for human editing, and diffable in git. The pipeline is: YAML → export script → JSON → browser renders HTML.

## Consequences

- Content is version-controlled and diffable
- Structured format enables automated analysis (counts, coverage stats)
- JSON files are derived artifacts — never hand-edited
- Export step required after content changes
- YAML schema must be maintained consistently across 36 files
