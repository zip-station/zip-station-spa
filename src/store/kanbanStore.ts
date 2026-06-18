import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { KanbanFilters } from '@/components/Kanban/FilterBar'

export const defaultKanbanFilters: KanbanFilters = {
  query: '',
  assignedTo: '',
  type: '',
  tags: [],
  hasLinkedTickets: 'any',
  includeArchived: false,
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
    }),
    {
      name: 'zipstation-kanban',
      // Persist only column-collapse state. Filters are intentionally left in
      // memory so a page refresh starts with a clean board.
      partialize: (state) => ({ collapsedColumnIds: state.collapsedColumnIds }),
    }
  )
)
