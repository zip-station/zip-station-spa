import type { CSSProperties } from 'react'
import {
  BUILTIN_CARD_TYPES,
  type BuiltInCardType,
  type KanbanCardType,
  type KanbanCardTypeResponse,
  type KanbanPriority,
  type KanbanStoryStatus,
} from '@/types/api'

/** Badge styling + label per lifecycle status, used by the backlog grid and status pickers. */
export const statusColors: Record<KanbanStoryStatus, string> = {
  Unreviewed: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  Backlog: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Committed: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
  Resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Archived: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  Obsolete: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
}

export const statusLabels: Record<KanbanStoryStatus, string> = {
  Unreviewed: 'Unreviewed',
  // Display label only — the enum/BSON value stays `Backlog`. "Accepted" reads as the triage gate
  // (reviewed & kept) and avoids colliding with the "Backlog" page name.
  Backlog: 'Accepted',
  Committed: 'Committed',
  Resolved: 'Resolved',
  Archived: 'Archived',
  Obsolete: 'Obsolete',
}

export const cardTypeColors: Record<BuiltInCardType, string> = {
  Feature: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Bug: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  Improvement: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  TechDebt: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
}

export const cardTypeLabels: Record<BuiltInCardType, string> = {
  Feature: 'Feature',
  Bug: 'Bug',
  Improvement: 'Improvement',
  TechDebt: 'Tech Debt',
}

export const priorityColors: Record<KanbanPriority, string> = {
  Low: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  Normal: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  High: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  Urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

const NEUTRAL_BADGE = 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'

function isBuiltIn(type: KanbanCardType): type is BuiltInCardType {
  return (BUILTIN_CARD_TYPES as string[]).includes(type)
}

/** Badge styling for a story type: a Tailwind `className` for built-ins, or an inline `style`
 *  (derived from the stored hex) for custom types. Pass the board's `customCardTypes` so custom
 *  types resolve; unknown ids (e.g. a cross-project story) fall back to a neutral badge. */
export interface CardTypeBadge {
  label: string
  className: string
  style?: CSSProperties
}

export function getCardTypeBadge(
  type: KanbanCardType,
  customTypes: KanbanCardTypeResponse[] = [],
): CardTypeBadge {
  if (isBuiltIn(type)) {
    return { label: cardTypeLabels[type], className: cardTypeColors[type] }
  }
  const custom = customTypes.find((t) => t.id === type)
  if (custom) {
    return custom.color
      ? { label: custom.label, className: '', style: customBadgeStyle(custom.color) }
      : { label: custom.label, className: NEUTRAL_BADGE }
  }
  return { label: 'Custom', className: NEUTRAL_BADGE }
}

export function getCardTypeLabel(
  type: KanbanCardType,
  customTypes: KanbanCardTypeResponse[] = [],
): string {
  return getCardTypeBadge(type, customTypes).label
}

/** Built-ins followed by the project's custom types, ready for a `<select>` or radio list.
 *  Built-ins use their name as the value; custom types use their stable id. */
export function cardTypeOptions(
  customTypes: KanbanCardTypeResponse[] = [],
): { value: string; label: string }[] {
  return [
    ...BUILTIN_CARD_TYPES.map((t) => ({ value: t, label: cardTypeLabels[t] })),
    ...customTypes.map((t) => ({ value: t.id, label: t.label })),
  ]
}

function customBadgeStyle(hex: string): CSSProperties {
  const rgb = hexToRgb(hex)
  if (!rgb) return {}
  return {
    color: hex,
    backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`,
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  let h = m[1]
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

export function formatStoryId(cardNumber: number): string {
  return `STR-${cardNumber}`
}
