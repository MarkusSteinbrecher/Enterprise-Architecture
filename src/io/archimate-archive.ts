import { importArchimate } from './archimate-native'
import { listed } from './exchange-xml'
import { failed, problem, type ImportProblem, type ImportResult } from './problems'
import { readZipDirectory, readZipEntry, ZipError, type ZipFault } from './zip'

/**
 * An Archi model saved with images (#97). Archi stores such a model as a zip
 * archive under the same `.archimate` name (`ArchiveManager`): the model as
 * `model.xml`, and each image under `images/`. The model is read by
 * `importArchimate`, exactly as an unzipped file is; the images are not carried
 * (#170), so each shape and specialization that shows one is reported by the
 * model reader, and the archive's image files are listed here.
 *
 * An archive this cannot read is refused with the reason, never read in part.
 */

const MODEL_ENTRY = 'model.xml'
const IMAGES_FOLDER = 'images/'

/** The zip signature, `PK\x03\x04`: how a zipped model is told from a plain one. */
export function isZipArchive(bytes: Uint8Array): boolean {
  return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
}

export async function importArchimateArchive(
  bytes: Uint8Array,
  file?: string,
): Promise<ImportResult> {
  const where = file ? { file } : {}
  const name = file ? `“${file}”` : 'The file'
  let xml: string
  let names: string[]
  try {
    const entries = readZipDirectory(bytes)
    names = entries.map((entry) => entry.name)
    const model = entries.find((entry) => entry.name === MODEL_ENTRY)
    if (!model) {
      const holds = names.filter((n) => !n.endsWith('/'))
      return failed([
        problem(
          'error',
          'archimate.archive-no-model',
          `${name} is a zip archive with no ${MODEL_ENTRY} in it, so it is not an Archi model. ${holds.length ? `It holds ${holds.length} file${holds.length === 1 ? '' : 's'} (${listed(holds)}).` : 'It is empty.'}`,
          where,
        ),
      ])
    }
    xml = new TextDecoder('utf-8').decode(await readZipEntry(bytes, model))
  } catch (error) {
    if (!(error instanceof ZipError)) throw error
    return failed([
      problem('error', `archimate.archive-${error.fault}`, refusal(name, error), where),
    ])
  }

  const result = importArchimate(xml, file)
  if (!result.ok) return result
  return { ...result, problems: [...result.problems, ...archiveContents(names, where)] }
}

/** What the archive holds besides the model: images, reported once, and anything else. */
function archiveContents(names: readonly string[], where: { file?: string }): ImportProblem[] {
  // A folder entry holds nothing; Archi writes none, and other tools do.
  const files = names.filter((n) => n !== MODEL_ENTRY && !n.endsWith('/'))
  const images = files.filter((n) => n.startsWith(IMAGES_FOLDER))
  const others = files.filter((n) => !n.startsWith(IMAGES_FOLDER))
  const problems: ImportProblem[] = []
  if (images.length) {
    problems.push(
      problem(
        'warning',
        'archimate.archive-images-skipped',
        `The archive holds ${images.length} image${images.length === 1 ? '' : 's'} (${listed(images)}), which Archipelago does not carry yet, so ${images.length === 1 ? 'it was' : 'they were'} not imported. Each shape and specialization that showed one is listed.`,
        where,
      ),
    )
  }
  if (others.length) {
    problems.push(
      problem(
        'warning',
        'archimate.archive-entry-unread',
        `The archive holds ${others.length} file${others.length === 1 ? '' : 's'} besides the model and its images (${listed(others)}), which Archi does not write and Archipelago did not read.`,
        where,
      ),
    )
  }
  return problems
}

const REASONS: Record<ZipFault, string> = {
  truncated: 'The archive is cut short or damaged',
  signature: 'The archive is damaged',
  zip64:
    'The archive uses ZIP64, the extension only an archive over 4 GB or 65,535 files needs, which Archipelago does not read',
  split: 'The archive is split across several files, which Archipelago does not read',
  encrypted: 'The archive is encrypted, which Archipelago cannot read',
  method:
    'The archive is compressed in a way Archipelago does not read; it reads stored and deflated files, as Archi writes them',
  corrupt: 'The archive is damaged',
  duplicate: 'The archive is ambiguous',
  'inflate-unavailable':
    'This browser cannot decompress it: it has no DecompressionStream for raw deflate. Open it in a current browser',
}

function refusal(name: string, error: ZipError): string {
  // A zip under any name reaches this, so the message claims only that it is
  // one: a damaged archive cannot say whether Archi wrote it.
  return `${name} is a zip archive, which is how Archi saves a model with images. ${REASONS[error.fault]} (${error.detail}), so it was not opened. If it is an Archi model, File → Export → Model to Open Exchange File in Archi writes a file Archipelago opens.`
}
