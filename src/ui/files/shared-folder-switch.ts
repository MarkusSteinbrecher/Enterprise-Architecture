/**
 * Shared folders (#147) ship in three parts. Until the third lets a model be
 * opened from the folder, the way in stays hidden, unless this browser has
 * switched it on to try it (and the browser journey does):
 *
 *     localStorage.setItem('archipelago.sharedFolders', 'on')
 *
 * The third part removes this switch.
 */
export const SHARED_FOLDERS_SWITCH = 'archipelago.sharedFolders'

export function sharedFoldersEnabled(): boolean {
  try {
    return localStorage.getItem(SHARED_FOLDERS_SWITCH) === 'on'
  } catch {
    return false
  }
}
