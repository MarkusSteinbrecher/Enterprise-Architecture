import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useModelStore } from '@/store'
import { newView } from './create'

/** Route state that tells a view it was just made, so it opens with its name field focused. */
export interface ViewRouteState {
  naming?: boolean
}

/**
 * Make a new, empty view, filed in `folder` or directly under Views, and open
 * it ready to edit with its name field focused (#130). One command. The model
 * tree and the command palette both create views through this.
 */
export function useCreateView(): (folder?: string) => string {
  const store = useModelStore()
  const navigate = useNavigate()
  return useCallback(
    (folder?: string) => {
      const view = store.addView(newView(folder))
      const state: ViewRouteState = { naming: true }
      navigate(`/view/${encodeURIComponent(view.id)}`, { state })
      return view.id
    },
    [store, navigate],
  )
}
