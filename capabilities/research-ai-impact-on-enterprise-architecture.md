# Research: AI and Machine Learning Impact on Enterprise Architecture

**Research Date:** 2026-02-24
**Scope:** Deep web research into how AI/ML is transforming Enterprise Architecture practices, patterns, governance, tooling, frameworks, and real-world adoption
**Sources:** Gartner, Forrester, McKinsey, Bain & Company, CIO.com, Databricks, Microsoft Azure, Salesforce Engineering, IEEE, Springer Nature, InfoQ, and others (15+ sources)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [How AI Is Transforming Enterprise Architecture Practice](#2-how-ai-is-transforming-enterprise-architecture-practice)
3. [AI-Specific Architecture Patterns and Challenges](#3-ai-specific-architecture-patterns-and-challenges)
4. [How AI Tools Are Augmenting EA Capabilities](#4-how-ai-tools-are-augmenting-ea-capabilities)
5. [New Architecture Domains and Capabilities Needed for AI](#5-new-architecture-domains-and-capabilities-needed-for-ai)
6. [Impact of AI on Architecture Governance and Compliance](#6-impact-of-ai-on-architecture-governance-and-compliance)
7. [AI Impact on Architecture Decision-Making and Stakeholder Management](#7-ai-impact-on-architecture-decision-making-and-stakeholder-management)
8. [TOGAF and Other Framework Guidance on AI Architecture](#8-togaf-and-other-framework-guidance-on-ai-architecture)
9. [Real-World Examples of Organisations Adapting Their EA for AI](#9-real-world-examples-of-organisations-adapting-their-ea-for-ai)
10. [Implications for This EA Capability Model](#10-implications-for-this-ea-capability-model)
11. [Sources](#11-sources)

---

## 1. Executive Summary

AI and machine learning are fundamentally reshaping Enterprise Architecture practice across every dimension -- from how architecture is developed and governed, to the new domains and capabilities EA must address, to the tools architects use daily. This research synthesises findings from 15+ industry sources including Gartner, Forrester, McKinsey, Bain & Company, CIO.com, Databricks, Microsoft Azure, Salesforce Engineering, IEEE, and others.

### Key Findings

| Theme | Finding |
|-------|---------|
| **Strategic elevation** | EA has moved from advisory to essential. Gartner reports the EA tools market has grown from $200-250M (2018) to over $1B today. |
| **Operational model shift** | Traditional EA operated on cycles of weeks or months. AI-augmented EA operates in near real-time with continuous feedback loops. |
| **Three generations of AI operations** | MLOps (mature), LLMOps (scaling), and AgentOps (emerging) each require distinct architectural patterns, governance controls, and operational capabilities. |
| **Governance is now existential** | The EU AI Act (August 2026 full enforcement), US state-level legislation, and real enforcement actions make embedded governance a survival requirement. |
| **Massive readiness gap** | 63% of organisations lack AI-ready data management. Only 28% of applications are connected. Only 1% of organisations consider themselves AI-mature. |
| **The architect's role is evolving** | From document author to decision engineer; from designer to orchestrator. But competency decay is a real risk. |
| **Frameworks are extensible but need supplementing** | TOGAF and existing frameworks cover the foundations but must be supplemented with AI-specific patterns, governance models, and operational disciplines. |
| **Leading results are compelling but rare** | JPMorgan (360,000 staff hours automated), BMW (60% defect reduction), and Intercom ($100M AI-first replatforming) demonstrate transformational impact. Most organisations are still in pilot stage. |

### Critical Statistic

> "More than 80% of CEOs expect AI to contribute to top-line growth in 2025, whereas only 3% of CIOs expect the same." -- Gartner, 2025

---

## 2. How AI Is Transforming Enterprise Architecture Practice

### 2.1 Gartner's Perspective

Gartner identifies three converging trends reshaping EA in 2025-2026: recessionary fears, geopolitical threats, and disruptive AI capabilities. Their research finds that 62% of CEOs put growth at the top of their business priority list, yet there is a massive perception gap between CEO expectations and CIO confidence regarding AI.

**Key Gartner predictions:**

| Prediction | Timeframe |
|-----------|-----------|
| 60-70% of enterprises will reposition their EA functions to focus on business-outcome-driven transformation | By 2027 |
| 40% of enterprise applications will integrate task-specific AI agents (up from <5% in 2025) | By end of 2026 |
| Agentic AI could drive ~30% of enterprise application software revenue, surpassing $450 billion | Best-case by 2035 |
| 55% of EA teams will transition to AI-based autonomous governance | By 2028 |

Gartner positions EA as moving from advisory to essential: "Businesses accelerating AI adoption face mounting technical debt, cloud sprawl, and regulatory pressure" (analysts Stephane Vanrechem and Charles Betz).

### 2.2 Forrester's Perspective

Forrester frames the transformation through their **"Augmented Architect"** concept (April 2025). They argue that EA must shift from episodic, open-loop review cycles (where proposals are reviewed days or weeks later based on stale information) to real-time, closed-loop architecture powered by AI agents, LLMs, retrieval-augmented generation, vector databases, and dynamic graph-based systems.

Forrester reports the EA Management Suite (EAMS) market has surpassed $1 billion, with consolidation accelerating:

| Acquirer | Target | Significance |
|----------|--------|--------------|
| SAP | LeanIX | Largest EA tool acquisition |
| Bizzdesign | MEGA International + Alfabet | Triple combination |
| Orbus | Capsifi | Strategic expansion |
| ServiceNow | APM module evolution | Platform play into EA |

Forrester predicts composable enterprise initiatives lead to 40-60% faster delivery of digital capabilities and that 60% of firms will face AI regulation by 2027.

### 2.3 McKinsey's Perspective

McKinsey's 2024-25 surveys strike a cautionary note:

- Nearly 90-99% of organisations report using AI, but only 1% consider themselves mature.
- Only ~39% report EBIT impact from AI.
- Only 20-21% of organisations achieve enterprise-level impact from AI initiatives.
- Most pilots fail to scale due to weak data foundations, inadequate governance, and poor integration into business processes.

McKinsey predicts modular, API-first approaches will reshape enterprise architecture fundamentally.

### 2.4 Bain & Company's Perspective

Bain's Technology Report 2025 describes agentic AI as a "structural shift in enterprise technology" that completely redefines how work gets done.

**Key Bain findings:**

- AI leaders have moved from pilots to profits, delivering **10-25% EBITDA gains** by scaling AI across core workflows.
- Most companies are not ready: current architectures cannot handle the demands of thousands of AI agents operating across the enterprise.
- Bain advocates maintaining an "architectural North Star" while building pragmatically with fit-for-purpose, domain-specific, human-in-the-loop solutions.
- The growth rate for AI's compute demand is more than twice the rate of Moore's law.
- The most important aspects of transformation are process redesign and cleaning up the data and application environment -- there is no way to cut corners on this.

---

## 3. AI-Specific Architecture Patterns and Challenges

### 3.1 The MLOps to LLMOps to AgentOps Evolution

Enterprise AI operations have evolved through three distinct generations, each requiring different architectural patterns:

| Generation | Focus | Key Tooling | Maturity |
|-----------|-------|-------------|----------|
| **MLOps** | Automating the ML lifecycle (training, testing, deployment, monitoring, retraining) | MLflow, TFX, SageMaker Pipelines, Databricks | Mature |
| **LLMOps** | Operationalising large language models (prompt management, RAG, token cost monitoring, semantic observability) | LangChain, LlamaIndex, Weights & Biases, custom platforms | Scaling |
| **AgentOps** | Orchestrating autonomous AI agents at enterprise scale (agent coordination, communication protocols, behavioural governance) | Emerging frameworks, MCP | Emerging |

### 3.2 Production-Ready LLMOps Architecture Layers

A production-ready LLMOps architecture integrates six layers, each designed to scale independently while remaining fully traceable:

1. **Frontend Access Layer:** User interfaces, API gateways, authentication.
2. **Orchestration Layer:** Systems that run logic, call data stores or agents for grounding data, generate prompts, and invoke language models.
3. **Data Grounding Layer:** RAG pipelines, vector stores, knowledge bases, embeddings.
4. **Model Execution Layer:** Model serving, routing, scaling, latency management.
5. **Governance and Lifecycle Management Layer:** Model versioning, audit trails, prompt tracking, secure access policies ensuring reproducibility, interpretability, and compliance.
6. **Observability Layer:** Monitoring, tracing, cost tracking, performance analytics.

### 3.3 Critical Differences Between MLOps and LLMOps

| Dimension | MLOps | LLMOps |
|-----------|-------|--------|
| Data type | Primarily structured datasets | Unstructured data from multiple sources (chat logs, documents, APIs) |
| Training | Model training pipelines | Prompt engineering, fine-tuning, RAG |
| Versioning | Model versioning | Model + prompt + context versioning at massive scale |
| Latency | Batch or near-real-time | Real-time inference with strict latency requirements |
| Cost model | Compute-based | Token-based with complex cost dynamics |
| Observability | Standard metrics | Semantic observability (hallucination detection, output quality) |

### 3.4 Model Governance Requirements

Every model, prompt, and agent action must be tracked and auditable. A strong LLMOps framework begins with clear data lineage and validation, meaning every token used in training can be traced to its origin for explainability and audit readiness. Enterprise GenAI systems must enforce identity-based access, secure API communication, data residency requirements, and auditable model usage -- embedded directly into the AI execution flow rather than added as external checks.

### 3.5 The Responsible AI Layer

This is an emerging architectural concern that manages:
- Prompt versioning and lifecycle management
- Hallucination tracking and mitigation
- Bias detection and fairness monitoring
- Interaction logging for audit trails
- Harmful content filtering and safety guardrails

### 3.6 Measurable Outcomes from LLMOps Adoption

| Metric | Improvement |
|--------|-------------|
| Infrastructure savings | 25-40% |
| p95 latency reduction (autoscaling + edge) | Up to 40% |
| Monthly AI cost reduction (FinOps controls) | 20-30% |

### 3.7 Critical Warning

Gartner projects that at least **30% of generative AI projects will be abandoned after proof of concept** by 2025, due to costs, governance issues, or unclear value.

---

## 4. How AI Tools Are Augmenting EA Capabilities

### 4.1 Forrester's Specialist Agent Taxonomy for EA

Forrester envisions a taxonomy of specialised AI agents transforming EA practice:

| Agent Type | Function |
|-----------|----------|
| **Harvesting agents** | Monitor digital signals, extracting knowledge into information stores continuously |
| **Dependency agents** | Map interconnections across the digital estate, analysing both automated data (traces) and architectural/unstructured information for higher-order logical dependencies |
| **Lifecycle-aware agents** | Flag ageing technologies, enabling proactive technical debt diagnosis |
| **Conformance agents** | Validate proposals against approved technology stacks, standards, and design patterns |
| **Security and cost agents** | Trace implications across risk, compliance, and spend |
| **Diagram recognition agents** | Convert scanned or hand-drawn schematics into structured model elements |
| **Pattern recognition agents** | Detect anti-patterns and optimisation opportunities |
| **Generative agents** | Propose transition roadmaps between current and target states based on actual feasibility |

Forrester's key insight: "This is not just automation -- it's augmentation. Architects remain in the loop, but the loop is smaller, faster, and smarter."

### 4.2 AI-Assisted Architecture Modelling

Tools like ADOIT (BOC Group) already deliver intelligent modelling suggestions based on the organisation's metamodel and modelling rules. As users create or extend diagrams, the tool recommends valid elements and connections, helping teams build consistent, complete models more efficiently.

Machine learning analyses existing diagrams and fills gaps, while generative AI recommends new solution patterns and models based on current data. Chatbots enable non-architects to interact with the repository, democratising architecture insight.

### 4.3 Salesforce's EA Agent (Production Example)

Salesforce's engineering team created the EA Agent to assist architects in creating, reviewing, and optimising system designs. By leveraging Data Cloud to process 100,000 documents, the EA Agent provides actionable insights, identifies compliance gaps, and helps architects align their work with Salesforce standards. This is a concrete, production-scale example of AI augmentation in EA practice.

### 4.4 Impact on Technical Debt

Publicis Sapient, in partnership with HFS Research, found that Global 2000 enterprises are carrying $1.5-2 trillion in accumulated tech debt. While 30% of IT budgets are spent on modernisation, only 3 in 10 organisations have modernised their core applications. Their Slingshot platform, with 2,000 active developers, drove productivity increases of 40-60% across engineering teams.

### 4.5 The Evolving Role of the Architect

The architect's role evolves from "builder" to "orchestrator." AI excels at automating repetitive tasks, discovering patterns in large datasets, and generating initial drafts, freeing architects to focus on strategic analysis, stakeholder negotiation, innovation, and ensuring business alignment. Architects increasingly operate as curators and validators of AI outputs rather than primary creators of design artefacts.

---

## 5. New Architecture Domains and Capabilities Needed for AI

### 5.1 Multi-Layer AI Enterprise Architecture

Enterprise AI architecture now requires multiple interconnected layers that extend beyond traditional EA domains:

| Layer | Purpose | Relationship to Traditional EA |
|-------|---------|-------------------------------|
| **Business Architecture** | Defines strategic goals, capabilities, workflows ensuring AI alignment with organisational objectives | Extension of existing business architecture |
| **Data Architecture** | Governs how data is sourced, stored, validated, and secured for reliable AI inputs | Major expansion of existing data architecture |
| **AI/ML Architecture** | Manages model development, training, deployment, monitoring, and retraining pipelines | **New domain** |
| **Agent Architecture** | Orchestrates autonomous AI agents, their communication, coordination, and governance | **New domain** |
| **AI Governance Architecture** | End-to-end accountability across the entire AI lifecycle | **New domain** |

### 5.2 Data Pipeline Evolution for AI

| Traditional Approach | AI-Ready Approach |
|---------------------|-------------------|
| Batch processing | Real-time and near real-time streaming |
| Structured data focus | Structured + unstructured data (documents, emails, voice, images, video) |
| Periodic quality checks | Continuous quality validation and data lineage |
| Centralised data warehouses | Lakehouse architectures combining warehouse + lake |
| Static schemas | Dynamic schemas with semantic layers |

**Critical gap:** Gartner's July 2024 survey found that 63% of organisations don't have (or are unsure if they have) AI-ready data management practices. MuleSoft's 2025 Connectivity Benchmark Report reveals only ~28% of apps are connected, with organisations averaging around 897 apps.

### 5.3 The Lakehouse Architecture Pattern

Databricks' lakehouse architecture has emerged as a leading pattern, combining data warehouses (optimised for analytics) with data lakes (optimised for machine learning) into a unified system. In 2025, Databricks' Unity Catalog provides centralised governance across all data and AI assets, including model lineage, prompt lineage, auditability, and centralised access control. Over 60% of the Fortune 500 use Databricks SQL.

### 5.4 AI Governance as a New Domain

AI Trust, Safety, and Governance Hubs are emerging as suites of tools integrated into the model lifecycle to enforce responsible AI principles -- bias detection, explainability, and safety monitoring. Gartner predicts that by 2028, 55% of EA teams will transition from traditional practices to AI-based autonomous governance.

### 5.5 Agentic Readiness Requirements (Bain)

Bain outlines critical infrastructure requirements for agentic AI:

1. **Modernise core platforms** to be API-accessible and real-time capable.
2. **Evaluate current architecture for agentic readiness**, identifying capabilities required to scale.
3. **Embed observability, security, governance, and controls** from the start.
4. **Ensure interoperability** through standards like the Model Context Protocol (MCP).
5. **Build agent development toolchains** and fast-track modernisation of vector databases and event architectures.

### 5.6 Architectural Patterns for AI-Ready Enterprises

Modern data architecture enables AI-ready enterprises through:
- **Data mesh:** Domain-oriented data ownership with centralised governance standards.
- **Lakehouse:** Unified data warehouse + data lake for both analytics and ML.
- **Event-driven architecture (EDA):** Moving from synchronous, tightly coupled connections to event-driven patterns that support agentic AI.
- **Composable architecture:** Modular, API-first, microservices-based platforms that enable rapid reconfiguration.

---

## 6. Impact of AI on Architecture Governance and Compliance

### 6.1 The Shift from Voluntary to Mandatory

2025-2026 marks the transition from voluntary ethical guidelines to enforceable regulation. The old approach of relying on voluntary ethical guidelines stopped working in 2025. Regulators around the world moved from guidance to enforcement.

### 6.2 Key Regulatory Frameworks Converging in 2026

| Regulation | Jurisdiction | Effective Date | Key Requirements |
|-----------|-------------|----------------|-----------------|
| **EU AI Act** | European Union | August 2026 (full enforcement) | Risk-based framework; penalties up to 35M EUR or 7% of global turnover; requires full data lineage, human-in-the-loop checkpoints, risk classification |
| **California AB 2013** | California, US | January 2026 | Mandates generative AI developers publish training data summaries |
| **Colorado AI Act** | Colorado, US | June 2026 | Addresses algorithmic discrimination in high-stakes decisions |
| **California SB 53** | California, US | October 2025 | Requires transparency reports on safety testing from frontier model developers |
| **China Amended Cybersecurity Law** | China | January 2026 | Strengthens AI ethics regulation |
| **South Korea AI Basic Act** | South Korea | 2026 | Comprehensive AI governance framework |
| **Vietnam Digital Technology Industry Law** | Vietnam | 2026 | AI regulation provisions |

### 6.3 Enforcement Is Already Real

| Action | Detail |
|--------|--------|
| Italy fined OpenAI | 15M EUR for GDPR violations in training data processing |
| FTC "Operation AI Comply" | Targeted deceptive AI marketing practices |
| SEC 2026 examination priorities | AI and cybersecurity displaced cryptocurrency as the dominant risk topic |

### 6.4 Three-Layer Governance Model

CIO Dive recommends governance embedded at every layer:

1. **Design-time principles:** Bias mitigation, explainability, fairness requirements built into architecture specifications.
2. **Run-time controls:** Human-in-the-loop escalation paths, automated guardrails, real-time monitoring.
3. **Audit-time oversight:** Decision traceability, impact analysis, regulatory reporting.

### 6.5 AI-Enhanced Governance

AI is not only a subject of governance but also an enabler of governance:

- AI-based data governance automates data quality checks, metadata management, and compliance monitoring.
- Digital twins combined with agentic AI provide real-time simulation environments for governance testing.
- Gartner predicts 55% of EA teams will act as coordinators of autonomous governance automation by 2028, shifting from direct oversight to model curation/certification, agent simulations/oversight, and business outcome alignment with machine-led governance.

### 6.6 Architecture Implications

Every layer of AI architecture -- from data pipelines to model evaluation -- must prove accountability, explainability, and risk control. Architectural choices are no longer driven solely by accuracy or efficiency; they are shaped by survivability under regulatory scrutiny. Every model, prompt, and agent action must be tracked and auditable, especially in regulated industries and high-stakes deployments.

---

## 7. AI Impact on Architecture Decision-Making and Stakeholder Management

### 7.1 Transforming Decision-Making

GenAI proves particularly impactful during early phases of agile development -- ideation, trade-off analysis, and requirements engineering. It facilitates exploration of alternative design paths, enabling architects to balance competing quality attributes (scalability, performance, maintainability) in volatile enterprise environments where decision latency must be minimised.

Forrester observes that "AI shifts architects from document authors to decision engineers." The ability to design, simulate, and interrogate multiple "to-be" scenarios is becoming standard practice.

### 7.2 Quantified Improvements

A 2025 ResearchGate study of 28 organisations demonstrated:

| Metric | Improvement |
|--------|-------------|
| Architectural decision accuracy | 67% improvement |
| Design iteration cycles | 54% reduction |
| Architecture-business alignment | 73% enhancement |

### 7.3 Democratising Stakeholder Engagement

AI translates complex architecture data into clear, digestible insights using natural language processing:

- Chatbots and assistants answer questions in everyday language.
- Product owners query impacts of new features directly.
- Risk managers explore security posture in seconds.
- AI-driven presentations and live dashboards give stakeholders across every department access to up-to-date insights.

This translates directly into better buy-in from leadership and cross-functional teams. Architecture becomes a tool for everyday collaboration, not just long-term planning.

### 7.4 The "Decision Engineer" Role

Architects increasingly operate as curators and validators of GenAI outputs rather than primary creators of design artefacts. Depending on context, they act as strategic advisors, technical coaches, reviewers, or crisis managers. There has been a reported 67% increase in AI-enhanced enterprise architect positions, with salary premiums of approximately 40% for AI skills.

### 7.5 Critical Risk: Competency Decay

The most insidious risk identified across multiple sources is competency decay. As AI tools propose architectures, simulate outcomes, and generate documentation, architects may slowly lose the craft that once came from working through design problems manually.

Gartner predicts that through 2026, atrophy of critical-thinking skills due to GenAI use will push **50% of global organisations** to require "AI-free" skills assessments.

---

## 8. TOGAF and Other Framework Guidance on AI Architecture

### 8.1 TOGAF 10th Edition and AI

TOGAF 10 (released 2022 by The Open Group) does not include a dedicated "AI module" out of the box, but its modular structure, ADM methodology, governance framework, and extensible guidance make it well-suited for architecting AI capabilities. TOGAF 10 is divided into TOGAF Fundamental Content (core concepts and practices) and TOGAF Series Guides (configuration guidance for specific topics).

### 8.2 How TOGAF Addresses AI/ML

| TOGAF Area | AI/ML Application |
|-----------|-------------------|
| **Architecture Governance** | Define AI governance, ethics, data privacy compliance, and architecture principles. Integrate AI ethics guidelines (fairness, explainability, bias reduction) into governance checkpoints. |
| **Enterprise-wide Integration** | TOGAF ensures AI is not siloed but connected to data, application, and infrastructure roadmaps, aligned with enterprise mission, compliance, and risk frameworks. |
| **Data Quality and Lifecycle** | TOGAF embeds data principles, quality standards, and lifecycle management into AI strategy, recognising that AI/ML models are only as good as the data behind them. |
| **Technology Architecture (Phase D)** | Designs scalable GPU/TPU infrastructure and MLOps pipelines, supporting incremental AI capability upgrades. |
| **Risk Management** | TOGAF's governance model addresses the new legal, reputational, and operational risks AI introduces. |

### 8.3 IEEE Framework for TOGAF-Based AI Integration

An IEEE research publication (2023) specifically addresses TOGAF-based AI integration, providing a framework that utilises artificial intelligence across all architecture domains, guiding organisations in using AI to accelerate digital transformation, increase efficiency, and achieve better business goals.

### 8.4 BIZBOK and AI Adoption

A Springer Nature study (2025) proposed a conceptual framework for AI adoption within business architecture aligned with BIZBOK principles, integrating business architecture elements (capabilities, organisation, information, value streams) with AI adoption components. The framework was evaluated through case studies in higher education and local government.

### 8.5 InfoQ "Three Loops" Framework

The InfoQ eMag "Architecture in the Age of AI" (January 2026) introduces a "Three Loops" framework to help architects navigate the transition from manual design to meta-design, where AI evolves from tool to collaborator.

### 8.6 TOGAF's Resurgence

EA is resurging in 2025-2027 due to cost pressure, AI acceleration, cyber risk, and regulation removing tolerance for what some analysts call "architecture as theatre." TOGAF remains the most widely adopted Enterprise Architecture framework globally, and its extensible, modular structure makes it adaptable to AI-specific concerns.

---

## 9. Real-World Examples of Organisations Adapting Their EA for AI

### 9.1 JPMorgan Chase -- Contract Intelligence (COIN)

Developed an AI system called COIN to automate document review for complex loan agreements. COIN now performs the equivalent of **360,000 staff hours annually** -- over 40 years of manual work. This required rearchitecting their document processing pipeline to integrate AI inference at scale.

### 9.2 BMW -- AI-Powered Quality Control

Integrated AI-powered computer vision into assembly lines for real-time inspections. Factories reported up to a **60% reduction in vehicle defects**. Using no-code AI tools and synthetic data, BMW cut the time to implement new quality checks by approximately two-thirds.

### 9.3 Uber -- In-House LLM Training Infrastructure

Built in-house LLM training infrastructure leveraging open-source models to power Uber Eats recommendations, search, customer support chatbots, coding, and SQL query generation. Optimisations including CPU Offload and Flash Attention achieved a **2-3x increase in throughput** and 50% reduction in memory usage.

### 9.4 Intercom -- AI-First Customer Experience Platform

Leadership redirected resources from non-AI work, formed a cross-functional task force, and invested **$100 million** to replatform the business. Their Fin AI agent's flexible architecture supports multimodal inputs, routes complex queries, and enables model switching without reengineering.

### 9.5 Salesforce -- EA Agent at Scale

Developed an EA Agent that processes **100,000 documents** via Data Cloud, providing actionable insights, identifying compliance gaps, and helping architects align with enterprise standards.

### 9.6 Ericsson -- Agentic AI for Telecom

Leveraging agentic AI to automate development and deployment of AI applications across telecom operations. Their Telco Agentic AI Studio automates creation of agentic applications for operations and business support systems.

### 9.7 Uniper and Microsoft -- Composable Architecture

Transforming operations across maintenance, finance, and supply chain using process intelligence and Microsoft AI agents. The composable architecture enables rapid reconfiguration and faster integration of emerging technologies.

### 9.8 Research Study: 28 Organisations (2023-2025)

A ResearchGate study of 28 organisations across multiple industries demonstrated:

| Metric | Result |
|--------|--------|
| Architectural decision accuracy | 67% improvement |
| Design iteration cycles | 54% reduction |
| Architecture-business alignment | 73% enhancement |

### 9.9 BFSI Sector (15 Major Institutions)

Case studies from 15 major BFSI institutions across North America and Europe showed that organisations adopting API-first architectures, cloud-native platforms, and microservices patterns achieved **40% faster time-to-market** for new services while maintaining regulatory compliance.

### 9.10 Broader Adoption Statistics

| Statistic | Source |
|-----------|--------|
| 77% of firms plan to retrain/upskill workers to work alongside AI (2025-2030) | World Economic Forum |
| Only 11% of companies are getting measurable benefit from AI investments | IDC |
| Only 1% of organisations consider themselves AI-mature | McKinsey |
| 63% of organisations lack AI-ready data management practices | Gartner |

---

## 10. Implications for This EA Capability Model

Based on this research, the following capabilities in this EA Capability Model are most directly affected by the AI transformation, with specific enhancement opportunities:

### 10.1 Capabilities Requiring AI-Specific Updates

| Capability | AI Impact | Recommended Enhancement |
|-----------|-----------|------------------------|
| **Cap 1: Architecture Vision Development** | AI strategy must be embedded in the architecture vision. CEOs expect AI-driven growth but CIOs lag in confidence. | Add AI strategy alignment as a task. Include AI maturity assessment in inputs. |
| **Cap 2: Architecture Roadmap Development** | AI adoption creates new roadmap dimensions (MLOps maturity, data readiness, governance milestones). | Add AI capability roadmap as an output. Include AI maturity stages. |
| **Cap 3: Transformation Planning** | Agentic AI represents a "structural shift" (Bain) requiring fundamentally different transformation approaches. | Add AI-driven transformation patterns. Address 180-day agentic readiness planning. |
| **Cap 4: Architecture Requirements Management** | AI introduces new requirement categories: data lineage, model explainability, bias mitigation, token cost constraints. | Add AI-specific requirement categories. Include responsible AI requirements. |
| **Cap 5: Architecture View Creation** | AI can generate and recommend architecture views. New stakeholders (data scientists, ML engineers) need new view types. | Add AI/ML architecture views. Include AI-generated view capabilities. |
| **Cap 6: New Technology Evaluation** | AI/ML technologies (LLMs, agent frameworks, vector databases, MLOps platforms) are the dominant technology evaluation category. | Add AI-specific evaluation criteria. Include agentic readiness assessment. |

### 10.2 Data Architecture Domain (Caps 13-15)

| Capability | AI Impact | Recommended Enhancement |
|-----------|-----------|------------------------|
| **Cap 13: Business Object Modelling** | AI requires semantic data models, embeddings, and ontologies beyond traditional business objects. | Add semantic layer and embedding considerations. |
| **Cap 14: Data Architecture Modelling** | Lakehouse architectures, real-time streaming, and unstructured data pipelines are now essential. | Add AI-ready data architecture patterns (lakehouse, data mesh, streaming). |
| **Cap 15: Data Flow Modelling** | AI data flows include training pipelines, inference pipelines, RAG pipelines, and feedback loops. | Add AI/ML data flow patterns. Include token flow and embedding pipeline modelling. |

### 10.3 Governance Domain (Caps 27, 30, ARB)

| Capability | AI Impact | Recommended Enhancement |
|-----------|-----------|------------------------|
| **Cap 27: Standards, Policies, Principles, Guidelines** | AI governance, ethics, responsible AI principles, and regulatory compliance (EU AI Act) must be embedded. | Add AI governance standards. Include responsible AI principles. Address regulatory requirements. |
| **Cap 30: Architecture Compliance Evaluation** | AI compliance evaluation requires new dimensions: model fairness, explainability, data lineage, safety testing. | Add AI compliance criteria. Include three-layer governance model (design-time, run-time, audit-time). |
| **ARB** | ARB must evaluate AI-specific architecture decisions: model selection, training infrastructure, agent orchestration, ethical guardrails. | Add AI architecture review criteria. Include AI ethics review in scope. |

### 10.4 Potential New Capabilities to Consider

Based on the research findings, these new capability areas warrant consideration:

| Potential New Capability | Rationale | Priority |
|-------------------------|-----------|----------|
| **AI/ML Architecture** | MLOps, LLMOps, and AgentOps require dedicated architectural patterns, tooling, and governance distinct from traditional application/technology architecture. | HIGH |
| **AI Governance and Ethics** | The EU AI Act, emerging global regulation, and responsible AI requirements demand a dedicated governance capability beyond what Cap 27 and Cap 30 currently cover. | HIGH |
| **Data Pipeline Architecture for AI** | Real-time streaming, unstructured data ingestion, vector databases, and RAG pipelines represent a new architectural domain not covered by current data architecture capabilities. | MEDIUM |
| **AI-Augmented EA Practice** | The tools and methods for augmenting EA practice itself with AI (Forrester's agent taxonomy, AI-assisted modelling, automated discovery) warrant dedicated capability development. | MEDIUM |

---

## 11. Sources

### Industry Analyst Firms

1. [Gartner: 3 Trends Driving EA Strategy in 2025](https://www.gartner.com/en/articles/2025-trends-for-enterprise-architecture)
2. [Gartner: 40% of Enterprise Apps to Feature AI Agents by 2026](https://www.gartner.com/en/newsroom/press-releases/2025-08-26-gartner-predicts-40-percent-of-enterprise-apps-will-feature-task-specific-ai-agents-by-2026-up-from-less-than-5-percent-in-2025)
3. [Forrester: The Augmented Architect -- Real-Time EA in the Age of AI](https://www.forrester.com/blogs/the-augmented-architect-real-time-enterprise-architecture-in-the-age-of-ai/)
4. [Bain & Company: Building the Foundation for Agentic AI (Technology Report 2025)](https://www.bain.com/insights/building-the-foundation-for-agentic-ai-technology-report-2025/)
5. [Bain & Company: State of the Art of Agentic AI Transformation](https://www.bain.com/insights/state-of-the-art-of-agentic-ai-transformation-technology-report-2025/)

### Technology and Business Media

6. [CIO.com: Why Enterprise Architecture Needs a New Playbook](https://www.cio.com/article/3984410/data-agents-and-governance-why-enterprise-architecture-needs-a-new-playbook.html)
7. [CIO.com: Rewriting the Rules of EA with AI Agents](https://www.cio.com/article/4018758/rewriting-the-rules-of-enterprise-architecture-with-ai-agents.html)
8. [CIO.com: Architecting Your Stack for the Agentic AI Era](https://www.cio.com/article/4086719/the-enterprise-it-overhaul-architecting-your-stack-for-the-agentic-ai-era.html)
9. [CIO.com: How to Get Your EA Ready for Agentic AI](https://www.cio.com/article/4119297/how-to-get-your-enterprise-architecture-ready-for-agentic-ai.html)

### Technology Platforms and Engineering

10. [Microsoft Azure Architecture Center: GenAIOps for MLOps](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/genaiops-for-mlops)
11. [Databricks: AI Architecture -- Building Enterprise AI Systems with Governance](https://www.databricks.com/blog/ai-architecture-building-enterprise-ai-systems-governance)
12. [Salesforce Engineering: How the EA Agent Scales AI to Transform EA](https://engineering.salesforce.com/how-salesforces-new-ea-agent-scales-ai-to-transform-enterprise-architecture/)
13. [Fractal Analytics: Enterprise LLMOps Architecture](https://fractal.ai/blog/enterprise-llmops-architecture)

### Academic and Research

14. [IEEE: TOGAF-Based EA Framework for Utilizing AI](https://ieeexplore.ieee.org/document/10285801/)
15. [Springer Nature: Conceptual Framework for AI Adoption in Business Architecture](https://link.springer.com/article/10.1007/s44163-025-00673-3)
16. [ResearchGate: AI-Driven EA -- Transforming Frameworks and Decision-Making (2025)](https://www.researchgate.net/publication/392268031_AI-Driven_Enterprise_Architecture_Transforming_Frameworks_and_Decision-Making_in_the_Age_of_Artificial_Intelligence_2025)

### Governance and Compliance

17. [Governance Intelligence: How AI Will Redefine Compliance in 2026](https://www.governance-intelligence.com/regulatory-compliance/how-ai-will-redefine-compliance-risk-and-governance-2026)
18. [Dataversity: AI Governance in 2026](https://www.dataversity.net/articles/ai-governance-in-2026-is-your-organization-ready/)

### Additional Sources

19. [InfoQ: Architecture in the Age of AI eMag](https://www.infoq.com/minibooks/architecture-age-ai-opportunity/)
20. [Covasant: MLOps, LLMOps, AgentOps Pipeline Guide](https://www.covasant.com/blogs/mlops-llmops-agentops-the-essential-ai-pipeline-guide)
21. [BOC Group: How AI Is Transforming EA](https://www.boc-group.com/en/blog/ea/how-ai-is-transforming-enterprise-architecture/)
22. [Cloudera: 2026 Architecture, Governance, and AI Trends](https://www.cloudera.com/blog/business/2026-predictions-the-architecture-governance-and-ai-trends-every-enterprise-must-prepare-for.html)

---

*This research was compiled on 2026-02-24 through systematic web research across 22 sources spanning industry analyst firms, technology platforms, business media, academic research, and governance/compliance publications.*
