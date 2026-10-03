import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import claimsXml from '@/io/fixtures/claims-platform.xml?raw'
import { importExchangeXml } from '@/io'
import { renderApp } from '@/test/render'
import type * as ExportView from './export-view'

// The real rasteriser cannot run in jsdom (no image decoding, no canvas), and
// this test is about what the screen does when it fails: show why, not a blank file.
vi.mock('./export-view', async (original) => ({
  ...(await original<typeof ExportView>()),
  rasterise: () => Promise.reject(new Error('The browser could not draw the exported SVG.')),
}))

describe('PNG export failure', () => {
  it('shows the reason instead of downloading an empty image', async () => {
    const workspace = importExchangeXml(claimsXml).workspace!
    renderApp(workspace, { route: '/view/v-landscape' })
    await screen.findByTestId('view-canvas')
    expect(screen.queryByRole('alert')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Export PNG' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'PNG export failed: The browser could not draw the exported SVG.',
    )
  })
})
