import type { BacklogFilters } from '@/types/api'

const POSITION_STEP = 1000

/**
 * Fractional rank between two adjacent backlog rows (sorted ascending, lower = higher priority).
 * Mirrors the board's column-position math so dragging never needs a full re-index.
 */
export function backlogMidpoint(before: number | undefined, after: number | undefined): number {
  if (before == null && after == null) return POSITION_STEP
  if (before == null) return after! - POSITION_STEP
  if (after == null) return before + POSITION_STEP
  return (before + after) / 2
}

/** Serialize backlog filters into the `GET /companies/{id}/stories/backlog` query string. */
export function buildBacklogQuery(filters: BacklogFilters): string {
  const parts: string[] = []
  if (filters.query) parts.push(`query=${encodeURIComponent(filters.query)}`)
  filters.projectIds?.forEach((id) => parts.push(`projectIds=${encodeURIComponent(id)}`))
  filters.boardIds?.forEach((id) => parts.push(`boardIds=${encodeURIComponent(id)}`))
  filters.status?.forEach((s) => parts.push(`status=${encodeURIComponent(s)}`))
  if (filters.type) parts.push(`type=${encodeURIComponent(filters.type)}`)
  if (filters.priority) parts.push(`priority=${encodeURIComponent(filters.priority)}`)
  filters.tags?.forEach((t) => parts.push(`tags=${encodeURIComponent(t)}`))
  if (filters.assignedTo) parts.push(`assignedTo=${encodeURIComponent(filters.assignedTo)}`)
  if (filters.sort) parts.push(`sort=${encodeURIComponent(filters.sort)}`)
  if (filters.dir) parts.push(`dir=${encodeURIComponent(filters.dir)}`)
  if (filters.limit != null) parts.push(`limit=${filters.limit}`)
  if (filters.skip != null) parts.push(`skip=${filters.skip}`)
  return parts.length > 0 ? `?${parts.join('&')}` : ''
}
