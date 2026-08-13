import { useEffect, type RefObject } from 'react'

/**
 * Make `aria-modal="true"` true.
 *
 * A dialog that declares the role and then lets Tab walk out of it is worse than
 * one that declares nothing: assistive tech switches to modal navigation and
 * hides the background, so focus that escapes lands on controls the user cannot
 * see — and in this app, one of them downloads a file. The three things the
 * declaration promises are focus entering, focus staying, and focus going back
 * where it came from; none of them is statically detectable, which is why they
 * keep being missed.
 *
 * Escape stays with the caller: some dialogs cancel, some confirm.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const container = ref.current
    if (!container) return
    const opener = document.activeElement

    // Deliberately not filtered on `offsetParent`: jsdom reports null for every
    // element, so that check empties the trap in exactly the environment the
    // tests run in — a guard that only works where it is never exercised. The
    // selector already excludes the disabled and the untabbable.
    const focusable = () => [
      ...container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ]

    // Entering matters as much as staying: focus left on the page behind means
    // the first Tab is already outside.
    if (!container.contains(document.activeElement)) focusable()[0]?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const nodes = focusable()
      if (nodes.length === 0) return
      const first = nodes[0]!
      const last = nodes[nodes.length - 1]!
      const active = document.activeElement

      if (!container.contains(active)) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      } else if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      if (opener instanceof HTMLElement && opener !== document.body) opener.focus()
    }
  }, [ref])
}
