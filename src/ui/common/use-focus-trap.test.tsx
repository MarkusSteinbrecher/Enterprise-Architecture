import { describe, expect, it } from 'vitest'
import { useRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useFocusTrap } from './use-focus-trap'

/**
 * The trap's ends are what the browser's Tab can reach. A roving tabindex
 * leaves items at `tabindex="-1"`, which Tab skips, so the trap must too: the
 * #181 review found ⇧Tab from a roving item leaving the magic connector's menu
 * for a button behind it.
 */

function Trapped() {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref)
  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-label="Trapped">
      <button type="button" tabIndex={-1}>
        Roving one
      </button>
      <button type="button" tabIndex={0}>
        Roving two
      </button>
      <button type="button" tabIndex={-1}>
        Roving three
      </button>
      <button type="button">Cancel</button>
    </div>
  )
}

function Page() {
  return (
    <>
      <button type="button">Behind</button>
      <Trapped />
    </>
  )
}

describe('useFocusTrap', () => {
  it('enters on the first item Tab can reach, not on one it skips', () => {
    render(<Page />)
    expect(screen.getByRole('button', { name: 'Roving two' })).toHaveFocus()
  })

  it('keeps ⇧Tab from the roving item in line in the dialog', async () => {
    const user = userEvent.setup()
    render(<Page />)
    // The review's case: focus on the item in line, which is not the first button.
    screen.getByRole('button', { name: 'Roving two' }).focus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('wraps Tab from the last item to the first tabbable one', async () => {
    const user = userEvent.setup()
    render(<Page />)
    screen.getByRole('button', { name: 'Cancel' }).focus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Roving two' })).toHaveFocus()
  })
})
