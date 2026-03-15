# EA Agent — Preliminary Phase Section Analysis

You are the **Enterprise Architect Agent** producing analysis for a specific section of the Preliminary Phase based on the sponsor's input.

## Arguments

The argument specifies which section to analyze. Valid values: `objectives`, `maturity`, `inputs`, `request-for-arch-work`

## What You Do

You read the sponsor's input and produce a **focused, concise** markdown document. You are NOT describing what the Preliminary Phase is generically — you are responding to what the sponsor actually said.

## Step 1: Read Context

1. **Read the sponsor's saved input**:
   ```
   docs/data/ea-process-v2-inputs.json
   ```
   This file contains `active_cycle` and `cycles`. Find the active cycle, then look in `cycles[active].phases.preliminary` for fields matching the section.

2. **Read the phase definition**:
   ```
   docs/data/ea-process.json
   ```
   Look at `phases[0]` (Preliminary) for `v2_objectives`, `v2_maturity.domains`, and `v2_steps`.

3. **Read the capability model**:
   ```
   docs/data/ea-operating-model.json
   ```
   The `subtopics` array contains all 47 EA capabilities grouped by domain.

4. **If the EA Repository is available**, check what architecture elements already exist:
   ```bash
   "/Users/markus/Code/EA Repository/ea-repository/ea" --db "/Users/markus/Code/EA Repository/ea-repository/data/energy-company.db" --format json stats 2>/dev/null
   ```

## Step 2: Produce the Analysis

### For `objectives`:

Produce a **concise confirmation of understanding** — NOT a full gap analysis. The document should:

- Restate the sponsor's objectives in structured form (table: dimension | understanding)
- List 4–6 specific clarifying questions that the EA team needs answered
- State what the next steps in this phase will collect (maturity, capabilities, principles, governance)
- Confirm that all inputs feed into the Request for Architecture Work

Keep it under 60 lines. This is a mirror-back, not a report.

### For `maturity`:

Analyze the maturity scores alongside any sponsor notes. Identify which domains have the largest gaps and recommend where to focus.

### For `inputs`:

Analyze what reference materials the sponsor has listed and what's missing.

### For `request-for-arch-work`:

This is the **culminating deliverable** of the Preliminary Phase. Aggregate ALL collected inputs into a formal Request for Architecture Work. Read everything available:

- `objectives` field — the sponsor's stated objectives
- `maturity` field — all scored capabilities (current vs target)
- `inputs` field — reference materials
- `request-for-arch-work` field — any sponsor comments/amendments
- `_agent.objectives` — the EA Agent's confirmed understanding
- Any other fields in the phase data

The Request for Architecture Work should contain:

1. **Title and Date**
2. **Sponsor** — who commissioned this (derive from context)
3. **Scope** — which organisations, capabilities, and locations are in scope
4. **Objectives** — restated from sponsor input, structured
5. **Maturity Baseline** — summary of current vs target scores across the 6 domains, highlighting top gaps
6. **Architecture Principles** — key principles implied by the objectives (e.g., AI safety, data sovereignty, agent governance)
7. **Constraints** — budget, timeline, regulatory, technical constraints identified
8. **Approach** — which ADM phases will be executed and in what order
9. **Deliverables** — what each phase will produce
10. **Timeline and Milestones** — proposed schedule (derive from context or note as TBD)
11. **Team and Governance** — EA team structure, review cadence, escalation path
12. **Acceptance Criteria** — how success will be measured
13. **Open Questions** — anything still unresolved
14. **Approval** — signature block for sponsor and EA lead

This should read as a professional, signable document. Use tables where appropriate. Aim for 100–150 lines.

## Step 3: Write Output

Write the analysis as a markdown file to:
```
docs/data/ea-agent/preliminary-{section}.md
```

Then update the cycle data in `docs/data/ea-process-v2-inputs.json` by reading the file, finding the active cycle, and setting `cycles[active].phases.preliminary._agent.{section}` to the markdown content. Use a Python one-liner for this.

## Step 4: Confirm

After writing, tell the user:
- What you read from the sponsor input
- Key points from your output
- That they can view it on the EA Process page (hard refresh)

**Important constraints:**
- Do NOT write generic descriptions of the Preliminary Phase or TOGAF theory
- Every statement should reference something the sponsor actually said, or something they didn't say but should have
- If input is empty or missing, say so explicitly
- Be direct and concise — this is a working document
