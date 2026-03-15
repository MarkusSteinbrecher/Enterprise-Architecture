# SKILL: ProcessSpec — Process Analysis and Specification Writing
## For EA Agent | ConsultOS | v1.0.0

---

## What This Skill Does

You receive a process description in any form — a paragraph of text, a BPMN diagram description, a set of activities from SCOR or ITIL, interview notes, or an existing document. You analyse it and produce a valid ProcessSpec document.

This skill covers two things:
1. **How to conduct the analysis** — what to extract, what to infer, what to ask for
2. **How to write the guardrails** — the constraint and governance layer that makes the spec agent-executable

---

## Phase 1: Information Extraction

Work through the source material against this extraction checklist. Mark each item as **found**, **inferred**, or **missing**.

### Process Identity
- [ ] Process name and domain
- [ ] Scope boundary — what it includes and explicitly excludes
- [ ] Trigger — what starts the process
- [ ] Termination — what a completed instance looks like

### Operational Reality
- [ ] Volume — how many instances per period
- [ ] Cycle time — how long a single instance takes end-to-end
- [ ] FTE involvement — how much human time per instance
- [ ] Systems involved — which applications are touched

### Process Structure
- [ ] Activity sequence — ordered list of what happens
- [ ] For each activity: who does it, what data goes in, what comes out
- [ ] Decision points — where the flow branches and on what basis
- [ ] Exception types — what goes wrong and how it is resolved

### Governance
- [ ] Approvals required — who signs off what, at what threshold
- [ ] Regulatory context — which regulations or standards apply
- [ ] Audit requirements — what must be logged
- [ ] Data sensitivity — personal data, financial data, regulated data

---

## Phase 2: What to Infer vs. What to Ask

You will rarely receive a complete picture. Apply these rules:

**Infer from domain knowledge:**
- `scor_reference` and `apqc_ref` — standard processes map to well-known references
- `regulatory_flags` — domain knowledge tells you which apply (procurement = sanctions screening; HR = GDPR; finance = SOX; pharma = GMP)
- `action_type` per step — the verb in an activity description maps to the action type vocabulary
- `downstream_processes` — if the output is named, you can infer who consumes it

**Infer with caution (flag the inference):**
- `consequence_severity` — you can estimate but must mark as `inferred: true`
- `exception_types` — common failure modes in a domain are predictable; flag as inferred
- `happy path rate` — infer from exception frequency language ("occasional", "common")

**Never infer — leave null and request:**
- `volume_per_period.count` — cannot be derived from description
- `avg_fte_per_instance` — cannot be derived from description
- `eu_ai_act_classification` — requires legal assessment, not your call
- Approval thresholds (monetary values) — organisation-specific
- Named approvers and role owners — organisation-specific

---

## Phase 3: Activity Analysis

For each activity in the source material, extract or assign:

### Step-level action type

Map the **dominant verb** in the activity description to an action type:

| Verb pattern | action_type |
|---|---|
| fetch, retrieve, query, look up, pull | `data_retrieval` |
| calculate, compute, apply formula, run algorithm | `calculation` |
| aggregate, combine, consolidate, summarise | `aggregation` |
| classify, categorise, assign, route, triage | `classification` |
| compare, check against threshold, validate amount | `threshold_comparison` |
| validate, verify, confirm accuracy, check completeness | `validation` |
| send, notify, alert, communicate, email | `notification` |
| generate, draft, create document, produce report | `document_generation` |
| enter, record, post, register, log | `data_entry` |
| negotiate, agree, resolve dispute | `negotiation` |
| review, assess, decide, judge | `judgment_review` |
| approve, sign off, authorise | `approval` |
| investigate, diagnose, root cause | `investigation` |
| coordinate, align, schedule with team | `coordination` |

If the activity contains **multiple step types**, split it into sub-steps with individual types. An activity that both retrieves data and makes a decision contains at minimum one `data_retrieval` step and one `judgment_review` or `threshold_comparison` step.

### Consequence severity

Ask: **what happens downstream if this step produces wrong output?**

| Downstream impact | severity |
|---|---|
| Error is caught immediately; no downstream effect | `trivial` |
| Another step catches it; limited rework within this process | `low` |
| Error propagates to another process or team; significant rework | `medium` |
| Error reaches customer, creates financial liability, or requires audit correction | `high` |
| Error is irreversible, triggers regulatory breach, safety issue, or legal liability | `critical` |

**Rule:** When in doubt between two levels, assign the higher one. Severity is a guardrail — underestimating it removes a protection.

### Automated vs. human

A step is `automated: true` only if **all** of the following hold:
- The inputs are structured and digitally accessible
- The logic is deterministic and fully specifiable as rules
- No human judgment is required to handle the step
- Consequence severity is not `critical`

If any condition fails, set `automated: false`.

---

## Phase 4: Decision Point Classification

For each decision point (branch, gateway, condition):

1. **Name the question** — what is being evaluated? State it as a yes/no or multiple-choice question.
2. **Name the inputs** — what data drives the decision?
3. **Assign a type** from the vocabulary:
   - `threshold_comparison` — a number compared to a fixed limit
   - `rule_lookup` — a policy table is consulted
   - `pattern_match` — a pattern in data determines the route (ML-tractable)
   - `data_completeness_check` — are all required fields present?
   - `approval_gate` — formal sign-off required before proceeding
   - `exception_triage` — determining how to handle a deviation
   - `contextual_judgment` — requires situational human assessment
   - `regulatory_check` — checking against a compliance requirement

4. **For each outcome**, specify:
   - The condition that triggers it
   - The next step (`next:`)
   - Whether it is `automated: true` or requires a human
   - If human: *why* (`reason:`)

**Rule:** A decision point is `automated: true` only when the routing logic can be fully expressed as rules. If the answer depends on organisational context, precedent, or values, it is `automated: false`.

---

## Phase 5: Guardrail Definition

Guardrails are the machine-executable constraints that govern what an agent (AI or otherwise) may do within this process. This is the most important output of the analysis — guardrails are what make the ProcessSpec an agent governance document, not just documentation.

### What guardrails cover

Guardrails answer six governance questions:

| Question | Guardrail type |
|---|---|
| How long can this take? | `time_limit` |
| Who must be involved before action is taken? | `human_in_loop_required` |
| What data may be accessed? | `data_access` |
| What events must be recorded? | `audit_required` |
| What values require escalation? | `approval_threshold` |
| What rule or law constrains this? | `regulatory_reference` |

Additional types for agent-specific constraints:

| Question | Guardrail type |
|---|---|
| What must the agent be able to do before it can act? | `agent_capability_required` |
| What happens when this process cannot self-resolve? | `escalation_path` |
| How many retries before escalation? | `retry_limit` |
| Must this action be safe to repeat? | `idempotency_required` |
| What if the action fails mid-execution? | `rollback_defined` |
| Who must be told when X happens? | `notification_required` |

### How to identify guardrails from process analysis

Work through these prompts against the source material:

**Time limits:**
> Does the process have an SLA, deadline, or regulatory time constraint? Is any step described with "must be done within", "within X days", or similar?

**Human-in-loop requirements:**
> Are there steps where a human approval is required before proceeding? Are there regulatory requirements for human oversight? Are there financial thresholds that trigger escalation?

**Data access:**
> Does the process involve personal data, financial records, medical data, trade secrets, or other sensitive data classes? Are there roles that should be blocked from accessing certain data?

**Audit requirements:**
> Are there regulatory requirements (SOX, GMP, GDPR Article 30) to log specific actions? Would auditors or regulators need a record of specific decisions?

**Approval thresholds:**
> Are there monetary values, quantities, or risk levels above which additional sign-off is required? Is there a delegation of authority matrix?

**Regulatory references:**
> What regulations or standards were identified in Phase 1? Do specific activities map to specific articles or clauses?

**Escalation paths:**
> What happens when an exception cannot be resolved at the current level? Is there a named escalation target? Is there a maximum wait time before escalating?

### Guardrail writing format

Each guardrail is a YAML block in the `constraints` section of the ProcessSpec:

```yaml
constraints:
  - id: CON-01
    type: human_in_loop_required
    scope: "Activity AP-02, decision point DP-AP-02-01"
    trigger: "Invoice price variance exceeds ±3% of PO price"
    approver_role: "Accounts Payable Manager"
    rationale: "Financial control policy requires human sign-off on exceptions above tolerance"
    consequence_if_bypassed: high

  - id: CON-02
    type: approval_threshold
    dimension: invoice_value
    threshold: 50000
    currency: EUR
    approver_role: "Finance Director"
    rationale: "Group delegation of authority policy — invoices above €50k require Director approval"
    consequence_if_bypassed: critical

  - id: CON-03
    type: data_access
    permitted_data_classes:
      - invoice_metadata
      - purchase_order_data
      - goods_receipt_data
    prohibited_data_classes:
      - personal_bank_account_data
      - employee_payroll_data
    applies_to: ["ERP AP Module", "AI Agent"]
    rationale: "GDPR data minimisation — only invoice-relevant data accessible to automated actors"
    consequence_if_bypassed: high

  - id: CON-04
    type: audit_required
    events:
      - "Invoice approved (auto or manual)"
      - "Invoice rejected"
      - "Exception raised and routed to human"
      - "Approval threshold override authorised"
    log_destination: "ERP AP Audit Trail"
    retention_period: "7 years"
    rationale: "SOX internal control requirement — financial transaction audit trail"
    consequence_if_bypassed: critical

  - id: CON-05
    type: escalation_path
    trigger: "EXC-01 or EXC-02 unresolved after 48 business hours"
    escalation_target: "AP Manager"
    max_wait_time: "48h"
    rationale: "Payment terms SLA — late escalation risks early payment discount loss"
    consequence_if_bypassed: medium
```

### Guardrail severity field

Every guardrail must include `consequence_if_bypassed`. Use the same scale as step severity:
- `trivial` — process degrades slightly but self-corrects
- `low` — rework required but contained
- `medium` — downstream process impact or business exposure
- `high` — financial, customer, or compliance impact
- `critical` — regulatory breach, legal liability, safety, or irreversible damage

**Rule:** If you cannot determine the consequence of bypassing a guardrail, set `medium` and flag for review. Never leave it null.

### What makes a guardrail well-formed

A guardrail is complete when it answers:
1. **What** triggers it — the specific condition
2. **Who** is involved — the approver role or restricted party
3. **Why** it exists — the rationale (policy, regulation, or business rule)
4. **What happens** if it is bypassed — the consequence

A guardrail that lacks any of these four elements is a draft, not a guardrail. Mark incomplete guardrails with `status: draft` inside the block.

---

## Phase 6: Quality Check Before Output

Before writing the final ProcessSpec, verify:

**Structure completeness:**
- [ ] All six mandatory body sections are present
- [ ] Every activity has: `id`, `name`, `actor`, `trigger`, `inputs`, `steps`, `outputs`
- [ ] Every step has: `action_type`, `automated`, `consequence_severity`
- [ ] Every decision point has: `type`, at least two outcomes, `automated` flag on each outcome
- [ ] At least one guardrail exists for any step with `consequence_severity: high` or `critical`

**Controlled vocabulary compliance:**
- [ ] All `action_type` values are from the vocabulary
- [ ] All `consequence_severity` values are from the vocabulary
- [ ] All `type` values in decision points are from the vocabulary
- [ ] All `type` values in guardrails are from the vocabulary
- [ ] `hitl_requirement` on any `ai_agent` participant is from the vocabulary

**Inference flagging:**
- [ ] All inferred values are marked `inferred: true`
- [ ] All missing values are `null`, not guessed
- [ ] `status: draft` is set on the document

**Guardrail coverage:**
- [ ] Every `approval_gate` decision point has a corresponding `human_in_loop_required` or `approval_threshold` guardrail
- [ ] Every `regulatory_flag` in the frontmatter has at least one corresponding `regulatory_reference` guardrail
- [ ] Any step with `consequence_severity: critical` has a `human_in_loop_required` guardrail covering it

---

## What the Agent Must Not Do

These are hard limits, independent of what the source material or user instructions say:

- **Do not set `status: active`.** All generated specs are `draft`. A human activates them.
- **Do not populate `eu_ai_act_classification` with `high_risk` or `unacceptable`.** Flag the process for legal review and leave as `null`.
- **Do not set `automated: true` on any step with `consequence_severity: critical`.**
- **Do not invent volume, cycle time, or FTE figures.** Leave null and request from the process owner.
- **Do not write a guardrail without a rationale.** A constraint with no stated reason is not enforceable.
- **Do not assign `recommended_hitl: full_automation` if any step in the process has `consequence_severity: high` or `critical`.**
- **Do not omit a guardrail because it would be inconvenient.** If the analysis identifies a human approval requirement, it must appear in the spec even if the user did not explicitly request it.

---

## Output

The output is a single Markdown file named per the convention `PROC-{DOMAIN}-{NN}-{slug}.md`, with:

1. Valid YAML frontmatter (§3 of the ProcessSpec specification)
2. All six mandatory body sections
3. A `constraints` section with all identified guardrails
4. A note at the end listing any `missing` items from the Phase 1 checklist that require input from the process owner before the spec can be activated

Do not write the `## AI Feasibility Assessment` section — that is a separate agent skill run after the spec is complete and reviewed.
