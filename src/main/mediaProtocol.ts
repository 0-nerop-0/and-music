import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { extname } from 'node:path'
import { Readable } from 'node:stream'

const MIME_TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg', '.flac': 'audio/flac', '.wav': 'audio/wav',
  '.ogg': 'audio/ogg', '.aac': 'audio/aac', '.m4a': 'audio/mp4',
  '.wma': 'audio/x-ms-wma', '.opus': 'audio/ogg',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif',
}

function byteRange(header: string, size: number): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match || size <= 0) return null
  const [, startText, endText] = match
  if (!startText && !endText) return null
  const start = startText ? Number(startText) : Math.max(0, size - Number(endText))
  const end = startText && endText ? Math.min(size - 1, Number(endText)) : size - 1
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start) return null
  return { start, end }
}

export async function serveMedia(request: Request, filePath: string): Promise<Response> {
  let size: number
  try {
    const info = await stat(filePath)
    if (!info.isFile()) return new Response(null, { status: 404 })
    size = info.size
  } catch {
    return new Response(null, { status: 404 })
  }

  const rangeHeader = request.headers.get('range')
  const range = rangeHeader ? byteRange(rangeHeader, size) : null
  if (rangeHeader && !range) {
    return new Response(null, { status: 416, headers: { 'content-range': `bytes */${size}` } })
  }

  const start = range?.start ?? 0
  const end = range?.end ?? size - 1
  const headers: Record<string, string> = {
    'content-type': MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
    'content-length': String(range ? end - start + 1 : size),
    'accept-ranges': 'bytes',
    'access-control-allow-origin': '*',
  }
  if (range) headers['content-range'] = `bytes ${start}-${end}/${size}`
  const body = request.method === 'HEAD' || size === 0
    ? null
    : Readable.toWeb(createReadStream(filePath, { start, end })) as unknown as BodyInit
  return new Response(body, { status: range ? 206 : 200, headers })
}
