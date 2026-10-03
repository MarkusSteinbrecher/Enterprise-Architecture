import type { Bounds } from '@/model'
import { resolveColour } from '@/ui/graph/export-svg'
import { UI_FAMILY } from '@/ui/notation/text'

/**
 * Export a view as SVG and PNG (#79).
 *
 * The canvas already *is* SVG drawn by the notation components (ADR 0006), so
 * the export is the drawing itself, cloned: no second renderer to drift from
 * what is on screen. Two things make the clone stand alone: every `var(--…)`
 * is resolved to the concrete colour of the current theme, and the font
 * variables become concrete families.
 */

const SVG_NS = 'http://www.w3.org/2000/svg'
const PADDING = 20
const MONO_FAMILY = "'JetBrains Mono', ui-monospace, monospace"
const PAINT_ATTRIBUTES = ['fill', 'stroke', 'color', 'stop-color']

export interface ExportedSvg {
  svg: string
  width: number
  height: number
}

/** A standalone SVG of `drawing` (the `[data-view-drawing]` group) covering `area`. */
export function buildViewSvg(drawing: SVGGElement, area: Bounds, title: string): ExportedSvg {
  const width = Math.ceil(area.width + PADDING * 2)
  const height = Math.ceil(area.height + PADDING * 2)
  const resolved = new Map<string, string>()
  const resolve = (value: string) => {
    let out = resolved.get(value)
    if (out === undefined) {
      out = resolveColour(value)
      resolved.set(value, out)
    }
    return out
  }

  const root = document.createElementNS(SVG_NS, 'svg')
  root.setAttribute('width', String(width))
  root.setAttribute('height', String(height))
  root.setAttribute('viewBox', `${area.x - PADDING} ${area.y - PADDING} ${width} ${height}`)
  root.setAttribute('font-family', UI_FAMILY)
  const titleEl = document.createElementNS(SVG_NS, 'title')
  titleEl.textContent = title
  root.append(titleEl)
  const background = document.createElementNS(SVG_NS, 'rect')
  background.setAttribute('x', String(area.x - PADDING))
  background.setAttribute('y', String(area.y - PADDING))
  background.setAttribute('width', String(width))
  background.setAttribute('height', String(height))
  background.setAttribute('fill', resolve('var(--paper)'))
  root.append(background)

  const clone = drawing.cloneNode(true) as SVGGElement
  for (const el of [clone, ...clone.querySelectorAll('*')]) {
    for (const name of PAINT_ATTRIBUTES) {
      const value = el.getAttribute(name)
      if (value?.includes('var(')) el.setAttribute(name, resolve(value))
    }
    const family = el.getAttribute('font-family')
    if (family?.includes('var(--font-ui)')) el.setAttribute('font-family', UI_FAMILY)
    else if (family?.includes('var(--font-mono)')) el.setAttribute('font-family', MONO_FAMILY)
  }
  root.append(clone)
  return { svg: new XMLSerializer().serializeToString(root), width, height }
}

/** Turns SVG markup into something a canvas can draw; injectable so the failure paths can be tested. */
export type ImageLoader = (svg: string) => Promise<CanvasImageSource>

const loadImage: ImageLoader = async (svg) => {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('The browser could not draw the exported SVG.'))
      image.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Browsers refuse canvases much past this edge; larger views are scaled down to fit. */
const MAX_EDGE = 8192

/**
 * Rasterise an exported SVG to PNG at `scale` (2 for a crisp image on high-DPI
 * screens), scaled down if that would exceed the largest canvas a browser draws.
 * Rejects rather than resolving with an empty image: a blank PNG that downloads
 * successfully is worse than an error the user can see.
 */
export async function rasterise(
  { svg, width, height }: ExportedSvg,
  scale = 2,
  load: ImageLoader = loadImage,
): Promise<Blob> {
  const k = Math.min(scale, MAX_EDGE / width, MAX_EDGE / height)
  const image = await load(svg)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * k))
  canvas.height = Math.max(1, Math.round(height * k))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser cannot draw to a canvas.')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The browser could not encode the PNG.'))),
      'image/png',
    ),
  )
}

/** A file name from a view name: lower case, dashes, never empty. */
export function viewFileName(name: string, extension: 'svg' | 'png'): string {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'view'
  return `${slug}.${extension}`
}
