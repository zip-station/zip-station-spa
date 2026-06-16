import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface KanbanStore {
  // Column ids are globally-unique ObjectIds, so a flat list scopes correctly across projects.
  collapsedColumnIds: string[]
  toggleColumnCollapsed: (columnId: string) => void
  isColumnCollapsed: (columnId: string) => boolean
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
    }),
    {
      name: 'zipstation-kanban',
    }
  )
)
