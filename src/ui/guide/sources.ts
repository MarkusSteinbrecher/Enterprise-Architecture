/**
 * Where the guide's content comes from (#153). Every entry, pattern and
 * convention names one of these, and the guide renders the citation next to
 * the text it supports.
 *
 * A citation has to be true of the sentence it labels. The specification is
 * behind an Open Group sign-in, so it is cited by the concept a section is
 * about, never by a section number nobody here could check. The definitions
 * were checked against the per-concept hints in Archi 5.10's help
 * (`com.archimatetool.help/hints`), which follow the specification's own
 * definitions; nothing is quoted from either. Advice of our own is labelled
 * as Archipelago's, with a pointer to a source where one supports it.
 */

export interface Work {
  readonly title: string
  readonly by: string
  /** Which edition or version the guide was checked against. */
  readonly edition?: string
  readonly href?: string
  readonly note: string
}

export const WORKS = {
  spec: {
    title: 'ArchiMate® 3.2 Specification',
    by: 'The Open Group',
    href: 'https://pubs.opengroup.org/architecture/archimate32-doc/',
    note: 'The normative definition of every concept and relationship; it asks you to sign in with an Open Group account. The definitions in this guide paraphrase it, and each entry names the concept it paraphrases. Read it to settle a question, not to learn.',
  },
  archi: {
    title: 'Archi',
    by: 'Phillip Beauvoir and Jean-Baptiste Sarrodie',
    edition: '5.10.0',
    href: 'https://github.com/archimatetool/archi',
    note: 'The open-source ArchiMate tool Archipelago round-trips with. Its relationship matrix and viewpoint list are vendored unmodified (MIT), and its per-concept hints are what the definitions here were checked against.',
  },
  cookbook: {
    title: 'ArchiMate® Cookbook: Patterns & Examples',
    by: 'Eero Hosiaisluoma',
    edition: 'version 1.0, modified 2022-08-05',
    href: 'https://web.archive.org/web/20250821195049/https://www.hosiaisluoma.fi/ArchiMate-Cookbook.pdf',
    note: 'Free. Practical patterns with a small subset of the language, and the source of most patterns under "How we model". The author has since put an EDGY cookbook at the original address, so the link is to the archived ArchiMate edition.',
  },
} as const satisfies Record<string, Work>

/**
 * Archipelago's own decisions, as links. They are full URLs on purpose:
 * `repo-links.test.ts` checks every `blob/main` link in `src` against the tree.
 */
export const ADRS = {
  '0001': {
    title: 'ADR 0001: ArchiMate 3.2 as base metamodel with a portfolio-profile overlay',
    href: 'https://github.com/MarkusSteinbrecher/Enterprise-Architecture/blob/main/design/decisions/0001-archimate-core-portfolio-overlay.md',
  },
  '0009': {
    title: "ADR 0009: Relationship validity is Archi's matrix, with Archi's junction rules",
    href: 'https://github.com/MarkusSteinbrecher/Enterprise-Architecture/blob/main/design/decisions/0009-relationship-validity-from-archi.md',
  },
  '0011': {
    title: 'ADR 0011: Stay on ArchiMate 3.2 until Archi supports ArchiMate 4',
    href: 'https://github.com/MarkusSteinbrecher/Enterprise-Architecture/blob/main/design/decisions/0011-stay-on-archimate-3-2.md',
  },
} as const

export const UI_SPEC = {
  title: 'UI spec',
  href: 'https://github.com/MarkusSteinbrecher/Enterprise-Architecture/blob/main/design/specs/open-ea-repository-ui-spec.md',
} as const

export type Citation =
  /** The specification, at the section about `at` (a concept), or as a whole. */
  | { readonly work: 'spec'; readonly at?: string }
  /** A Cookbook section and the figures in it that show the pattern. */
  | { readonly work: 'cookbook'; readonly at: string }
  /** A file in Archi's model plugin. */
  | { readonly work: 'archi'; readonly at: string }
  | { readonly work: 'adr'; readonly adr: keyof typeof ADRS }
  /** A section of the UI spec, by its number and title. */
  | { readonly work: 'ui-spec'; readonly at: string }

/** How a citation reads, and where it links. */
export function citationParts(citation: Citation): {
  label: string
  at?: string | undefined
  href: string
} {
  switch (citation.work) {
    case 'spec':
      return { label: 'ArchiMate 3.2 Specification', at: citation.at, href: WORKS.spec.href }
    case 'cookbook':
      return { label: 'ArchiMate Cookbook', at: citation.at, href: WORKS.cookbook.href }
    case 'archi':
      return { label: `Archi ${WORKS.archi.edition}`, at: citation.at, href: WORKS.archi.href }
    case 'adr':
      return { label: ADRS[citation.adr].title, href: ADRS[citation.adr].href }
    case 'ui-spec':
      return { label: UI_SPEC.title, at: citation.at, href: UI_SPEC.href }
  }
}

/** Archipelago's own advice, kept apart from the definition it follows. */
export interface Guidance {
  readonly text: string
  /** A source that supports the advice, where there is one. */
  readonly see?: Citation
}
