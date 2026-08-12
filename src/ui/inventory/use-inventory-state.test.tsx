import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { encodeFacets, parseFacets, useInventoryState } from './use-inventory-state'

/**
 * Inventory URL state, driven through a real router history.
 *
 * The screen's own tests render under `MemoryRouter`, whose stack `window.history`
 * cannot reach — which is part of why "back/forward preserve filter state" was an
 * acceptance criterion with no test behind it, and false. This harness owns a
 * Back control, so pushing and replacing are observable.
 */

function Harness() {
  const state = useInventoryState()
  const navigate = useNavigate()
  return (
    <div>
      <span data-testid="facets">{state.facets.join('|')}</span>
      <span data-testid="query">{state.query}</span>
      <span data-testid="mode">{state.mode}</span>
      <button type="button" onClick={() => state.setFacets([...state.facets, 'layer:app'])}>
        add layer
      </button>
      <button type="button" onClick={() => state.setFacets([...state.facets, 'time:Invest'])}>
        add time
      </button>
      <button type="button" onClick={() => state.setMode('OR')}>
        or
      </button>
      <button type="button" onClick={() => state.setQuery(`${state.query}x`)}>
        type
      </button>
      <button type="button" onClick={() => navigate(-1)}>
        back
      </button>
    </div>
  )
}

function mount(entry = '/inventory') {
  return render(
    <MemoryRouter
      initialEntries={[entry]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/inventory" element={<Harness />} />
      </Routes>
    </MemoryRouter>,
  )
}

const facets = () => screen.getByTestId('facets').textContent
const query = () => screen.getByTestId('query').textContent

describe('history', () => {
  it('pushes an entry per discrete action, so Back undoes one filter', async () => {
    mount()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'add layer' }))
    await user.click(screen.getByRole('button', { name: 'add time' }))
    expect(facets()).toBe('layer:app|time:Invest')

    // Every update used to pass `{ replace: true }`, so nothing was ever pushed
    // and the first Back left the inventory entirely, losing every filter.
    await user.click(screen.getByRole('button', { name: 'back' }))
    expect(facets()).toBe('layer:app')
  })

  it('pushes a combinator change too', async () => {
    mount()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'add layer' }))
    await user.click(screen.getByRole('button', { name: 'or' }))
    expect(screen.getByTestId('mode')).toHaveTextContent('OR')

    await user.click(screen.getByRole('button', { name: 'back' }))
    expect(screen.getByTestId('mode')).toHaveTextContent('AND')
    expect(facets()).toBe('layer:app')
  })

  it('replaces on the name query, so Back is not a character-by-character rewind', async () => {
    mount()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'add layer' }))
    for (let i = 0; i < 3; i += 1) {
      await user.click(screen.getByRole('button', { name: 'type' }))
    }
    expect(query()).toBe('xxx')

    // One Back undoes the facet, not the third letter.
    await user.click(screen.getByRole('button', { name: 'back' }))
    expect(facets()).toBe('')
    expect(query()).toBe('')
  })
})

describe('facet encoding', () => {
  it('round-trips a value containing the separator', () => {
    const facet = 'tag:Risk, high'
    expect(parseFacets(encodeFacets([facet]))).toEqual([facet])
  })

  it('round-trips a value that looks like the escaped form', () => {
    // The decoder has to be unambiguous too, or a tag named `a%2Cb` decodes to
    // `a,b` and splits into two facets that filter on nothing.
    const facet = 'tag:a%2Cb'
    const encoded = encodeFacets([facet])
    expect(encoded).not.toContain(',')
    expect(parseFacets(encoded)).toEqual([facet])
  })

  it('keeps a value whose whitespace is load-bearing', () => {
    // `.trim()` used to mutate values on the way back in.
    const facet = 'tag: leading and trailing '
    expect(parseFacets(encodeFacets([facet]))).toEqual([facet])
  })

  it('round-trips several facets, separator-bearing and not', () => {
    const list = ['layer:app', 'tag:Risk, high', 'tag:a%2Cb', 'lifecycle:endOfLife']
    expect(parseFacets(encodeFacets(list))).toEqual(list)
  })

  it('drops what it cannot parse instead of counting it', () => {
    // `?facets=bogus` used to be counted by the result line, rendered by nothing
    // in the chip bar, and skipped by the filter — three readings, three answers.
    expect(parseFacets('bogus')).toEqual([])
    expect(parseFacets('nogroup:x')).toEqual([])
    // A malformed escape is a URL nobody could have produced.
    expect(parseFacets('%zz')).toEqual([])
    expect(parseFacets(`%zz,${encodeURIComponent('layer:app')}`)).toEqual(['layer:app'])
  })

  it('dedupes', () => {
    expect(parseFacets('layer%3Aapp,layer%3Aapp')).toEqual(['layer:app'])
  })
})
