import type { Workspace } from '@/model'
import { importExchangeXml } from './exchange-format'
import demoXml from './demo/archisurance.xml?raw'

/**
 * The bundled demo workspace — "Explore the demo" on the first-run screen (#11).
 *
 * It ships as exchange-format XML rather than as a JavaScript object on purpose:
 * loading the demo runs the same import path a user's own file runs, so the
 * feature that gets exercised most is also the one that must never break.
 *
 * **Provenance.** This is an insurance landscape *in the spirit of* The Open
 * Group's ArchiSurance case study — 29 elements and 47 relationships authored
 * for this project, carried over from the design prototype. The Open Group's own
 * ArchiSurance model is copyrighted and the widely-mirrored copies are GPL-3.0,
 * neither of which can be bundled in an MIT repository. The lifecycle dates and
 * portfolio assessments are illustrative: they exist so the reports have colour,
 * and they describe no real organisation.
 */

export const DEMO_WORKSPACE_ID = 'ws-archisurance-demo'

export const DEMO_WORKSPACE_XML = demoXml

/**
 * Parse the bundled demo.
 * The file ships with the app, so a failure here is a build problem, not user
 * input — hence the throw rather than an `ImportResult`.
 */
export function loadDemoWorkspace(): Workspace {
  const result = importExchangeXml(DEMO_WORKSPACE_XML, 'archisurance.xml')
  if (!result.workspace) {
    const reasons = result.problems.map((p) => p.message).join('; ')
    throw new Error(`The bundled demo workspace failed to load: ${reasons}`)
  }
  return result.workspace
}
