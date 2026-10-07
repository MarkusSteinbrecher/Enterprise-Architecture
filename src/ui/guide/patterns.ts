import type { ElementType, RelationshipType } from '@/model'
import type { Citation } from './sources'

/**
 * "How we model in Archipelago" (#149): cookbook-style patterns, each with the
 * relationships it uses spelled out as source → type → target.
 *
 * The steps are data rather than prose so `guide.test.tsx` can hold every one
 * of them to the validity matrix: a pattern that recommends a relationship the
 * connect menu would refuse is a bug in the guide.
 */

export interface PatternStep {
  readonly source: ElementType
  readonly type: RelationshipType
  readonly target: ElementType
  /** The step as a sentence, with example names. */
  readonly reads: string
}

export interface Pattern {
  /** Anchor on the guide page: `/guide#pattern-<id>`. */
  readonly id: string
  readonly title: string
  readonly intro: string
  readonly steps: readonly PatternStep[]
  /** Advice that is not a relationship: Archipelago's own guidance. */
  readonly notes: readonly string[]
  /**
   * Where the steps come from (#153). A Cookbook citation names the figures
   * that show them; a step that takes another route than the figure (a direct
   * line where the Cookbook goes through a resource, say) makes the pattern
   * "adapted from" the source, which is how the guide words it.
   */
  readonly sources: readonly Citation[]
}

export const PATTERNS: readonly Pattern[] = [
  {
    id: 'capability-map',
    title: 'Capability map',
    intro:
      'A capability map shows what the enterprise does, independent of how it is organised today. It is usually the first thing to build, because applications, projects and costs can all be hung on it.',
    steps: [
      {
        source: 'Capability',
        type: 'Composition',
        target: 'Capability',
        reads: 'Claims Management is composed of Claims Intake and Claims Settlement.',
      },
      {
        source: 'ApplicationComponent',
        type: 'Realization',
        target: 'Capability',
        reads: 'Claims System realizes Claims Settlement.',
      },
      {
        source: 'BusinessProcess',
        type: 'Realization',
        target: 'Capability',
        reads: 'Handle Claim realizes Claims Settlement.',
      },
      {
        source: 'Resource',
        type: 'Assignment',
        target: 'Capability',
        reads: 'Claims expertise is assigned to Claims Settlement.',
      },
      {
        source: 'Capability',
        type: 'Serving',
        target: 'ValueStream',
        reads: 'Claims Settlement serves the value stream Settle a claim.',
      },
    ],
    notes: [
      'Name capabilities with nouns ("Claims Management"), processes with verbs ("Handle Claim"). A capability says what; a process says how.',
      'Two or three levels deep is enough for most maps. Deeper levels tend to turn into processes.',
    ],
    sources: [
      { work: 'cookbook', at: '2.2.4 Strategy & Capability View, Figure 10' },
      { work: 'cookbook', at: '8.2.9 Anatomy of a Business Capability, Figure 89' },
    ],
  },
  {
    id: 'application-landscape',
    title: 'Application landscape',
    intro:
      'The application landscape is the inventory most teams start from: which systems exist, what they offer, what data they hold and how they talk to each other.',
    steps: [
      {
        source: 'ApplicationComponent',
        type: 'Composition',
        target: 'ApplicationInterface',
        reads: 'Claims System is composed of Claims REST API.',
      },
      {
        source: 'ApplicationComponent',
        type: 'Realization',
        target: 'ApplicationService',
        reads: 'CRM realizes Customer lookup.',
      },
      {
        source: 'ApplicationInterface',
        type: 'Assignment',
        target: 'ApplicationService',
        reads: 'CRM API is assigned to Customer lookup: that is where the service is offered.',
      },
      {
        source: 'ApplicationService',
        type: 'Serving',
        target: 'ApplicationComponent',
        reads: 'Customer lookup serves Claims System.',
      },
      {
        source: 'ApplicationComponent',
        type: 'Flow',
        target: 'ApplicationComponent',
        reads: 'Claims System flows to Payments System (payment orders).',
      },
      {
        source: 'ApplicationComponent',
        type: 'Access',
        target: 'DataObject',
        reads: 'Claims System writes Claim record.',
      },
      {
        source: 'DataObject',
        type: 'Realization',
        target: 'BusinessObject',
        reads: 'Claim record realizes the business object Claim.',
      },
    ],
    notes: [
      'Model a system as one Application Component until a question needs its parts. Finer components are worth it only where they are replaced or owned separately.',
      'Prefer Serving through an Application Service over a direct component-to-component line when you want to say what is used, not only that something is.',
    ],
    sources: [
      { work: 'cookbook', at: '2.9.1 Application Design Pattern (Basic Model), Figures 37 and 38' },
      { work: 'cookbook', at: '2.4.3 Application Interaction (Co-operation) View, Figure 29' },
      { work: 'cookbook', at: '2.3 Layered View, Figure 17' },
    ],
  },
  {
    id: 'business-support',
    title: 'How applications support the business',
    intro:
      'This is the link most EA questions turn on: which processes stop if a system fails, and which systems a change in the business touches.',
    steps: [
      {
        source: 'BusinessActor',
        type: 'Assignment',
        target: 'BusinessRole',
        reads: 'Claims Department is assigned to the role Claims Handler.',
      },
      {
        source: 'BusinessRole',
        type: 'Assignment',
        target: 'BusinessProcess',
        reads: 'Claims Handler is assigned to Handle Claim.',
      },
      {
        source: 'BusinessEvent',
        type: 'Triggering',
        target: 'BusinessProcess',
        reads: 'Claim received triggers Handle Claim.',
      },
      {
        source: 'BusinessProcess',
        type: 'Realization',
        target: 'BusinessService',
        reads: 'Handle Claim realizes Claim registration.',
      },
      {
        source: 'ApplicationService',
        type: 'Serving',
        target: 'BusinessProcess',
        reads: 'Customer lookup serves Handle Claim.',
      },
      {
        source: 'BusinessProcess',
        type: 'Access',
        target: 'BusinessObject',
        reads: 'Handle Claim writes Claim.',
      },
    ],
    notes: [
      'Serving points from the provider to the user: from the application service to the process, not the other way.',
    ],
    sources: [
      { work: 'cookbook', at: '2.3 Layered View, Figure 17' },
      { work: 'cookbook', at: '8.2.8 Layered Process View, Figure 86' },
    ],
  },
  {
    id: 'technology',
    title: 'Technology and hosting',
    intro:
      'Model infrastructure only as far as a question needs it: where a system runs, what it depends on, and what a platform change would touch.',
    steps: [
      {
        source: 'Node',
        type: 'Composition',
        target: 'SystemSoftware',
        reads: 'Production cluster is composed of PostgreSQL 16.',
      },
      {
        source: 'Node',
        type: 'Realization',
        target: 'TechnologyService',
        reads: 'Production cluster realizes Managed database.',
      },
      {
        source: 'TechnologyService',
        type: 'Serving',
        target: 'ApplicationComponent',
        reads: 'Managed database serves Claims System.',
      },
      {
        source: 'Node',
        type: 'Assignment',
        target: 'Artifact',
        reads: 'Production cluster is assigned claims-core-2.3.jar: it is deployed there.',
      },
      {
        source: 'Artifact',
        type: 'Realization',
        target: 'ApplicationComponent',
        reads: 'claims-core-2.3.jar realizes Claims System.',
      },
    ],
    notes: [
      'A Technology Service between the platform and the application keeps the landscape stable when the platform underneath changes.',
    ],
    sources: [
      { work: 'cookbook', at: '2.8 Technology Platform View (Infrastructure View), Figure 35' },
    ],
  },
  {
    id: 'motivation',
    title: 'Why: drivers, goals and requirements',
    intro:
      'Motivation elements record why the architecture changes, so a decision can be traced from a requirement back to the driver behind it.',
    steps: [
      {
        source: 'Stakeholder',
        type: 'Association',
        target: 'Driver',
        reads: 'Chief Financial Officer is associated with Rising claim costs.',
      },
      {
        source: 'Assessment',
        type: 'Association',
        target: 'Driver',
        reads: 'Claims backlog grows 15% a year is associated with Rising claim costs.',
      },
      {
        source: 'Assessment',
        type: 'Influence',
        target: 'Goal',
        reads: 'Claims backlog grows 15% a year influences Faster claim settlement.',
      },
      {
        source: 'Outcome',
        type: 'Realization',
        target: 'Goal',
        reads: '80% of claims settled within 5 days realizes Faster claim settlement.',
      },
      {
        source: 'Requirement',
        type: 'Realization',
        target: 'Outcome',
        reads: 'Customers can log in with an e-ID realizes the outcome.',
      },
      {
        source: 'ApplicationComponent',
        type: 'Realization',
        target: 'Requirement',
        reads: 'Customer Portal realizes Customers can log in with an e-ID.',
      },
    ],
    notes: [
      'Keep goals few and broad, and make outcomes measurable. A goal nobody can tell is reached is a slogan.',
    ],
    sources: [{ work: 'cookbook', at: '2.1 Motivation View (Goals View), Figure 2' }],
  },
  {
    id: 'change',
    title: 'Change over time: plateaus and work packages',
    intro:
      'Plateaus describe states of the architecture; work packages describe the work that moves it from one to the next.',
    steps: [
      {
        source: 'Plateau',
        type: 'Aggregation',
        target: 'ApplicationComponent',
        reads: 'Target 2028 aggregates Claims System.',
      },
      {
        source: 'Gap',
        type: 'Association',
        target: 'Plateau',
        reads: 'Legacy claims retirement is associated with Baseline 2026 and with Target 2028.',
      },
      {
        source: 'WorkPackage',
        type: 'Realization',
        target: 'Deliverable',
        reads: 'Claims platform migration realizes Migrated claim data.',
      },
      {
        source: 'Deliverable',
        type: 'Realization',
        target: 'ApplicationComponent',
        reads: 'Migrated claim data realizes Claims System.',
      },
      {
        source: 'ImplementationEvent',
        type: 'Triggering',
        target: 'WorkPackage',
        reads: 'Go-live triggers Legacy decommissioning.',
      },
    ],
    notes: [
      'Archipelago also carries time on elements and relationships directly: see "Lifecycle and dates" below. Plateaus are for when you need to name and compare whole states.',
    ],
    sources: [{ work: 'cookbook', at: '2.2.5 Implementation Roadmap View, Figures 15 and 16' }],
  },
  {
    id: 'portfolio-data',
    title: 'Portfolio data on relationships',
    intro:
      'In Archipelago, facts about how two things relate live on the relationship, not on either element (ADR 0001). The fact sheet edits them on the relation rows.',
    steps: [
      {
        source: 'ApplicationComponent',
        type: 'Realization',
        target: 'Capability',
        reads:
          'Claims System realizes Claims Settlement, with a support type: how much of the capability it covers.',
      },
      {
        source: 'TechnologyService',
        type: 'Serving',
        target: 'ApplicationComponent',
        reads:
          'Managed database serves Claims System, with an annual cost: what that dependency costs per year.',
      },
      {
        source: 'ApplicationComponent',
        type: 'Access',
        target: 'DataObject',
        reads: 'Claims System accesses Claim record, as read, write or both: its CRUD usage.',
      },
    ],
    notes: [
      'Every relationship can carry validity dates (valid from, valid to), so a dependency can start and end without either element doing so.',
      'A cost on the relationship can be split by consumer: the same platform costs one amount for one application and another for the next. On the element, that split is lost.',
    ],
    sources: [{ work: 'adr', adr: '0001' }],
  },
]

/** Prose sections about Archipelago's own conventions, with no relationships to check. */
export interface ConventionSection {
  readonly id: string
  readonly title: string
  readonly paragraphs: readonly string[]
  /** The decision the convention follows. */
  readonly source: Citation
}

export const CONVENTIONS: readonly ConventionSection[] = [
  {
    id: 'lifecycle',
    title: 'Lifecycle and dates',
    paragraphs: [
      'An element carries the date each lifecycle phase starts: Plan, Phase In, Active, Phase Out, End of Life. Archipelago never stores which phase an element is in. It works the phase out from the dates at the time you are looking at: today in the inventory, the chosen year in the dependency graph.',
      'Fill in the dates you know and leave the rest empty. An element with no dates counts as Active.',
    ],
    source: { work: 'ui-spec', at: '§3.1 Lifecycle is derived, never stored' },
  },
  {
    id: 'portfolio-fields',
    title: 'Assessments on applications and technology',
    paragraphs: [
      'The types below carry the portfolio fields: functional fit, technical fit, business criticality and a TIME classification (Tolerate, Invest, Migrate, Eliminate). They travel through the exchange format as ArchiMate properties, so Archi keeps them.',
    ],
    source: { work: 'adr', adr: '0001' },
  },
  {
    id: 'codes',
    title: 'Two-letter codes and notation',
    paragraphs: [
      'Lists, cards and the graph show each element type as a two-letter code in its layer colour (AC for Application Component). Views draw the standard ArchiMate notation. This guide shows both.',
    ],
    source: { work: 'ui-spec', at: '§2.2 ArchiMate notation' },
  },
]
