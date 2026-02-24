# The Impact of AI on Enterprise Architecture: A Capability-by-Capability Analysis

**Date:** 2026-02-24
**Scope:** Deep research on how the implementation of AI affects the EA Capability Model (30 capabilities + ARB)
**Context:** This document analyses how AI — as both a technology to be governed and a tool that transforms EA practice — impacts each domain and capability in the EA Capability Model.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Two Dimensions of AI Impact](#2-two-dimensions-of-ai-impact)
3. [Impact on Architecture Development – Common](#3-impact-on-architecture-development--common)
4. [Impact on Architecture Development – Business Architecture](#4-impact-on-architecture-development--business-architecture)
5. [Impact on Architecture Development – Application Architecture](#5-impact-on-architecture-development--application-architecture)
6. [Impact on Architecture Development – Data Architecture](#6-impact-on-architecture-development--data-architecture)
7. [Impact on Architecture Development – Technology Architecture](#7-impact-on-architecture-development--technology-architecture)
8. [Impact on Architecture Repository](#8-impact-on-architecture-repository)
9. [Impact on Architecture Management](#9-impact-on-architecture-management)
10. [Impact on Architecture Governance, Communication & Change](#10-impact-on-architecture-governance-communication--change)
11. [New Capabilities and Cross-Cutting Concerns](#11-new-capabilities-and-cross-cutting-concerns)
12. [AI Maturity Model for EA](#12-ai-maturity-model-for-ea)
13. [Implementation Roadmap](#13-implementation-roadmap)
14. [Risks and Guardrails](#14-risks-and-guardrails)
15. [Recommendations](#15-recommendations)

---

## 1. Executive Summary

Artificial Intelligence affects the EA Capability Model along **two distinct dimensions**:

1. **AI as a subject of architecture** — AI systems (machine learning models, LLMs, generative AI, intelligent automation) introduce new architecture patterns, infrastructure demands, data requirements, ethical considerations, and governance needs that the EA function must manage.

2. **AI as a tool for the architect** — AI-powered tools are transforming how architects work: automating discovery, generating views, assessing compliance, analysing stakeholders, and augmenting decision-making across all 30 capabilities.

### Impact Summary by Domain

| Domain | AI as Subject | AI as Tool | Overall Impact |
|--------|:---:|:---:|:---:|
| Architecture Development – Common | Medium | Very High | **Very High** |
| Business Architecture | High | High | **High** |
| Application Architecture | Very High | Very High | **Very High** |
| Data Architecture | Very High | High | **Very High** |
| Technology Architecture | Very High | High | **Very High** |
| Architecture Repository | Medium | Very High | **Very High** |
| Architecture Management | High | Medium–High | **High** |
| Governance, Communication & Change | Very High | High | **Very High** |

### Key Findings

- **All 30 capabilities** are affected to some degree. 15 capabilities (50%) face very high impact.
- **Data Architecture** and **Technology Architecture** face the most fundamental changes because AI systems demand new data pipelines, compute infrastructure, and operational patterns (MLOps, LLMOps) that differ substantially from traditional IT.
- **Architecture Governance** faces a paradigm shift: AI systems are probabilistic (not deterministic), continuously learning, and raise ethical and regulatory concerns (EU AI Act, bias, explainability) that existing governance frameworks were not designed for.
- **The EA Repository** domain becomes more powerful with AI but also more critical — AI-generated insights are only as good as the data quality in the repository.
- **3 new capability candidates** emerge that are not covered by the current model: AI/ML Architecture, AI Governance & Ethics, and AI-Augmented EA Tooling.

---

## 2. Two Dimensions of AI Impact

### Dimension 1: AI as a Subject of Architecture

When an organisation implements AI, the Enterprise Architecture function must address:

| Concern | Description | Affected Capabilities |
|---------|-------------|----------------------|
| **AI/ML infrastructure** | GPU clusters, model training platforms, inference endpoints, vector databases, feature stores | Cap 16, 18 |
| **Data pipelines for AI** | Training data pipelines, feature engineering, data labelling, data versioning, synthetic data | Cap 13, 14, 15 |
| **Model lifecycle (MLOps/LLMOps)** | Model training, evaluation, deployment, monitoring, retraining, A/B testing | Cap 11, 12 |
| **AI application patterns** | RAG (Retrieval-Augmented Generation), agents, fine-tuning, prompt engineering, embeddings | Cap 11, 12 |
| **AI governance & ethics** | Bias detection, explainability, fairness, EU AI Act compliance, model risk management | Cap 27, 30, ARB |
| **AI security** | Prompt injection, data poisoning, model theft, adversarial attacks, PII in training data | Cap 17, 27 |
| **AI cost management** | GPU compute costs, API costs, token usage, model hosting costs (FinOps for AI) | Cap 23 |
| **Organisational change** | New roles (ML Engineer, AI Ethics Officer, Prompt Engineer), new skills, changed processes | Cap 22, 24, 28 |

### Dimension 2: AI as a Tool for the Architect

AI tools are transforming how architects perform their work:

| AI Capability | How It Helps Architects | Affected Capabilities |
|--------------|------------------------|----------------------|
| **Natural language processing** | Analyse strategy documents, extract requirements, summarise stakeholder interviews | Cap 1, 4, 7, 26 |
| **Automated discovery** | Scan codebases, APIs, infrastructure to auto-populate architecture repository | Cap 11, 12, 15, 20 |
| **Generative AI for documentation** | Generate architecture descriptions, decision records, compliance reports | Cap 5, 19, 25 |
| **Intelligent analysis** | Gap analysis, dependency mapping, impact assessment, roadmap optimisation | Cap 2, 3, 10, 30 |
| **Process mining** | Discover actual business processes from event logs | Cap 9 |
| **Predictive analytics** | Forecast technology obsolescence, capacity needs, project risks | Cap 6, 16, 23 |
| **Conversational AI** | Natural-language queries against the architecture repository ("show me all applications that process PII") | Cap 19, 21 |

---

## 3. Impact on Architecture Development – Common

### Capability 1: Architecture Vision Development

| Dimension | Impact | Detail |
|-----------|--------|--------|
| AI as Subject | **Medium** | AI strategy must be part of the architecture vision. Organisations need to articulate where AI fits in their future-state business and technology model. The vision must address whether AI is a strategic differentiator, an operational efficiency lever, or both. |
| AI as Tool | **High** | LLMs can synthesise business strategy documents, annual reports, and stakeholder interview transcripts to identify strategic themes and draft vision narratives. AI can also generate scenario analyses for different strategic directions. |

**Key changes needed:**
- Add "AI strategy alignment" as an explicit activity — every architecture vision should address the role of AI.
- Inputs should include AI maturity assessment and AI opportunity analysis.
- Outputs should include an AI positioning statement (where AI creates value in the target architecture).

---

### Capability 2: Architecture Roadmap Development

| Dimension | Impact | Detail |
|-----------|--------|--------|
| AI as Subject | **High** | AI initiatives must be sequenced in the roadmap with their unique dependencies: data readiness, model training cycles, ethical reviews, and regulatory compliance checks. AI projects often have longer and less predictable timelines than traditional IT projects. |
| AI as Tool | **Very High** | AI can automate gap analysis between current and target states, optimise initiative sequencing using multi-criteria algorithms (business value, risk, dependencies, resource constraints), and predict realistic timelines based on historical project data. |

**Key changes needed:**
- Roadmaps must account for AI-specific milestones: data readiness gates, model validation stages, ethical review checkpoints.
- Add AI readiness assessment as an input (data maturity, talent availability, infrastructure readiness).

---

### Capability 3: Transformation Planning

| Dimension | Impact | Detail |
|-----------|--------|--------|
| AI as Subject | **High** | AI transformations have unique characteristics: they are iterative (model training cycles), data-dependent (garbage in, garbage out), and require continuous operations (model monitoring, retraining). Traditional waterfall-style transformation planning doesn't apply well. |
| AI as Tool | **High** | AI can automate dependency analysis across project portfolios, predict risks based on historical patterns, and optimise work package sequencing. |

**Key changes needed:**
- Transformation plans for AI initiatives should follow iterative/experimental patterns rather than linear project plans.
- Include "AI experimentation phase" as a standard transition architecture stage.

---

### Capability 4: Architecture Requirements Management

| Dimension | Impact | Detail |
|-----------|--------|--------|
| AI as Subject | **High** | AI systems introduce new categories of requirements that architects haven't traditionally managed: model accuracy thresholds, explainability requirements, bias tolerance levels, training data requirements, inference latency SLAs, model drift thresholds, and regulatory requirements (EU AI Act risk classification). |
| AI as Tool | **High** | NLP can parse unstructured requirement documents, detect inconsistencies, identify gaps, and automatically trace requirements to architecture elements. |

**Key changes needed:**
- Add AI-specific requirement categories: performance (latency, throughput), fairness (bias metrics), explainability, data requirements, regulatory classification.
- Requirements templates should include "AI risk classification" for any AI-involving solution.

---

### Capability 5: Architecture View Creation

| Dimension | Impact | Detail |
|-----------|--------|--------|
| AI as Subject | **Medium** | New viewpoints are needed for AI: model lifecycle views, data lineage for training data, AI risk heat maps, AI component integration views. |
| AI as Tool | **Very High** | This is one of the most transformative applications. AI can auto-generate architecture views from repository data, create dynamic dashboards, personalise views for different stakeholder groups, and update views in real-time as the architecture changes. Natural language queries ("show me all applications that will be decommissioned in 2027") can generate views on demand. |

**Key changes needed:**
- Add AI-specific viewpoints: ML pipeline view, model deployment view, AI risk and compliance view, data lineage for AI view.
- Leverage AI tools to automate view generation and reduce the manual effort that currently limits this capability.

---

### Capability 6: New Technology Evaluation

| Dimension | Impact | Detail |
|-----------|--------|--------|
| AI as Subject | **Very High** | AI is the single most impactful emerging technology to evaluate. This includes: foundational models (GPT, Claude, Gemini, Llama), AI platforms (Azure AI, AWS SageMaker, Vertex AI), MLOps tools (MLflow, Kubeflow, Weights & Biases), vector databases (Pinecone, Weaviate, pgvector), AI agents and orchestration frameworks (LangChain, CrewAI), and domain-specific AI solutions. The evaluation criteria differ from traditional technology: accuracy, hallucination rates, bias, cost per inference, data privacy posture. |
| AI as Tool | **High** | AI can automate technology landscape scanning, aggregate vendor comparisons, predict technology maturity curves, and assist with proof-of-concept design. |

**Key changes needed:**
- Add AI-specific evaluation criteria: model accuracy, explainability, data privacy, vendor lock-in (open vs. proprietary models), total cost of ownership (training + inference + monitoring), regulatory compliance.
- Establish a technology radar specifically for AI/ML technologies, updated quarterly.
- Include responsible AI assessment as part of every AI technology evaluation.

---

## 4. Impact on Architecture Development – Business Architecture

### Capability 7: Strategic Value Driver Definition

| Dimension | Impact | Detail |
|-----------|--------|--------|
| AI as Subject | **High** | AI creates new value drivers that must be identified and articulated: operational efficiency through intelligent automation, revenue growth through AI-powered products and services, customer experience through personalisation, risk reduction through predictive analytics, and innovation speed through AI-augmented development. |
| AI as Tool | **Medium** | AI can analyse business performance data to identify hidden value drivers and correlate them with strategic outcomes. NLP can extract value driver themes from strategy documents and stakeholder interviews. |

**Key changes needed:**
- Explicitly include "AI-enabled value drivers" as a category in value driver analysis.
- Assess which existing value drivers can be amplified or transformed by AI.

---

### Capability 8: Capability Definition

| Dimension | Impact | Detail |
|-----------|--------|--------|
| AI as Subject | **High** | AI introduces new business capabilities that must be mapped: "Intelligent Document Processing", "Predictive Customer Analytics", "AI-Powered Fraud Detection", "Automated Content Generation", etc. These AI-augmented capabilities cut across traditional capability maps and require careful positioning. |
| AI as Tool | **Medium** | AI can assist with capability identification from industry reference models, automated capability-to-application mapping, and maturity assessment. |

**Key changes needed:**
- Business capability maps should explicitly identify AI-augmented capabilities (capabilities that are enhanced or enabled by AI).
- Add an "AI enablement" dimension to capability maturity assessments.

---

### Capability 9: Process Modelling

| Dimension | Impact | Detail |
|-----------|--------|--------|
| AI as Subject | **Very High** | AI fundamentally changes business processes: (1) Intelligent automation replaces or augments manual activities, (2) AI decision points replace rule-based decisions with probabilistic ones, (3) Human-in-the-loop patterns emerge where AI proposes and humans approve. Process models must evolve to represent AI actors, confidence thresholds, fallback paths, and human override mechanisms. |
| AI as Tool | **Very High** | Process mining tools (Celonis, UiPath Process Mining, Microsoft Process Advisor) use AI to discover actual business processes from system event logs. This transforms process modelling from a manual interview-based activity to a data-driven automated discovery. AI can also identify bottlenecks, suggest optimisations, and simulate process changes. |

**Key changes needed:**
- Process modelling notation should include AI-specific elements: AI decision points (with confidence thresholds), human-in-the-loop review steps, AI actor lanes, fallback/exception paths for AI failure.
- Leverage process mining as a standard input to process modelling.
- Add "AI automation opportunity assessment" as a standard task.

---

## 5. Impact on Architecture Development – Application Architecture

### Capability 10: Architecture Validation

| Dimension | Impact | Detail |
|-----------|--------|--------|
| AI as Subject | **High** | Validating AI-based architectures requires new criteria: Is the model governance adequate? Are training data pipelines reliable? Is there a retraining strategy? Are explainability requirements met? Is the AI risk classification correct (EU AI Act)? Traditional architecture validation checklists must be extended for AI. |
| AI as Tool | **High** | AI can automate compliance checking against architecture standards, detect patterns of architectural drift, and flag potential issues before they reach the ARB. Continuous validation becomes possible instead of periodic reviews. |

**Key changes needed:**
- Add AI-specific validation criteria: model governance, data pipeline reliability, explainability, bias testing, regulatory classification.
- Move towards continuous, AI-assisted validation rather than point-in-time reviews only.

---

### Capability 11: Application / Solution Architecture Modelling

| Dimension | Impact | Detail |
|-----------|--------|--------|
| AI as Subject | **Very High** | AI introduces entirely new application architecture patterns that must be modelled and governed: (1) **RAG architectures** — combining LLMs with vector databases and retrieval systems, (2) **AI agent architectures** — autonomous agents with tool use, memory, and planning, (3) **ML pipeline architectures** — training, evaluation, and serving pipelines, (4) **Hybrid AI architectures** — combining rule-based systems with ML models, (5) **AI-as-a-Service integrations** — consuming external AI APIs (OpenAI, Anthropic, Google) with fallback and cost management. |
| AI as Tool | **High** | AI can automate application landscape analysis from CMDB data, recommend architecture patterns based on requirements, generate architecture diagrams, and identify application modernisation opportunities. |

**Key changes needed:**
- Add AI application architecture patterns to the reference architecture library: RAG, AI agents, ML pipelines, model serving, AI gateway patterns.
- Include AI components in application landscape views: models, embeddings, vector stores, feature stores, model registries.
- Define standard AI integration patterns (AI gateway, model abstraction layer, prompt management).

---

### Capability 12: Integration Architecture Modelling

| Dimension | Impact | Detail |
|-----------|--------|--------|
| AI as Subject | **Very High** | AI systems create new integration challenges: (1) **Model serving APIs** — real-time inference endpoints with different SLA characteristics than traditional APIs (latency, throughput, cost-per-call), (2) **Training data pipelines** — high-volume data integration from multiple sources to training environments, (3) **Feature stores** — shared feature computation and serving infrastructure, (4) **AI orchestration** — coordinating multiple AI models and tools in agent workflows, (5) **Feedback loops** — capturing prediction results and human feedback for model improvement. |
| AI as Tool | **High** | AI can auto-discover integration points from API logs and traffic analysis, recommend integration patterns, generate interface specifications, and detect "spaghetti" integration anti-patterns. |

**Key changes needed:**
- Add AI-specific integration patterns: model serving (synchronous/asynchronous), feature store access, training data pipelines, feedback loops, AI gateway/router patterns.
- Include AI API management (rate limiting, cost tracking, model version routing) in integration architecture standards.

---

## 6. Impact on Architecture Development – Data Architecture

### Capability 13: Business Object Modelling

| Dimension | Impact | Detail |
|-----------|--------|--------|
| AI as Subject | **High** | AI introduces new business objects that must be modelled: "AI Model", "Training Dataset", "Feature", "Prediction", "Prompt Template", "Embedding", "Vector Index". These objects have relationships to traditional business objects (a "Customer Prediction" relates to "Customer" and "AI Model"). Additionally, AI may identify new business object patterns through data analysis that human analysts missed. |
| AI as Tool | **Medium** | NLP can extract business entities from documentation. AI can suggest business object attributes based on industry models and usage patterns. |

**Key changes needed:**
- Extend the business object model to include AI-specific entities: Model, Dataset, Feature, Prediction, Prompt, Embedding.
- Define relationships between AI objects and traditional business objects.

---

### Capability 14: Data Architecture Modelling

| Dimension | Impact | Detail |
|-----------|--------|--------|
| AI as Subject | **Very High** | AI demands fundamental extensions to data architecture: (1) **Vector databases** for embedding storage and similarity search, (2) **Feature stores** for computing, storing, and serving ML features, (3) **Data versioning** — training datasets must be versioned and reproducible, (4) **Data labelling infrastructure** — annotation tools, quality assurance, active learning, (5) **Synthetic data** generation and management, (6) **Unstructured data management** — images, audio, video, documents that feed AI models, (7) **Data lakehouse architectures** combining data lake flexibility with warehouse reliability for AI workloads. |
| AI as Tool | **Medium** | AI can optimise data model design, predict query performance, and suggest indexing strategies. |

**Key changes needed:**
- Add AI data architecture patterns: vector stores, feature stores, data versioning, embedding management.
- Data architecture must address unstructured data management at scale (not just structured/relational data).
- Include data lineage from source through feature engineering to model training as a first-class concern.

---

### Capability 15: Data Flow Modelling

| Dimension | Impact | Detail |
|-----------|--------|--------|
| AI as Subject | **Very High** | AI creates complex new data flows that must be modelled: (1) **Training pipelines** — data extraction → cleaning → feature engineering → model training → evaluation, (2) **Inference pipelines** — request → pre-processing → model inference → post-processing → response, (3) **Feedback loops** — prediction → human feedback → retraining data → model update, (4) **RAG pipelines** — query → embedding → vector search → context assembly → LLM → response, (5) **Data lineage for AI** — regulators (EU AI Act) require traceability from training data through model to predictions. |
| AI as Tool | **Very High** | AI-powered data lineage tools can automatically trace data flows across complex systems. Process mining techniques can discover undocumented data flows from system logs and API traffic. |

**Key changes needed:**
- Add AI-specific data flow patterns: training pipelines, inference pipelines, feedback loops, RAG data flows.
- Data lineage must extend to AI model training data (regulatory requirement under EU AI Act).
- Include data flow volume, latency, and cost characteristics for AI pipelines (AI data flows can be orders of magnitude larger than traditional data flows).

---

## 7. Impact on Architecture Development – Technology Architecture

### Capability 16: System Architecture Modelling

| Dimension | Impact | Detail |
|-----------|--------|--------|
| AI as Subject | **Very High** | AI demands new infrastructure components that must be designed and governed: (1) **GPU/TPU compute** — dedicated hardware for model training and inference, (2) **Model serving infrastructure** — scalable endpoints with auto-scaling, load balancing, and A/B testing, (3) **Vector database infrastructure** — for embedding storage and similarity search, (4) **ML platform infrastructure** — experiment tracking, model registry, feature store, pipeline orchestration, (5) **Edge AI** — deploying models on edge devices with constrained resources. AI workloads have fundamentally different compute profiles: bursty GPU-intensive training, latency-sensitive inference, high-bandwidth data movement. |
| AI as Tool | **High** | AI can optimise capacity planning, predict infrastructure bottlenecks, recommend sizing, and automate infrastructure-as-code generation. |

**Key changes needed:**
- Add AI infrastructure components to system architecture reference models: GPU clusters, model serving, vector databases, ML platforms, feature stores.
- Define sizing and capacity planning guidelines for AI workloads (training vs. inference vs. fine-tuning).
- Address AI-specific non-functional requirements: inference latency, throughput, model loading time, GPU utilisation.

---

### Capability 17: Network Architecture Modelling

| Dimension | Impact | Detail |
|-----------|--------|--------|
| AI as Subject | **High** | AI workloads create new network demands: (1) High-bandwidth data movement for training data pipelines, (2) Low-latency paths for real-time inference, (3) GPU-to-GPU communication for distributed training (InfiniBand, RDMA), (4) Network security for AI APIs (preventing prompt injection, data exfiltration), (5) Edge-to-cloud connectivity for edge AI inference with cloud training. |
| AI as Tool | **Medium** | AI can optimise network topology, predict capacity needs, detect anomalies, and assist with zero-trust architecture design. |

**Key changes needed:**
- Include AI-specific network requirements: high-bandwidth training data paths, low-latency inference paths, GPU interconnect design.
- Address AI API security in network architecture: rate limiting, content filtering, data loss prevention for AI interactions.

---

### Capability 18: Virtualization Architecture Modelling

| Dimension | Impact | Detail |
|-----------|--------|--------|
| AI as Subject | **Very High** | AI workloads require specialised virtualisation and orchestration: (1) **GPU virtualisation** — sharing GPU resources across workloads (NVIDIA MIG, vGPU), (2) **Kubernetes for ML** — GPU-aware scheduling, model serving operators (KServe, Seldon), (3) **Serverless AI** — on-demand inference without managing infrastructure (AWS Lambda + SageMaker, Azure Functions + OpenAI), (4) **Multi-cloud AI** — using different cloud providers for different AI services (training on one, inference on another), (5) **AI-specific auto-scaling** — scaling based on inference queue depth, not just CPU/memory. |
| AI as Tool | **High** | AI-driven resource optimisation, workload classification, right-sizing, and cost management (FinOps for AI). |

**Key changes needed:**
- Add GPU virtualisation and scheduling to virtualisation architecture standards.
- Define container orchestration patterns for AI workloads: model serving, training jobs, batch inference.
- Address AI FinOps: GPU utilisation monitoring, inference cost tracking, training cost optimisation.

---

## 8. Impact on Architecture Repository

### Capability 19: Dashboards, Views, Reports

| Dimension | Impact | Detail |
|-----------|--------|--------|
| AI as Subject | **Medium** | New dashboards needed: AI model inventory, AI risk register, AI cost tracking, model performance monitoring, data quality for AI pipelines. |
| AI as Tool | **Very High** | This is perhaps the highest-impact area for AI tooling: (1) **Natural language queries** — ask questions of the architecture repository in plain language, (2) **AI-generated insights** — automated identification of trends, anomalies, and recommendations, (3) **Dynamic view generation** — views created on-demand from repository data, (4) **Predictive analytics** — forecasting technology obsolescence, capacity needs, transformation progress, (5) **Intelligent alerting** — proactive notification of architecture issues. |

**Key changes needed:**
- Add AI-specific dashboards: model inventory, AI risk and compliance, AI infrastructure utilisation, AI cost tracking.
- Invest in AI-powered query and visualisation capabilities for the EA repository.

---

### Capability 20: Data Gathering & Data Quality

| Dimension | Impact | Detail |
|-----------|--------|--------|
| AI as Subject | **High** | AI systems in the enterprise create new data to capture: model registries, experiment tracking data, AI performance metrics, AI risk assessments. The repository must evolve to include AI-related entities. |
| AI as Tool | **Very High** | AI transforms data gathering from manual to automated: (1) **Automated discovery** — scan infrastructure, APIs, code repositories to auto-populate the architecture repository, (2) **Intelligent reconciliation** — detect duplicates, inconsistencies, and stale data, (3) **Predictive data quality** — identify data quality degradation before it impacts decisions, (4) **Smart data enrichment** — automatically augment records with derived information. |

**Key changes needed:**
- Extend the EA data model to include AI entities: models, datasets, features, AI services, AI infrastructure components.
- Leverage AI for automated data gathering and quality management.

---

### Capability 21: Repository Support & Maintenance

| Dimension | Impact | Detail |
|-----------|--------|--------|
| AI as Subject | **Medium** | The meta-model must evolve to accommodate AI objects and relationships. |
| AI as Tool | **Medium–High** | AI chatbots can provide user support, answer common queries about the repository. AI can optimise the meta-model based on usage patterns, predict maintenance needs, and automate routine administration tasks. |

**Key changes needed:**
- Evolve the repository meta-model to include AI-specific entity types and relationships.
- Consider deploying an AI assistant for repository users (conversational interface to EA data).

---

## 9. Impact on Architecture Management

### Capability 22: Organisation Development

| Dimension | Impact | Detail |
|-----------|--------|--------|
| AI as Subject | **Very High** | AI requires new roles and skills in the EA function: (1) **AI Architect** — specialising in AI/ML architecture patterns, MLOps, and AI integration, (2) **Data/AI Ethics Lead** — ensuring responsible AI practices, (3) **MLOps Engineer** — operationalising AI models (may sit outside EA but needs EA governance), (4) Existing architects need AI literacy: understanding AI capabilities, limitations, architecture patterns, and governance needs. The EA organisation model must decide where AI architecture sits: as a cross-cutting concern, a new domain, or within existing domains. |
| AI as Tool | **Low** | Limited direct impact from AI tooling on organisational design itself. |

**Key changes needed:**
- Define an "AI Architect" role with competencies: ML fundamentals, AI architecture patterns, MLOps, AI governance, responsible AI.
- Upskill existing architects on AI literacy (everyone doesn't need to be an AI expert, but everyone needs to understand AI at a level sufficient for their architecture domain).
- Decide on the organisational placement of AI architecture capability.

---

### Capability 23: EA Performance Management

| Dimension | Impact | Detail |
|-----------|--------|--------|
| AI as Subject | **High** | AI initiatives must be tracked and measured: AI adoption rates, AI model performance in production, AI ROI, AI risk metrics, and AI cost efficiency. Traditional EA KPIs don't capture the value and risk of AI. |
| AI as Tool | **High** | AI can automate KPI collection, generate performance insights, detect anomalies in EA effectiveness metrics, and benchmark against industry standards. |

**Key changes needed:**
- Add AI-specific KPIs: number of AI models in production, AI initiative success rate, AI cost per business outcome, model performance degradation, AI risk incidents.
- Include "AI value realisation" as a performance dimension.

---

### Capability 24: EA Process Development

| Dimension | Impact | Detail |
|-----------|--------|--------|
| AI as Subject | **High** | New EA processes are needed for AI: AI architecture review process, model governance process, AI risk assessment process, AI ethical review process. Existing processes (e.g., solution architecture review) must be extended to handle AI components. |
| AI as Tool | **Medium** | Process mining can discover actual EA process flows. AI can identify bottlenecks and suggest process improvements. |

**Key changes needed:**
- Define new EA processes: AI Architecture Review, AI Risk Assessment, AI Model Governance Review.
- Extend existing processes (solution design review, compliance evaluation) to include AI-specific checkpoints.

---

### Capability 25: EA Knowledge Management

| Dimension | Impact | Detail |
|-----------|--------|--------|
| AI as Subject | **Medium** | AI-specific knowledge must be captured: AI architecture patterns, AI decision records, AI lessons learned, AI vendor evaluations, AI risk assessments. |
| AI as Tool | **Very High** | AI transforms knowledge management: (1) **Semantic search** — find relevant architecture knowledge using meaning, not just keywords, (2) **Knowledge synthesis** — automatically summarise decisions, patterns, and lessons learned, (3) **Proactive knowledge recommendation** — suggest relevant patterns and past decisions to architects working on similar problems, (4) **Knowledge gap identification** — detect undocumented areas and missing knowledge, (5) **Automated knowledge extraction** — capture knowledge from architecture reviews, decision meetings, and documentation. |

**Key changes needed:**
- Build an AI-specific knowledge base: patterns, anti-patterns, vendor assessments, regulatory guidance.
- Deploy AI-powered search and recommendation across the EA knowledge base.

---

### Capability 26: Stakeholder Management

| Dimension | Impact | Detail |
|-----------|--------|--------|
| AI as Subject | **High** | AI implementation brings new stakeholders and changes existing stakeholder concerns: (1) **Chief AI Officer / Head of AI** — new stakeholder for EA, (2) **Data Science teams** — need AI infrastructure and governance, (3) **Legal / Compliance** — concerned about AI regulatory compliance (EU AI Act), (4) **Ethics boards** — concerned about responsible AI, (5) Business stakeholders have heightened AI expectations and anxieties that architects must manage. |
| AI as Tool | **Medium** | AI can analyse stakeholder sentiment, map influence networks, and personalise engagement strategies. |

**Key changes needed:**
- Update stakeholder maps to include AI-related stakeholders (AI/ML teams, ethics boards, regulators).
- Develop AI-specific communication strategies for different stakeholder groups (board-level AI risk, technical AI architecture, business AI opportunities).

---

## 10. Impact on Architecture Governance, Communication & Change

### Capability 27: Standards, Policies, Principles, Guidelines

| Dimension | Impact | Detail |
|-----------|--------|--------|
| AI as Subject | **Very High** | This is one of the most critically impacted capabilities. AI requires entirely new categories of standards, policies, and principles: |

**New AI-specific standards and policies needed:**

| Category | Examples |
|----------|---------|
| **AI Architecture Principles** | "Use AI where it adds measurable value, not for its own sake." "Design for human oversight of high-risk AI decisions." "Ensure all AI models are explainable to the degree required by their risk classification." |
| **AI Technology Standards** | Approved AI platforms and services. Model serving standards. Embedding and vector database standards. AI API gateway requirements. |
| **AI Data Policies** | Training data quality requirements. PII in training data. Data retention for model reproducibility. Synthetic data usage policies. |
| **AI Governance Policies** | Model risk classification framework (aligned with EU AI Act). Required documentation per AI system. Model validation and testing requirements. Bias testing requirements. |
| **AI Security Policies** | Prompt injection prevention. Model access controls. AI output filtering. Data loss prevention for AI interactions. |
| **Responsible AI Guidelines** | Fairness and bias testing procedures. Transparency and explainability guidelines. Human oversight requirements. AI impact assessments. |

| AI as Tool | **Medium** | AI can help identify relevant industry standards, detect policy gaps, and automate compliance checking against standards. |

**Key changes needed:**
- Develop a comprehensive AI Standards & Policy framework covering architecture, data, governance, security, and responsible AI.
- Integrate AI standards into existing architecture review and approval processes.

---

### Capability 28: Architecture Training

| Dimension | Impact | Detail |
|-----------|--------|--------|
| AI as Subject | **Very High** | Massive upskilling needed across the EA function: |

**AI training needs by role:**

| Role | AI Training Needed |
|------|-------------------|
| Enterprise Architect | AI strategy, AI architecture patterns overview, AI governance, AI impact on EA |
| Business Architect | AI-augmented business capabilities, AI in process automation, AI value drivers |
| Application Architect | AI application patterns (RAG, agents, ML pipelines), MLOps, AI integration patterns |
| Data Architect | Data for AI (feature stores, vector databases, data versioning), AI data governance |
| Technology Architect | AI infrastructure (GPU, model serving), AI FinOps, AI-specific non-functional requirements |
| All architects | AI literacy, responsible AI awareness, EU AI Act basics, AI risk management |

| AI as Tool | **Medium** | AI can personalise learning paths, generate training content, assess skill levels, and create interactive learning experiences. |

**Key changes needed:**
- Develop an AI literacy training programme for all architects.
- Create role-specific AI training paths (see table above).
- Include "AI governance awareness" in every architect's onboarding.

---

### Capability 29: Communication & Change Management

| Dimension | Impact | Detail |
|-----------|--------|--------|
| AI as Subject | **Very High** | AI implementation requires significant change management: (1) Managing fears and expectations around AI ("will AI replace my job?"), (2) Communicating AI strategy and governance decisions, (3) Driving adoption of AI-augmented EA tools and processes, (4) Managing the cultural shift towards data-driven, AI-assisted architecture work. |
| AI as Tool | **High** | AI can generate personalised communications, analyse stakeholder sentiment, predict adoption resistance, and optimise communication timing and channels. |

**Key changes needed:**
- Develop an AI-specific communication strategy addressing both opportunities and risks.
- Create change management plans for AI-augmented EA tools and processes.
- Address AI anxiety proactively with transparent communication about how AI augments (not replaces) architect work.

---

### Capability 30: Architecture Compliance Evaluation

| Dimension | Impact | Detail |
|-----------|--------|--------|
| AI as Subject | **Very High** | AI systems require new compliance evaluation criteria that don't exist in traditional architecture compliance: (1) **EU AI Act compliance** — risk classification, documentation, transparency, human oversight, (2) **Model governance compliance** — is the model registered, validated, monitored, versioned? (3) **Data compliance** — is training data properly sourced, licensed, free of PII violations? (4) **Bias and fairness** — has the model been tested for bias? (5) **Explainability** — can the model's decisions be explained to affected individuals? (6) **Security** — is the model protected against adversarial attacks, prompt injection, data poisoning? |
| AI as Tool | **Very High** | AI can automate compliance checking, continuously monitor architecture compliance (not just at review gates), predict compliance risks before they materialise, and generate compliance reports. |

**Key changes needed:**
- Extend compliance evaluation criteria with AI-specific checks (see list above).
- Implement continuous AI compliance monitoring (not just point-in-time reviews).
- Develop an AI risk classification framework aligned with EU AI Act requirements.
- Add AI-specific waiver processes (e.g., temporary waiver for experimental AI with limited scope).

---

### Architecture Review Board (ARB)

| Dimension | Impact | Detail |
|-----------|--------|--------|
| AI as Subject | **Very High** | The ARB must evolve to handle AI-related decisions: (1) AI technology selection and platform decisions, (2) AI model deployment approvals for high-risk use cases, (3) AI ethical concerns and responsible AI decisions, (4) AI architecture pattern approvals, (5) AI risk acceptance for waiver requests. This may require adding AI expertise to the ARB composition (AI Architect, Data Scientist representative, or AI Ethics representative). |
| AI as Tool | **Medium** | AI can help prepare ARB materials: automated impact assessments, compliance summaries, risk analyses. AI can also track decision consistency and flag potential conflicts with previous decisions. |

**Key changes needed:**
- Add AI expertise to ARB composition (AI Architect or equivalent).
- Define ARB review triggers for AI: any high-risk AI deployment, any new AI platform adoption, any AI use case involving personal data.
- Create an AI-specific review checklist for ARB decision-making.

---

## 11. New Capabilities and Cross-Cutting Concerns

The current 30-capability model was designed before AI became a dominant force in enterprise technology. Three new capabilities are recommended to address gaps that cannot be adequately covered by extending existing capabilities.

### Proposed Capability A: AI/ML Architecture (Domain: Application Architecture or new "AI Architecture" sub-domain)

**Rationale:** AI systems have unique architecture patterns (RAG, agents, ML pipelines, model serving) that are sufficiently complex and distinct to warrant a dedicated capability. No existing capability adequately covers the full scope of designing, standardising, and governing AI application architectures.

**Scope:**
- Define AI architecture reference models and patterns (RAG, AI agents, ML pipelines, real-time inference, batch inference, hybrid AI)
- Establish AI integration patterns (AI gateway, model abstraction layer, feature store access)
- Define AI infrastructure reference architecture (GPU compute, model serving, vector databases)
- Manage the AI model lifecycle architecture (MLOps/LLMOps): training → evaluation → deployment → monitoring → retraining
- Maintain an AI component catalogue: approved models, platforms, and services

**Key Activities:**
1. Define AI architecture principles, patterns, and reference architectures.
2. Establish the standard AI technology stack (platforms, frameworks, tools).
3. Design AI integration patterns and AI gateway architecture.
4. Define MLOps/LLMOps architecture for model lifecycle management.
5. Maintain an AI model and component registry.
6. Evaluate and evolve AI architecture as technology advances.

**Relationship to existing capabilities:**
- Uses inputs from Cap 6 (New Technology Evaluation) for AI technology assessments
- Provides AI-specific patterns to Cap 11 (Application Architecture) and Cap 12 (Integration Architecture)
- Requires data architecture support from Cap 14 and Cap 15
- Is governed by Cap 27 (Standards) and Cap 30 (Compliance)

---

### Proposed Capability B: AI Governance & Ethics (Domain: Architecture Governance, Communication & Change)

**Rationale:** AI governance is sufficiently complex and distinct from traditional architecture governance to warrant a dedicated capability. It spans regulatory compliance (EU AI Act), ethical concerns (bias, fairness, transparency), model risk management, and responsible AI practices. Trying to embed all of this into Cap 27 or Cap 30 would overload those capabilities.

**Scope:**
- AI risk classification and management (aligned with EU AI Act)
- Responsible AI principles and practices (fairness, transparency, accountability, safety)
- AI model governance (registration, validation, monitoring, decommissioning)
- AI regulatory compliance (EU AI Act, sector-specific AI regulations)
- AI ethical review process and escalation
- AI incident management (model failures, bias incidents, security breaches)

**Key Activities:**
1. Define AI risk classification framework (aligning with EU AI Act risk tiers: unacceptable, high, limited, minimal).
2. Establish responsible AI principles and operationalise them into review processes.
3. Implement AI model governance lifecycle (registration → validation → deployment approval → monitoring → retirement).
4. Conduct AI ethical reviews for high-risk and sensitive use cases.
5. Monitor AI regulatory landscape and ensure compliance readiness.
6. Manage AI incidents and lessons learned.

**Relationship to existing capabilities:**
- Works closely with the ARB for AI decision escalation
- Provides AI-specific compliance criteria to Cap 30 (Architecture Compliance Evaluation)
- Provides AI governance requirements to Cap 27 (Standards, Policies, Principles, Guidelines)
- Informs Cap 28 (Architecture Training) on responsible AI training needs

---

### Proposed Capability C: AI-Augmented EA Tooling (Domain: Architecture Repository or Architecture Management)

**Rationale:** The transformation of EA practice through AI tools is so significant that it warrants a dedicated capability to manage the selection, deployment, and governance of AI-powered EA tools.

**Scope:**
- Evaluate and select AI-powered EA tools (AI-assisted modelling, automated discovery, natural language queries)
- Define how AI tools integrate with existing EA repository and processes
- Establish quality assurance for AI-generated architecture artefacts
- Manage the transition from manual to AI-augmented EA processes
- Track effectiveness and ROI of AI-augmented EA capabilities

**Note:** This capability could alternatively be embedded into Cap 21 (Repository Support & Maintenance) and Cap 24 (EA Process Development) rather than being a standalone capability. The decision depends on the organisation's maturity and the extent of AI tool adoption.

---

### Cross-Cutting AI Concerns

Beyond new capabilities, AI introduces cross-cutting concerns that should be embedded into multiple existing capabilities:

| Cross-Cutting Concern | Description | Capabilities to Embed In |
|----------------------|-------------|--------------------------|
| **AI Literacy** | All architects need baseline AI understanding | Cap 22, 28 |
| **AI Security** | Prompt injection, model theft, adversarial attacks, data poisoning | Cap 17, 27, 30 |
| **AI FinOps** | Cost management for AI (GPU, API calls, model hosting) | Cap 16, 18, 23 |
| **AI Data Quality** | Training data quality, bias in data, data representativeness | Cap 14, 15, 20 |
| **AI Regulatory Compliance** | EU AI Act, sector-specific regulations, AI transparency | Cap 27, 30, ARB |
| **Human-in-the-Loop Design** | Ensuring appropriate human oversight of AI decisions | Cap 9, 11, 27 |

---

## 12. AI Maturity Model for EA

The following maturity model helps organisations assess how well their EA function has adapted to AI:

### Level 1: AI-Unaware
- EA function operates without considering AI implications.
- No AI-specific architecture patterns, standards, or governance.
- AI projects happen outside EA oversight.
- AI is not on the technology radar.

### Level 2: AI-Aware
- EA recognises AI as a relevant technology domain.
- Cap 6 (New Technology Evaluation) has assessed initial AI platforms.
- Basic AI principles added to Cap 27 (Standards).
- AI is discussed in architecture vision but not yet operationalised.
- No AI-specific architecture patterns or governance.

### Level 3: AI-Integrated
- AI architecture patterns are defined and documented (Cap 11, 12).
- AI-specific standards, policies and guidelines are in place (Cap 27).
- AI compliance criteria are integrated into architecture reviews (Cap 30).
- ARB reviews AI-related decisions with AI expertise.
- Data architecture addresses AI needs (vector stores, feature stores) (Cap 14).
- Architects have baseline AI literacy (Cap 28).
- AI governance process exists (new capability or extension of existing).

### Level 4: AI-Augmented EA Practice
- EA tools leverage AI for automated discovery, view generation, and compliance checking.
- Architecture repository is AI-queryable (natural language) (Cap 19, 21).
- Process mining informs process modelling (Cap 9).
- Roadmap optimisation uses AI analysis (Cap 2).
- AI-specific KPIs are tracked (Cap 23).
- Continuous compliance monitoring uses AI (Cap 30).

### Level 5: AI-Native EA
- AI is seamlessly embedded in all EA processes and tools.
- Architecture decisions are AI-assisted (humans decide, AI analyses and recommends).
- Predictive architecture — AI identifies emerging issues before they materialise.
- Self-maintaining repository — AI keeps architecture data current through continuous discovery.
- AI governance is mature, proactive, and embedded in organisational culture.
- EA function is a leader in responsible AI adoption across the organisation.

---

## 13. Implementation Roadmap

### Phase 1: Foundation (0–6 months)

**Goal:** Establish AI awareness and basic governance.

| Action | Capability | Priority |
|--------|-----------|----------|
| Add AI to the technology radar and conduct initial AI technology evaluation | Cap 6 | High |
| Define initial AI architecture principles (5–10 core principles) | Cap 27 | High |
| Update stakeholder maps to include AI-related stakeholders | Cap 26 | High |
| Begin AI literacy training for all architects | Cap 28 | High |
| Include AI in the architecture vision and strategy | Cap 1 | Medium |
| Extend the repository meta-model to include AI entities | Cap 21 | Medium |

### Phase 2: Governance & Patterns (6–12 months)

**Goal:** Establish AI governance and architecture patterns.

| Action | Capability | Priority |
|--------|-----------|----------|
| Define AI architecture reference patterns (RAG, ML pipeline, agents, model serving) | Cap 11, 12 | High |
| Establish AI governance process (risk classification, model governance lifecycle) | New/Cap 30 | High |
| Add AI compliance criteria to architecture reviews | Cap 30, ARB | High |
| Add AI expertise to ARB composition | ARB | High |
| Define AI data architecture patterns (vector stores, feature stores, data versioning) | Cap 14, 15 | Medium |
| Create AI-specific dashboards (model inventory, AI risk register) | Cap 19 | Medium |

### Phase 3: AI-Augmented Practice (12–24 months)

**Goal:** Deploy AI tools to enhance EA practice itself.

| Action | Capability | Priority |
|--------|-----------|----------|
| Deploy AI-powered automated discovery for architecture repository | Cap 20 | High |
| Implement natural-language queries on architecture data | Cap 19, 21 | Medium |
| Deploy process mining for automated process discovery | Cap 9 | Medium |
| Implement AI-assisted compliance checking | Cap 30 | Medium |
| Deploy AI-powered architecture view generation | Cap 5 | Medium |
| Implement AI-driven roadmap optimisation | Cap 2 | Low |

### Phase 4: Maturity & Optimisation (24+ months)

**Goal:** Achieve AI-native EA practice and continuously improve.

| Action | Capability | Priority |
|--------|-----------|----------|
| Implement continuous compliance monitoring with AI | Cap 30 | Medium |
| Deploy predictive analytics for architecture management | Cap 23 | Medium |
| Achieve self-maintaining repository through continuous AI discovery | Cap 20, 21 | Medium |
| Embed AI governance into organisational culture | Cap 29 | Medium |
| Continuously evolve AI architecture patterns as technology matures | Cap 11, 12 | Ongoing |

---

## 14. Risks and Guardrails

### Risk 1: Over-reliance on AI-Generated Architecture

**Risk:** Architects accept AI-generated analysis, views, and recommendations without critical review, leading to errors in architecture decisions.

**Guardrail:** Establish a "human-in-the-loop" principle — all AI-generated architecture artefacts must be reviewed and validated by a qualified architect before they are used in decision-making. AI assists, humans decide.

### Risk 2: AI Governance Theatre

**Risk:** AI governance is implemented as a checklist exercise without genuine risk management, creating a false sense of compliance.

**Guardrail:** Make AI governance outcome-based, not process-based. Measure actual model fairness, actual explainability, actual monitoring effectiveness — not just whether forms were filled in.

### Risk 3: Shadow AI

**Risk:** Business units adopt AI solutions outside EA governance, creating unmanaged risk, data privacy violations, and architectural fragmentation.

**Guardrail:** Make AI governance easy and fast (lightweight review for low-risk AI, thorough review for high-risk). If governance is too slow, people will route around it. Use Cap 30 (Compliance Evaluation) to detect shadow AI through infrastructure monitoring and cost analysis.

### Risk 4: AI Skills Gap

**Risk:** The EA function lacks the AI expertise to effectively govern and design AI architectures, leading to either overly restrictive or ineffective governance.

**Guardrail:** Invest in training (Cap 28) and hiring (Cap 22). In the short term, partner with data science and ML engineering teams to bridge the knowledge gap.

### Risk 5: AI Tool Vendor Lock-in

**Risk:** Deep adoption of a single AI platform (e.g., a single LLM provider) creates strategic dependency.

**Guardrail:** Define AI abstraction layers in the architecture (AI gateway, model-agnostic interfaces). Include vendor lock-in risk assessment in Cap 6 (New Technology Evaluation) criteria.

### Risk 6: Data Quality Undermining AI

**Risk:** Poor data quality in the architecture repository leads to unreliable AI-generated insights and recommendations.

**Guardrail:** Strengthen Cap 20 (Data Gathering & Data Quality) as a prerequisite for AI tooling. AI-powered repository features should only be deployed after data quality reaches defined thresholds.

---

## 15. Recommendations

### For the EA Capability Model

| # | Recommendation | Priority | Effort |
|---|---------------|----------|--------|
| R1 | Add "AI/ML Architecture" as a new capability (or sub-capability of Application Architecture) | High | Medium |
| R2 | Add "AI Governance & Ethics" as a new capability in the Governance domain | High | Medium |
| R3 | Extend Cap 27 with AI-specific standards, policies, and principles | High | Low |
| R4 | Extend Cap 30 with AI-specific compliance criteria (EU AI Act, model governance) | High | Low |
| R5 | Add AI Architect role to Cap 22 (Organisation Development) and to ARB composition | High | Low |
| R6 | Extend Cap 28 with AI literacy training for all architects | High | Low |
| R7 | Extend Cap 14 and Cap 15 with AI data architecture patterns (vector stores, feature stores, data versioning) | Medium | Low |
| R8 | Extend Cap 11 and Cap 12 with AI application and integration patterns | Medium | Low |
| R9 | Add AI-specific KPIs to Cap 23 (EA Performance Management) | Medium | Low |
| R10 | Extend Cap 16 and Cap 18 with AI infrastructure patterns (GPU, model serving) | Medium | Low |
| R11 | Add AI-specific viewpoints to Cap 5 (Architecture View Creation) | Medium | Low |
| R12 | Extend Cap 6 with AI-specific evaluation criteria | Medium | Low |
| R13 | Develop AI maturity model for EA (see Section 12) | Medium | Medium |
| R14 | Consider AI-Augmented EA Tooling as a capability or embed in Cap 21 and Cap 24 | Low | Medium |
| R15 | Add cross-cutting AI concerns (security, FinOps, data quality, human-in-the-loop) to relevant capabilities | Low | Low |

### For EA Practice

| # | Recommendation | Priority |
|---|---------------|----------|
| P1 | Start with AI governance — don't wait until AI is everywhere to establish guardrails | High |
| P2 | Train architects on AI literacy before expecting them to govern AI | High |
| P3 | Partner with data science/ML teams — EA should govern AI, not do AI | High |
| P4 | Use AI tools for EA work itself — "eat your own cooking" builds credibility | Medium |
| P5 | Keep AI governance lightweight for low-risk AI — reserve heavy governance for high-risk use cases | Medium |
| P6 | Track AI as a technology domain in the EA capability maturity assessment | Medium |

---

## Appendix A: Impact Heat Map

**Capability-by-capability impact rating (1 = Low, 5 = Very High)**

| # | Capability | AI as Subject | AI as Tool | Combined |
|---|-----------|:---:|:---:|:---:|
| 1 | Architecture Vision Development | 3 | 4 | 4 |
| 2 | Architecture Roadmap Development | 4 | 5 | 5 |
| 3 | Transformation Planning | 4 | 4 | 4 |
| 4 | Architecture Requirements Management | 4 | 4 | 4 |
| 5 | Architecture View Creation | 3 | 5 | 5 |
| 6 | New Technology Evaluation | 5 | 4 | 5 |
| 7 | Strategic Value Driver Definition | 4 | 3 | 4 |
| 8 | Capability Definition | 4 | 3 | 4 |
| 9 | Process Modelling | 5 | 5 | 5 |
| 10 | Architecture Validation | 4 | 4 | 4 |
| 11 | Application / Solution Architecture Modelling | 5 | 4 | 5 |
| 12 | Integration Architecture Modelling | 5 | 4 | 5 |
| 13 | Business Object Modelling | 4 | 3 | 4 |
| 14 | Data Architecture Modelling | 5 | 3 | 5 |
| 15 | Data Flow Modelling | 5 | 5 | 5 |
| 16 | System Architecture Modelling | 5 | 4 | 5 |
| 17 | Network Architecture Modelling | 4 | 3 | 4 |
| 18 | Virtualization Architecture Modelling | 5 | 4 | 5 |
| 19 | Dashboards, Views, Reports | 3 | 5 | 5 |
| 20 | Data Gathering & Data Quality | 4 | 5 | 5 |
| 21 | Repository Support & Maintenance | 3 | 4 | 4 |
| 22 | Organisation Development | 5 | 2 | 4 |
| 23 | EA Performance Management | 4 | 4 | 4 |
| 24 | EA Process Development | 4 | 3 | 4 |
| 25 | EA Knowledge Management | 3 | 5 | 5 |
| 26 | Stakeholder Management | 4 | 3 | 4 |
| 27 | Standards, Policies, Principles, Guidelines | 5 | 3 | 5 |
| 28 | Architecture Training | 5 | 3 | 5 |
| 29 | Communication & Change Management | 5 | 4 | 5 |
| 30 | Architecture Compliance Evaluation | 5 | 5 | 5 |
| — | Architecture Review Board (ARB) | 5 | 3 | 5 |

**Summary:** 16 of 31 capabilities (52%) have a combined impact rating of 5 (Very High). No capability is unaffected.

---

## Appendix B: Key References

- TOGAF Series Guide: Integrating AI into Enterprise Architecture (The Open Group, 2024)
- Gartner: "How to Adapt Your Enterprise Architecture for AI" (2024/2025)
- EU AI Act — Regulation (EU) 2024/1689 (Official Journal of the European Union)
- Google Cloud Architecture Framework: AI and ML Architecture
- AWS Well-Architected Framework: Machine Learning Lens
- Microsoft Azure AI Architecture Guide
- MLOps: Continuous Delivery and Automation Pipelines in Machine Learning (Google, 2020)
- Responsible AI Practices (Google, Microsoft, Anthropic)
- DAMA-DMBOK 2nd Edition: Data Management for AI
- Forrester: "The State of Enterprise Architecture" (2025)

---

*This research document was produced through deep analysis of the EA Capability Model against current AI technology trends, regulatory developments (EU AI Act), industry frameworks (TOGAF, Gartner, Forrester), and cloud provider architecture guidance (AWS, Azure, GCP).*
