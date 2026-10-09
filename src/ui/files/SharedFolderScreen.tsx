import { useEffect, useState } from 'react'
import {
  browserFolder,
  failure,
  folderPermission,
  listFolder,
  pickDirectory,
  supportsDirectoryAccess,
  type FolderListing,
  type SharedFolderSettings,
} from '@/io/shared-folder'
import {
  listFolders,
  loadSettings,
  rememberFolder,
  saveSettings,
  type StoredFolder,
} from '@/store/shared-folder-storage'
import './shared-folder.css'

/**
 * The way into a shared folder (#147, spec §4): pick a folder that a sync
 * client keeps in step on every architect's machine, or reopen one picked
 * before, and see the models in it.
 *
 * A folder picked on an earlier visit is offered again without the picker,
 * but the browser asks again before the app may write into it, and only from a
 * click, so reopening one is a button rather than something done on load.
 * The first folder opened asks for the name colleagues will see on the lock.
 */

type Opened =
  { folder: StoredFolder; listing: FolderListing } | { folder: StoredFolder; denied: true }

export function SharedFolderScreen() {
  const supported = supportsDirectoryAccess()
  const [folders, setFolders] = useState<StoredFolder[]>([])
  const [settings, setSettings] = useState<SharedFolderSettings | undefined>(undefined)
  const [opened, setOpened] = useState<Opened | undefined>(undefined)
  const [problem, setProblem] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!supported) return
    let live = true
    void Promise.all([listFolders(), loadSettings()]).then(([stored, loaded]) => {
      if (!live) return
      setFolders(stored)
      setSettings(loaded)
    })
    return () => {
      live = false
    }
  }, [supported])

  if (!supported) {
    return (
      <div className="shared-folder">
        <div className="shared-folder__inner">
          <h1 className="shared-folder__title">Shared folder</h1>
          <p className="shared-folder__lead" role="note">
            Shared folders need a Chromium browser, such as Edge or Chrome. Firefox and Safari
            cannot write into a folder you pick, so here a model is saved by downloading a file.
          </p>
        </div>
      </div>
    )
  }

  const open = async (folder: StoredFolder) => {
    setProblem(undefined)
    try {
      if ((await folderPermission(folder.handle, { request: true })) !== 'granted') {
        setOpened({ folder, denied: true })
        return
      }
      setOpened({ folder, listing: await listFolder(browserFolder(folder.handle)) })
    } catch (error) {
      setProblem(`“${folder.name}” could not be read: ${message(error)}`)
    }
  }

  const pick = async () => {
    setProblem(undefined)
    try {
      const handle = await pickDirectory()
      if (!handle) return
      const folder = await rememberFolder(handle)
      setFolders(await listFolders())
      await open(folder)
    } catch (error) {
      setProblem(`The folder could not be opened: ${message(error)}`)
    }
  }

  const needsName = opened !== undefined && settings !== undefined && settings.displayName === ''

  return (
    <div className="shared-folder">
      <div className="shared-folder__inner">
        <h1 className="shared-folder__title">Shared folder</h1>
        <p className="shared-folder__lead">
          Open a folder that OneDrive, SharePoint, Dropbox or a network drive keeps in step on
          everyone’s machine. One person edits a model at a time; everyone else sees it read-only,
          and the app says when two versions met.
        </p>

        <div className="shared-folder__actions">
          <button type="button" className="button button--primary" onClick={() => void pick()}>
            Open folder…
          </button>
        </div>

        {problem && (
          <p className="shared-folder__problem" role="alert">
            {problem}
          </p>
        )}

        {folders.length > 0 && (
          <section className="shared-folder__section" aria-label="Folders opened before">
            <div className="section-label">Opened before</div>
            <ul className="shared-folder__list">
              {folders.map((folder) => (
                <li key={folder.key} className="shared-folder__row">
                  <span className="shared-folder__name">{folder.name}</span>
                  <button
                    type="button"
                    className="button"
                    aria-label={`Open ${folder.name}`}
                    onClick={() => void open(folder)}
                  >
                    Open
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {opened && 'denied' in opened && (
          <p className="shared-folder__problem" role="alert">
            This browser did not allow Archipelago to write into “{opened.folder.name}”. Open it
            again and allow it to edit files there.
          </p>
        )}

        {needsName && settings && (
          <NameForm
            onSave={async (displayName) => {
              const result = await saveSettings({ ...settings, displayName })
              if (result.ok) setSettings(result.settings)
              return result.ok
            }}
          />
        )}

        {!needsName && opened && 'listing' in opened && (
          <Listing name={opened.folder.name} listing={opened.listing} />
        )}
      </div>
    </div>
  )
}

/** The name colleagues see on the lock, asked once (#147). */
function NameForm({ onSave }: { onSave: (name: string) => Promise<boolean> }) {
  const [name, setName] = useState('')
  return (
    <form
      className="shared-folder__section"
      aria-label="Your name on the lock"
      onSubmit={(event) => {
        event.preventDefault()
        if (name.trim() !== '') void onSave(name)
      }}
    >
      <label className="dialog__field">
        <span className="dialog__label">Your name, as colleagues will see it</span>
        <input
          className="dialog__control"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
        />
      </label>
      <p className="shared-folder__note">
        Whoever is editing a model is shown by this name, so others know whom to ask. You can change
        it later.
      </p>
      <div className="shared-folder__actions">
        <button type="submit" className="button button--primary" disabled={name.trim() === ''}>
          Continue
        </button>
      </div>
    </form>
  )
}

function Listing({ name, listing }: { name: string; listing: FolderListing }) {
  return (
    <section className="shared-folder__section" aria-label={`Models in ${name}`}>
      <div className="section-label">
        {name} · {listing.models.length} {listing.models.length === 1 ? 'model' : 'models'}
      </div>
      {listing.models.length === 0 ? (
        <p className="shared-folder__note">There is no Archipelago model (.json) in this folder.</p>
      ) : (
        <ul className="shared-folder__list">
          {listing.models.map((model) => (
            <li key={model} className="shared-folder__row">
              <span className="shared-folder__file">{model}</span>
            </li>
          ))}
        </ul>
      )}
      {listing.conflictCopies.length > 0 && (
        <>
          <div className="section-label">Possible conflict copies</div>
          <ul className="shared-folder__list">
            {listing.conflictCopies.map((copy) => (
              <li key={copy.name} className="shared-folder__row">
                <span className="shared-folder__file">{copy.name}</span>{' '}
                <span className="shared-folder__note">
                  may be a copy of <span className="shared-folder__file">{copy.of}</span> kept by
                  the sync client
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function message(error: unknown): string {
  return failure(error)
}
