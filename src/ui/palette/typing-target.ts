/**
 * Is the user typing into something?
 *
 * This is the fix for the first of the handoff's two known prototype gaps: the
 * prototype's single-letter shortcuts only checked whether the palette was open,
 * so typing "graph" into the inventory's name filter navigated away on the `g`.
 * Any global single-letter binding has to check this first.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true

  const tag = target.tagName
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (tag === 'INPUT') {
    // Checkboxes, radios and buttons are inputs that do not swallow letters.
    const type = (target as HTMLInputElement).type
    return !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color'].includes(type)
  }
  return false
}
