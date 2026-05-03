# ADR-003: Separate PoC Repo (agentic-ea) From Knowledge Base

**Date:** 2026-03-16
**Status:** Accepted

## Context

The EA project has two goals: a knowledge base website and a proof-of-concept demonstrating agentic EA. The PoC uses Neo4j, an MCP server, and agent personas — different tech from the static website.

## Options Considered

1. **Separate repos** — Knowledge base in `Enterprise Architecture/`, PoC in `agentic-ea/`. Different tech stacks, different concerns, linked by data export.
2. **Monorepo** — Both in one repo with subdirectories. Simpler git workflow but mixes static HTML with Python/Docker/Neo4j infrastructure.

## Decision

**Separate repos.** The knowledge base is a static site (HTML/CSS/JS). The PoC is a Python MCP server with Neo4j. Mixing them would complicate deployment and confuse the boundary between research output and technical demonstration. They integrate via JSON export (`parse_cypher_to_json.py` → `repository-explorer.json`).

## Consequences

- Clean separation of concerns and tech stacks
- Each repo can be deployed independently
- Integration point is explicit (JSON export script)
- Cross-repo references must be maintained manually
- PoC Neo4j data feeds website's Repository Explorer page
