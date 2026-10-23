import { useEffect, useRef } from 'react'
import { useModelStoreContext } from '@/store'

/**
 * Takes focus in the commit that makes the tab a reader, as a refused save's
 * dialog does: a shared-folder save refused with `lock-lost` turns the tab
 * into a reader and mounts the refusal, whose focus trap moves focus in its
 * first effect. A field still on screen in that commit is blurred, and its
 * blur commits what was typed (#195 review).
 */
export function TakesFocusAsReader() {
  const { role } = useModelStoreContext()
  const button = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (role === 'reader') button.current?.focus()
  }, [role])
  return (
    <button ref={button} type="button">
      Elsewhere
    </button>
  )
}
