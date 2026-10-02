/**
 * Spike #78 measurement: drives each candidate in real Chromium and prints JSON.
 * Run with the dev server on :5178 — `npx vite-node spike/78/measure.ts`.
 */
import { chromium, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:5178/Enterprise-Architecture/spike.html'
const OUT = 'spike/78/out'
mkdirSync(OUT, { recursive: true })

const selector: Record<string, (id: string) => string> = {
  custom: (id) => `[data-node="${id}"] > rect`,
  reactflow: (id) => `.react-flow__node[data-id="${id}"]`,
  diagramjs: (id) => `[data-element-id="${id}"] .djs-visual`,
}

async function frames<T>(page: Page, run: () => Promise<T>) {
  await page.evaluate(() => {
    const w = window as any
    w.__frames = []
    let last = performance.now()
    w.__running = true
    const tick = (t: number) => {
      w.__frames.push(t - last)
      last = t
      if (w.__running) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
  await run()
  const f: number[] = await page.evaluate(() => {
    const w = window as any
    w.__running = false
    return w.__frames.slice(1)
  })
  f.sort((a, b) => a - b)
  return { n: f.length, p50: +f[Math.floor(f.length * 0.5)]!.toFixed(1), p95: +f[Math.floor(f.length * 0.95)]!.toFixed(1), max: +f[f.length - 1]!.toFixed(1) }
}

async function drag(page: Page, from: { x: number; y: number }, dx: number, dy: number, steps = 30) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from.x + (dx * i) / steps, from.y + (dy * i) / steps)
  }
  await page.mouse.up()
  await page.waitForTimeout(100)
}

const state = (page: Page, nodeId: string, connId: string) =>
  page.evaluate(
    ([n, c]) => {
      const s = window.__spike!
      const v = s.store.view('v-landscape')!
      const node = v.nodes.find((x) => x.id === n)!
      const conn = v.connections.find((x) => x.id === c)!
      return { history: s.store.history.length, bounds: node.bounds, parent: node.parent, bends: conn.bendpoints?.length ?? 0 }
    },
    [nodeId, connId],
  )

async function run(engine: string, copies: number) {
  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
    ...(VIDEO ? { recordVideo: { dir: `${OUT}/video-${engine}`, size: { width: 1600, height: 1000 } } } : {}),
  })
  page.setDefaultTimeout(10000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE })
  await page.addInitScript(() => {
    const w = window as any
    w.__lat = { commit: [] as number[], undo: [] as number[] }
    const after = (bucket: number[]) => {
      const t = performance.now()
      requestAnimationFrame(() => requestAnimationFrame(() => bucket.push(performance.now() - t)))
    }
    addEventListener('pointerup', () => after(w.__lat.commit), { capture: true })
    addEventListener('keydown', () => after(w.__lat.undo), { capture: true })
  })
  await page.goto(`${BASE}?engine=${engine}&copies=${copies}`)
  await page.waitForFunction(() => window.__spike?.firstPaintMs !== undefined)
  await page.waitForTimeout(300)
  const firstPaintMs = await page.evaluate(() => Math.round(window.__spike!.firstPaintMs!))
  const mountMs = await page.evaluate(() => Math.round(window.__spike!.mountMs!))
  const objects = await page.evaluate(() => window.__spike!.objects)
  await page.screenshot({ path: `${OUT}/${engine}-x${copies}.png` })

  // Pick a nested element node and a connection that is not attached to it.
  const pick = await page.evaluate(() => {
    const v = window.__spike!.store.view('v-landscape')!
    const nested = v.nodes.filter((n) => n.parent && n.kind === 'element' && !n.id.includes('~'))
    const node = nested[Math.floor(nested.length / 2)]!
    const conn = v.connections.find((c) => c.source !== node.id && c.target !== node.id && !c.id.includes('~'))!
    return { node: node.id, conn: conn.id }
  })

  const result: Record<string, unknown> = { engine, copies, objects, firstPaintMs, mountMs }
  const box = await page.locator(selector[engine]!(pick.node)).first().boundingBox()
  if (!box) throw new Error(`${engine}: node not rendered`)
  const at = await page.evaluate(
    ([engine, id, b]) => {
      const owner = (el: Element | null) =>
        engine === 'custom'
          ? el?.closest('[data-node]')?.getAttribute('data-node')
          : engine === 'reactflow'
            ? el?.closest('.react-flow__node')?.getAttribute('data-id')
            : el?.closest('[data-element-id]')?.getAttribute('data-element-id')
      for (let fy = 0.5; fy < 0.95; fy += 0.1)
        for (let fx = 0.5; fx < 0.95; fx += 0.1) {
          const x = b.x + b.width * fx
          const y = b.y + b.height * fy
          if (owner(document.elementFromPoint(x, y)) === id) return { x, y }
        }
      throw new Error('no free point on node')
    },
    [engine, pick.node, box] as const,
  )

  // 1. Move a nested shape inside its container; one command; undo restores.
  const s0 = await state(page, pick.node, pick.conn)
  result.dragFrames = await frames(page, () => drag(page, at, 24, 12))
  const s1 = await state(page, pick.node, pick.conn)
  result.move = {
    commands: s1.history - s0.history,
    moved: s1.bounds.x !== s0.bounds.x || s1.bounds.y !== s0.bounds.y,
    keptParent: s1.parent === s0.parent,
  }
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(100)
  const s2 = await state(page, pick.node, pick.conn)
  const box2 = await page.locator(selector[engine]!(pick.node)).first().boundingBox()
  result.moveUndo = {
    restored: JSON.stringify(s2.bounds) === JSON.stringify(s0.bounds),
    domRestored: Math.abs(box2!.x - box.x) < 1 && Math.abs(box2!.y - box.y) < 1,
  }

  // 2. Drag out of the container.
  const s3 = await state(page, pick.node, pick.conn)
  await drag(page, at, 0, -400)
  const s4 = await state(page, pick.node, pick.conn)
  result.dragOut = { commands: s4.history - s3.history, reparented: s4.parent !== s3.parent, from: s3.parent, to: s4.parent ?? '(view)' }

  // 3. Add a bend-point on a connection, undo.
  const mid = await page.evaluate(
    ([engine, id]) => {
      const sel =
        engine === 'custom' ? `[data-conn="${id}"] polyline` : engine === 'reactflow' ? `[data-id="${id}"] polyline, .react-flow__edge[data-id="${id}"] polyline` : `[data-element-id="${id}"] polyline`
      const line = document.querySelector(sel) as SVGPolylineElement
      const len = line.getTotalLength()
      const p = line.getPointAtLength(len / 2)
      const m = line.getScreenCTM()!
      return { x: p.x * m.a + m.e, y: p.y * m.d + m.f }
    },
    [engine, pick.conn],
  )
  const b0 = await state(page, pick.node, pick.conn)
  if (engine === 'diagramjs') await drag(page, mid, 30, 30, 10) // diagram-js: drag a segment to bend it
  else await page.mouse.dblclick(mid.x, mid.y)
  await page.waitForTimeout(100)
  const b1 = await state(page, pick.node, pick.conn)
  result.bend = { commands: b1.history - b0.history, added: b1.bends - b0.bends }
  await page.screenshot({ path: `${OUT}/${engine}-x${copies}-edited.png` })
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(100)
  const b2 = await state(page, pick.node, pick.conn)
  result.bendUndo = { restored: b2.bends === b0.bends }
  await page.keyboard.press('Control+z') // and the drag-out
  await page.waitForTimeout(100)
  await page.screenshot({ path: `${OUT}/${engine}-x${copies}-after.png` })

  // 4. Worst case: drag the largest top-level container (moves its whole subtree and every attached line).
  const big = await page.evaluate(() => {
    const v = window.__spike!.store.view('v-landscape')!
    const roots = v.nodes.filter((n) => !n.parent && !n.id.includes('~'))
    roots.sort((a, b) => b.bounds.width * b.bounds.height - a.bounds.width * a.bounds.height)
    return roots[0]!.id
  })
  const bigBox = (await page.locator(selector[engine]!(big)).first().boundingBox())!
  const bigAt = { x: bigBox.x + 4, y: bigBox.y + 4 }
  const h0 = await page.evaluate(() => window.__spike!.store.history.length)
  result.containerDragFrames = await frames(page, () => drag(page, bigAt, 36, 24, 40))
  result.containerCommands = (await page.evaluate(() => window.__spike!.store.history.length)) - h0
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(150)

  // 5. Pan the canvas from empty space.
  result.panFrames = await frames(page, () => drag(page, { x: 1580, y: 980 }, -300, -200, 40))

  const lat = await page.evaluate(() => (window as any).__lat)
  const med = (a: number[]) => +[...a].sort((x, y) => x - y)[Math.floor(a.length / 2)]!.toFixed(1)
  result.commitMs = med(lat.commit)
  result.undoMs = med(lat.undo)
  result.errors = errors
  await browser.close()
  return result
}

const VIDEO = process.env.VIDEO === '1'
const THROTTLE = Number(process.argv[4] ?? '1')
const engines = (process.argv[2] ?? 'custom,reactflow,diagramjs').split(',')
const copies = (process.argv[3] ?? '1,6').split(',').map(Number)
const results: any[] = []
for (const e of engines) for (const c of copies) {
  try {
    results.push({ throttle: THROTTLE, ...(await run(e, c)) })
  } catch (err) {
    results.push({ engine: e, copies: c, failed: String(err) })
  }
}
console.log(JSON.stringify(results, null, 1))
