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

/**
 * Is a modal dialog on screen?
 *
 * The other half of the same question. `isTypingTarget` asks whether *this*
 * element swallows letters; a modal makes the question moot for the whole page,
 * because a bare `g` that navigates away unmounts the dialog and discards
 * whatever was half-typed into it.
 *
 * The palette guards its own modal with a boolean it happens to own. The create
 * dialog (#8) could not: type a name, Tab to Create — focus is now a button,
 * which is not a typing target — and the next `g` threw the form away. Asking
 * the DOM instead of keeping a registry means the next modal is covered on the
 * day it is written rather than on the day someone remembers.
 */
export function isModalOpen(doc: Document = document): boolean {
  return doc.querySelector('[role="dialog"][aria-modal="true"]') !== null
}
