export type QueuePlacement = 'next' | 'end'

export function insertInQueue<T>(queue: T[], currentIndex: number, track: T, placement: QueuePlacement): T[] {
  const next = [...queue]
  const index = placement === 'next' ? Math.max(0, Math.min(currentIndex + 1, next.length)) : next.length
  next.splice(index, 0, track)
  return next
}
