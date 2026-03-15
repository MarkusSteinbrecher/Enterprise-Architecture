# /import-research

Import the latest research findings from the Research Agent project into this project.

## Arguments

$ARGUMENTS — Optional topic slug (default: "EA for AI"). Use "all" to import all completed topics.

## Source Project

The Research Agent project lives at: `/Users/markus/Code/Research Agent/`

Its research output structure per topic is:
```
knowledge-base/topics/{Topic Name}/
├── _index.md              # Topic metadata (status, stats, dates)
├── synthesis.md           # Comprehensive narrative synthesis (the main output)
├── findings.yaml          # Structured findings with claims and evidence
├── extractions/
│   ├── conclusions.yaml       # Recommendations, angles, actionability
│   ├── claim-alignment.yaml   # Canonical claims, unique claims, contradictions
│   ├── critical-analysis.yaml # Per-claim critique and practical value
│   └── cross-source-analysis.md  # Narrative comparison across sources
└── sources/
    └── source-NNN.md      # Individual source summaries with metadata
```

## Process

1. **Check source project exists**:
   - Verify `/Users/markus/Code/Research Agent/knowledge-base/topics/` exists
   - If argument is "all", list all topic directories; otherwise use the specified topic

2. **For each topic to import**:
   - Read `_index.md` to get status, updated date, and stats
   - Only import topics at phase 2+ (has synthesis)
   - Compare `_index.md` updated date with any existing import in this project
   - If unchanged, report "already up to date" and skip

3. **Copy key files** to `local-docs/Research/{topic-slug}/`:
   - `_index.md` → `_index.md`
   - `synthesis.md` → `synthesis.md`
   - `findings.yaml` → `findings.yaml`
   - `extractions/conclusions.yaml` → `conclusions.yaml`
   - `extractions/claim-alignment.yaml` → `claim-alignment.yaml`
   - `extractions/cross-source-analysis.md` → `cross-source-analysis.md`

   Do NOT copy: raw/, sources/, discussion/, critical-analysis.yaml (too large, not needed here).

4. **Create a summary index** at `local-docs/Research/{topic-slug}/README.md`:
   ```markdown
   # Research Import: {Topic Title}

   Imported from Research Agent project on {today's date}.
   Source project last updated: {updated date from _index.md}

   ## Stats
   - Sources analyzed: {source_count}
   - Canonical claims: {canonical_claims}
   - Unique claims: {unique_claims}
   - Contradictions: {contradictions}

   ## Files
   | File | Description |
   |------|-------------|
   | synthesis.md | Comprehensive narrative synthesis with all findings |
   | findings.yaml | Structured findings with claim references |
   | conclusions.yaml | Prioritized recommendations and thought leadership angles |
   | claim-alignment.yaml | All canonical claims, unique claims, and contradictions |
   | cross-source-analysis.md | Narrative comparison across all sources |

   ## Key Findings
   {List finding titles from findings.yaml}
   ```

5. **Handle the legacy file**:
   - If `local-docs/Research/synthesis.md` exists as a loose file (from earlier manual copy), move it to `local-docs/Research/ea-for-ai/synthesis.md` to keep things organized

6. **Present results**:
   - Show what was imported or updated
   - Show key stats (sources, claims, findings count)
   - Show the finding titles as a quick summary
   - Note: "Research files are in local-docs/Research/ (git-ignored). Use these as reference material for documentation/ content."
