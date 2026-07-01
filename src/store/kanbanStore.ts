import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { KanbanFilters } from '@/components/Kanban/FilterBar'
import type { KanbanPriority, KanbanStoryStatus } from '@/types/api'

export const defaultKanbanFilters: KanbanFilters = {
  query: '',
  assignedTo: '',
  type: '',
  tags: [],
  hasLinkedTickets: 'any',
}

/** Backlog grid view state — kept in memory so opening a story and coming back restores the
 *  scope, filters, sort and scroll position the user left. `scope` of '' means "the current
 *  project" (resolved by the grid on mount). */
export interface BacklogUiState {
  scope: string
  statuses: KanbanStoryStatus[]
  query: string
  /** Board column id to filter to (single-project scope only). '' = all columns. */
  columnId: string
  type: string
  priority: KanbanPriority | ''
  assignedTo: string
  sorting: { id: string; desc: boolean }[]
  scrollTop: number
}

export const defaultBacklogUi: BacklogUiState = {
  scope: '',
  statuses: ['Unreviewed', 'Backlog', 'Committed'],
  query: '',
  columnId: '',
  type: '',
  priority: '',
  assignedTo: '',
  sorting: [],
  scrollTop: 0,
}

interface KanbanStore {
  // Column ids are globally-unique ObjectIds, so a flat list scopes correctly across projects.
  collapsedColumnIds: string[]
  toggleColumnCollapsed: (columnId: string) => void
  isColumnCollapsed: (columnId: string) => boolean
  // Board filters survive in-app navigation (opening a card unmounts the board)
  // but reset on reload — see partialize below, which keeps them out of storage.
  filters: KanbanFilters
  setFilters: (filters: KanbanFilters) => void
  // Which tab the kanban page is on (Board vs Backlog). Kept so "back to board" from a story
  // returns to the tab the user came from.
  kanbanTab: 'board' | 'backlog'
  setKanbanTab: (tab: 'board' | 'backlog') => void
  // Backlog grid view state (scope/filters/sort/scroll), preserved across navigation.
  backlogUi: BacklogUiState
  setBacklogUi: (patch: Partial<BacklogUiState>) => void
}

export const useKanbanStore = create<KanbanStore>()(
  persist(
    (set, get) => ({
      collapsedColumnIds: [],
      toggleColumnCollapsed: (columnId) =>
        set((state) => ({
          collapsedColumnIds: state.collapsedColumnIds.includes(columnId)
            ? state.collapsedColumnIds.filter((id) => id !== columnId)
            : [...state.collapsedColumnIds, columnId],
        })),
      isColumnCollapsed: (columnId) => get().collapsedColumnIds.includes(columnId),
      filters: defaultKanbanFilters,
      setFilters: (filters) => set({ filters }),
      kanbanTab: 'board',
      setKanbanTab: (kanbanTab) => set({ kanbanTab }),
      backlogUi: defaultBacklogUi,
      setBacklogUi: (patch) => set((state) => ({ backlogUi: { ...state.backlogUi, ...patch } })),
    }),
    {
      name: 'zipstation-kanban',
      // Persist only column-collapse state. Filters / tab / backlog view state are intentionally
      // left in memory so a page refresh starts clean, but survive in-app navigation.
      partialize: (state) => ({ collapsedColumnIds: state.collapsedColumnIds }),
    }
  )
)
