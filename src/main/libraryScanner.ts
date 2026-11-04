import { opendir } from 'node:fs/promises'
import { join, extname } from 'node:path'

const AUDIO_EXTENSIONS = new Set(['.mp3', '.flac', '.wav', '.ogg', '.aac', '.m4a', '.wma', '.opus'])

export async function collectAudioFiles(root: string): Promise<{ files: string[]; directories: string[] }> {
  const files: string[] = []
  const directories: string[] = []
  const pending = [root]

  while (pending.length) {
    const directory = pending.pop()!
    try {
      const handle = await opendir(directory)
      directories.push(directory)
      for await (const entry of handle) {
        const fullPath = join(directory, entry.name)
        if (entry.isDirectory()) pending.push(fullPath)
        else if (entry.isFile() && AUDIO_EXTENSIONS.has(extname(entry.name).toLowerCase())) files.push(fullPath)
      }
    } catch {
      // Missing or inaccessible directories are omitted on the next refresh.
    }
  }

  files.sort()
  return { files, directories }
}

export function stableTrackId(filePath: string): number {
  let hash = 2166136261
  for (let i = 0; i < filePath.length; i++) {
    hash ^= filePath.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}
