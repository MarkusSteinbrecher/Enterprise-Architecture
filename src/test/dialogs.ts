import type userEvent from '@testing-library/user-event'

/**
 * A press on a modal's backdrop, outside the dialog itself (#157). It is a
 * real press, mousedown and all, so the browser's default for it runs, as it
 * does in a browser: user-event focuses what is under the pointer unless the
 * press was prevented. A `fireEvent.mouseDown` would skip that default, and
 * with it the bug this exists to catch.
 */
export function pressOutside(user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement) {
  const overlay = dialog.parentElement
  if (overlay?.getAttribute('role') !== 'presentation') {
    throw new Error('the dialog is not drawn directly on a DialogOverlay')
  }
  return user.pointer({ keys: '[MouseLeft]', target: overlay })
}
