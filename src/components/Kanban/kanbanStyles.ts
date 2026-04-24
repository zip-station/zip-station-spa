import type { KanbanCardType, KanbanPriority } from '@/types/api'

export const cardTypeColors: Record<KanbanCardType, string> = {
  Feature: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Bug: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  Improvement: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  TechDebt: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
}

export const cardTypeLabels: Record<KanbanCardType, string> = {
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

export function formatStoryId(cardNumber: number): string {
  return `STR-${cardNumber}`
}
