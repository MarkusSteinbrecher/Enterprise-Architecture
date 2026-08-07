import type { Workspace } from '@/model'
import { toCanonicalJson } from './canonical-json'
import { exportExchangeXml } from './exchange-format'

/**
 * Getting a file out of the browser.
 *
 * This is the fallback path that works everywhere: build a Blob, click an
 * invisible anchor. Chromium's File System Access API — which keeps a handle so
 * a second save writes back to the same file in a git working copy — lands with
 * issue #11 and will layer on top of this rather than replace it, because
 * Firefox and Safari have nothing else.
 */

export type ExportFormat = 'json' | 'xml'

export function workspaceFileName(workspace: Workspace, format: ExportFormat): string {
  const slug =
    workspace.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'workspace'
  return `${slug}.${format === 'json' ? 'json' : 'xml'}`
}

export function serialiseWorkspace(workspace: Workspace, format: ExportFormat): string {
  return format === 'json' ? toCanonicalJson(workspace) : exportExchangeXml(workspace)
}

export function downloadText(fileName: string, contents: string, mimeType: string): void {
  const blob = new Blob([contents], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Download a workspace in the given format. Returns the file name written. */
export function downloadWorkspace(workspace: Workspace, format: ExportFormat = 'json'): string {
  const fileName = workspaceFileName(workspace, format)
  downloadText(
    fileName,
    serialiseWorkspace(workspace, format),
    format === 'json' ? 'application/json' : 'application/xml',
  )
  return fileName
}
