import type { Aspect, ElementType, Layer, RelationshipType } from '@/model'

/**
 * The hand-written half of the ArchiMate guide (#149): what each concept means,
 * in our own words.
 *
 * The specification's text is copyright The Open Group, so nothing here is
 * quoted from it; each entry paraphrases the idea and gives an example. The
 * normative text is linked from the guide, not reproduced.
 *
 * The tables are typed as `Record<ElementType, …>` and friends, so a type added
 * to the catalogue without an entry fails the typecheck, and `guide.test.tsx`
 * fails on an entry left empty.
 */

/** The ArchiMate version Archipelago implements (ADR 0011). */
export const ARCHIMATE_VERSION = '3.2'

export interface ElementGuide {
  /** One or two sentences: what the concept is for. */
  readonly summary: string
  /** A typical instance, as a name someone would give it. */
  readonly example: string
  /** Part of the subset worth learning first (the guide's "Start here"). */
  readonly starter?: true
}

// prettier-ignore
export const ELEMENT_GUIDE: Readonly<Record<ElementType, ElementGuide>> = {
  // ── Strategy ──
  Resource: { summary: 'Something the enterprise owns or controls and puts to work: people, money, information, equipment, know-how. Capabilities draw on resources.', example: 'Claims expertise' },
  Capability: { summary: 'What the enterprise is able to do, described without saying how, by whom or with which systems. Capabilities change slowly, which makes them the backbone of a capability map.', example: 'Claims Management', starter: true },
  CourseOfAction: { summary: 'A chosen approach for reaching a goal: which capabilities and resources to develop or combine, and in what direction.', example: 'Digital first notice of loss' },
  ValueStream: { summary: 'A sequence of stages, end to end, through which the enterprise creates a result of value for a customer or stakeholder. Each stage is a value stream too.', example: 'Settle a claim' },

  // ── Business ──
  BusinessActor: { summary: 'An organisational unit that can act: a person, a team, a department, or an outside party such as a customer or a supplier.', example: 'Claims Department', starter: true },
  BusinessRole: { summary: 'A responsibility that an actor takes on. Assign behaviour to roles rather than to actors, and a reorganisation only changes who fills the role.', example: 'Claims Handler', starter: true },
  BusinessCollaboration: { summary: 'Two or more roles or actors that act together for a while and do something none of them does alone.', example: 'Broker partnership' },
  BusinessInterface: { summary: 'The channel through which the business offers a service to others: a counter, a phone line, a mailbox.', example: 'Customer call centre' },
  BusinessProcess: { summary: 'Behaviour in a defined order, from a start to a result: the steps someone follows.', example: 'Handle Claim', starter: true },
  BusinessFunction: { summary: 'Behaviour grouped by the skills, knowledge or resources it needs, with no fixed order. Unlike a capability, it describes work the organisation actually does.', example: 'Customer Relations' },
  BusinessInteraction: { summary: 'Behaviour that only happens when a collaboration acts together, such as a negotiation.', example: 'Agree settlement' },
  BusinessEvent: { summary: 'Something that happens, inside or outside the enterprise, and starts, interrupts or ends behaviour.', example: 'Claim received' },
  BusinessService: { summary: 'Behaviour the business offers to others, described from the side of the one who uses it: what they get, not how it is done.', example: 'Claim registration', starter: true },
  BusinessObject: { summary: 'A concept the business works with, as information: what processes create, read and change.', example: 'Claim', starter: true },
  Contract: { summary: 'An agreement that sets out rights and obligations between parties. It is a business object with legal weight.', example: 'Service level agreement' },
  Representation: { summary: 'A form in which a business object can be seen or handled: a paper form, a letter, a report, a screen.', example: 'Claim form (PDF)' },
  Product: { summary: 'A bundle of services, and the contract that goes with them, offered to customers as one thing.', example: 'Car Insurance' },

  // ── Application ──
  ApplicationComponent: { summary: 'A piece of software with a clear responsibility that can be deployed and replaced as a whole: the unit of an application portfolio. In Archipelago it carries the portfolio fields.', example: 'Claims System', starter: true },
  ApplicationCollaboration: { summary: 'Several application components that work together for a purpose, such as a suite or an integration.', example: 'Claims suite' },
  ApplicationInterface: { summary: 'A point where an application component can be used, by people or by other software: a user interface, an API, a file drop.', example: 'Claims REST API', starter: true },
  ApplicationFunction: { summary: 'Automated behaviour grouped by what it does, with no fixed order.', example: 'Premium calculation' },
  ApplicationInteraction: { summary: 'Automated behaviour that an application collaboration performs together.', example: 'Policy synchronisation' },
  ApplicationProcess: { summary: 'Automated behaviour in a defined order, such as a batch job or a workflow.', example: 'Nightly settlement run' },
  ApplicationEvent: { summary: 'A change of state in software that starts or ends automated behaviour: a message, a timer, a status change.', example: 'Payment confirmed' },
  ApplicationService: { summary: 'Automated behaviour offered to users or other systems, described from the side of the one who uses it.', example: 'Customer lookup', starter: true },
  DataObject: { summary: 'Data structured so that software can process it. A data object often realizes a business object.', example: 'Claim record', starter: true },

  // ── Technology ──
  Node: { summary: 'A computing resource that hosts, runs or stores software and data: a server, a virtual machine, a cluster, a cloud account.', example: 'Production cluster', starter: true },
  Device: { summary: 'A piece of physical hardware that can run software: a laptop, a phone, a terminal.', example: 'Field-agent tablet' },
  SystemSoftware: { summary: 'Software that other software runs on or depends on: an operating system, a database server, a runtime, middleware.', example: 'PostgreSQL 16', starter: true },
  TechnologyCollaboration: { summary: 'Several nodes that work together, such as a cluster or a failover pair.', example: 'Database failover pair' },
  TechnologyInterface: { summary: 'A point where a technology service can be reached: a port, a protocol endpoint, a console.', example: 'JDBC endpoint' },
  Path: { summary: 'A link between nodes over which they exchange data or other things. It says that they communicate, not over which wires.', example: 'Data-centre replication link' },
  CommunicationNetwork: { summary: 'The network that carries communication between nodes and devices.', example: 'Corporate WAN' },
  TechnologyFunction: { summary: 'Behaviour of technology grouped by what it does, with no fixed order.', example: 'Data backup' },
  TechnologyProcess: { summary: 'Behaviour of technology in a defined order.', example: 'Deployment pipeline' },
  TechnologyInteraction: { summary: 'Behaviour that a technology collaboration performs together.', example: 'Cluster failover' },
  TechnologyEvent: { summary: 'A change of state in the infrastructure that starts or ends technology behaviour.', example: 'Disk threshold reached' },
  TechnologyService: { summary: 'Behaviour that the infrastructure offers to applications or other technology, such as hosting, storage or messaging.', example: 'Managed database', starter: true },
  Artifact: { summary: 'A piece of data that technology uses or produces: a file, an installable package, a database schema. Artifacts are what gets deployed.', example: 'claims-core-2.3.jar' },

  // ── Physical ──
  Equipment: { summary: 'Physical machines, tools or instruments that do work, with or without software in them.', example: 'Sorting machine' },
  Facility: { summary: 'A physical place built or set up for a purpose: a factory, a warehouse, a data-centre building.', example: 'Frankfurt data centre' },
  DistributionNetwork: { summary: 'A physical network for moving goods, materials or energy.', example: 'Delivery fleet' },
  Material: { summary: 'Physical matter or energy that equipment uses or produces.', example: 'Spare parts' },

  // ── Motivation ──
  Stakeholder: { summary: 'A person, group or organisation with an interest in the outcome of the architecture, seen through that interest.', example: 'Chief Financial Officer' },
  Driver: { summary: 'A condition, inside or outside the enterprise, that pushes it to change.', example: 'Rising claim costs' },
  Assessment: { summary: 'What analysing a driver found: a strength, weakness, opportunity or threat.', example: 'Claims backlog grows 15% a year' },
  Goal: { summary: 'A state the enterprise wants to reach, stated broadly.', example: 'Faster claim settlement', starter: true },
  Outcome: { summary: 'A concrete, measurable result. Outcomes are how you tell that a goal has been reached.', example: '80% of claims settled within 5 days' },
  Principle: { summary: 'A general rule that guides many design decisions rather than one.', example: 'Buy before build' },
  Requirement: { summary: 'A need that a particular system, process or other element has to meet.', example: 'Customers can log in with an e-ID', starter: true },
  Constraint: { summary: 'A limit on how a goal may be reached. It restricts the solution rather than asking for something.', example: 'Data stays in EU data centres' },
  Meaning: { summary: 'What a concept is taken to mean in a particular context.', example: 'What counts as a "closed" claim' },
  Value: { summary: 'What something is worth to a stakeholder: its usefulness, benefit or importance.', example: 'Peace of mind' },

  // ── Implementation & Migration ──
  WorkPackage: { summary: 'Work with a defined goal, a start and an end: a project, a programme, an epic.', example: 'Claims platform migration', starter: true },
  Deliverable: { summary: 'A defined result that a work package produces.', example: 'Migrated claim data' },
  ImplementationEvent: { summary: 'Something that happens during a change, such as a go-live or a signature, and starts or ends work.', example: 'Go-live' },
  Plateau: { summary: 'A stable state of the architecture over a period: the baseline, a transition state, the target.', example: 'Target 2028' },
  Gap: { summary: 'What differs between two plateaus: what has to be added, changed or removed to move from one to the other.', example: 'Legacy claims retirement' },

  // ── Other ──
  Location: { summary: 'A place or position where elements are found or behaviour happens.', example: 'Munich office' },
  Grouping: { summary: 'Puts elements of any type together because they belong together for some reason. It does not make anything own anything.', example: 'Customer domain' },
  Junction: { summary: 'Joins several relationships of one type at a point, as "and" or "or": for example, a process triggered when either of two events happens.', example: 'Either event' },
}

export interface RelationshipGuide {
  readonly summary: string
  /** A sentence that reads source → target. */
  readonly example: string
}

// prettier-ignore
export const RELATIONSHIP_GUIDE: Readonly<Record<RelationshipType, RelationshipGuide>> = {
  Composition: { summary: 'The source is made up of the target, and the target cannot exist without it.', example: 'Claims System is composed of Claims REST API.' },
  Aggregation: { summary: 'The source groups the target, which can exist on its own and can belong to more than one group.', example: 'Target 2028 aggregates Claims System.' },
  Assignment: { summary: 'Who or what does the work: an active element performs behaviour, or an artifact is deployed on a node.', example: 'Claims Handler is assigned to Handle Claim.' },
  Realization: { summary: 'Something more concrete brings about something more abstract: a process realizes a service, data realizes a business object.', example: 'Claim record realizes Claim.' },
  Serving: { summary: 'The source provides functionality the target uses.', example: 'Customer lookup serves Handle Claim.' },
  Access: { summary: 'Behaviour or an active element reads or writes passive structure. It may say read, write or both.', example: 'Handle Claim writes Claim.' },
  Influence: { summary: 'One motivation element affects another, positively or negatively, without fully realizing it. It may carry a strength from ++ to --.', example: 'Rising claim costs influence Faster claim settlement (+).' },
  Triggering: { summary: 'The source starts the target: an order in time, or cause and effect, between behaviours.', example: 'Claim received triggers Handle Claim.' },
  Flow: { summary: 'Something passes from the source to the target: information, goods, money.', example: 'Claims System flows to Payments System.' },
  Specialization: { summary: 'The source is a kind of the target. Both are of the same type.', example: 'Car Insurance is a specialization of Insurance Product.' },
  Association: { summary: 'An unspecified link, for when no more specific relationship fits. It may be directed or not.', example: 'Chief Financial Officer is associated with Rising claim costs.' },
}

export const CATEGORY_LABELS: Readonly<
  Record<'structural' | 'dependency' | 'dynamic' | 'other', string>
> = {
  structural: 'Structural — how things are built and who does what',
  dependency: 'Dependency — how things support or affect one another',
  dynamic: 'Dynamic — what happens in which order, and what moves',
  other: 'Other',
}

export interface AspectGuide {
  readonly label: string
  readonly summary: string
}

/** The framework's columns. Composite and connector have no column in the grid. */
export const ASPECT_GUIDE: Readonly<Record<Aspect, AspectGuide>> = {
  'active-structure': {
    label: 'Active structure',
    summary: 'Who or what acts: actors, components, nodes.',
  },
  behaviour: {
    label: 'Behaviour',
    summary: 'What they do: processes, functions, services, events.',
  },
  'passive-structure': {
    label: 'Passive structure',
    summary: 'What is acted on: business objects, data, artifacts.',
  },
  motivation: { label: 'Motivation', summary: 'Why: stakeholders, goals, requirements.' },
  composite: { label: 'Composite', summary: 'Elements that combine others.' },
  connector: { label: 'Connector', summary: 'Joins relationships.' },
}

/** One line per layer, for the framework grid. */
export const LAYER_GUIDE: Readonly<Record<Layer, string>> = {
  strategy: 'What the enterprise wants to be able to do, and with what.',
  business: 'The organisation, its work and the information it handles.',
  application: 'The software that automates the work, and its data.',
  technology: 'The infrastructure the software runs on.',
  physical: 'Machines, buildings, networks and materials in the physical world.',
  motivation: 'Why the architecture is the way it is.',
  implementation: 'How the architecture changes over time.',
  other: 'Concepts that cut across the layers.',
}

export interface ReadingItem {
  readonly title: string
  readonly by: string
  readonly note: string
  readonly href?: string
}

export const FURTHER_READING: readonly ReadingItem[] = [
  {
    title: 'ArchiMate® 3.2 Specification',
    by: 'The Open Group',
    note: 'The normative definition of every concept and relationship; it asks you to sign in with an Open Group account. Read it to settle a question, not to learn.',
    href: 'https://pubs.opengroup.org/architecture/archimate32-doc/',
  },
  {
    title: 'ArchiMate Cookbook',
    by: 'Eero Hosiaisluoma',
    note: 'Free. Practical patterns with a small subset of the language: the best place to learn how to model.',
    href: 'https://www.hosiaisluoma.fi/ArchiMate-Cookbook.pdf',
  },
  {
    title: 'Mastering ArchiMate',
    by: 'Gerben Wierda',
    note: 'A book. Deep and opinionated about modelling patterns and their pitfalls.',
  },
  {
    title: 'Enterprise Architecture at Work',
    by: 'Marc Lankhorst',
    note: 'A book. Where the language came from, and why it is shaped the way it is.',
  },
]
