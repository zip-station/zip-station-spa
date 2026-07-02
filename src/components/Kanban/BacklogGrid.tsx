import { useMemo, useState, useRef, useEffect, useLayoutEffect, createContext, useContext } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type RowSelectionState,
} from '@tanstack/react-table'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDown, ArrowUp, ChevronsUpDown, GripVertical, Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useSelectedProject } from '@/hooks/useSelectedProject'
import {
  useBacklog,
  useBulkUpdateStories,
  useReorderBacklogStory,
  useCreateKanbanCard,
  useKanbanBoard,
} from '@/hooks/useKanbanBoard'
import { useKanbanStore } from '@/store/kanbanStore'
import { backlogMidpoint } from '@/lib/backlog'
import { KANBAN_STATUS_ORDER } from '@/types/api'
import type {
  BacklogFilters,
  CreateKanbanCardRequest,
  KanbanCardTypeResponse,
  KanbanPriority,
  KanbanStorySummaryResponse,
  KanbanStoryStatus,
  ProjectResponse,
  UserResponse,
} from '@/types/api'
import { CreateCardModal } from './CreateCardModal'
import {
  cardTypeOptions,
  formatStoryId,
  getCardTypeBadge,
  priorityColors,
  statusColors,
  statusLabels,
} from './kanbanStyles'

const DEFAULT_STATUSES: KanbanStoryStatus[] = ['Unreviewed', 'Backlog', 'Committed']
const PRIORITIES: KanbanPriority[] = ['Low', 'Normal', 'High', 'Urgent']

// Map a react-table column id to the backlog endpoint's sort key (those it supports server-side).
const SORTABLE: Record<string, BacklogFilters['sort']> = {
  number: 'number',
  title: 'title',
  priority: 'priority',
  updated: 'updated',
}

// dnd-kit sortable handle props, threaded from the <tr> (which owns useSortable) down to the grip
// cell that react-table renders, so only the grip — not the whole row — starts a drag.
type SortableHandle = Pick<ReturnType<typeof useSortable>, 'attributes' | 'listeners'>
const RowDragContext = createContext<SortableHandle | null>(null)

function DragHandle() {
  const handle = useContext(RowDragContext)
  if (!handle) return null
  return (
    <button
      type="button"
      aria-label="Drag to reorder"
      className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
      {...handle.attributes}
      {...handle.listeners}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  )
}

interface BacklogGridProps {
  companyId: string
  projects: ProjectResponse[]
  currentProjectId: string | null
  members: UserResponse[]
  customCardTypes: KanbanCardTypeResponse[]
  canEdit: boolean
}

export function BacklogGrid({
  companyId,
  projects,
  currentProjectId,
  members,
  customCardTypes,
  canEdit,
}: BacklogGridProps) {
  const navigate = useNavigate()
  const { setSelectedProjectId } = useSelectedProject()

  // View state (scope/filters/sort/scroll) lives in the store so opening a story and coming back
  // restores exactly where the user was. `scope === ''` means "the current project".
  const ui = useKanbanStore((s) => s.backlogUi)
  const setUi = useKanbanStore((s) => s.setBacklogUi)
  const scope = ui.scope || (currentProjectId ?? 'all')
  const statuses = ui.statuses
  const sorting = ui.sorting as SortingState

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [createOpen, setCreateOpen] = useState(false)
  const [createAtTop, setCreateAtTop] = useState(false)

  const sortCol = sorting[0]
  const sort = sortCol ? SORTABLE[sortCol.id] ?? 'backlog' : 'backlog'
  const dir: BacklogFilters['dir'] = sortCol ? (sortCol.desc ? 'desc' : 'asc') : 'asc'

  // Column filter only applies within a single board, so load the scoped project's board for its
  // columns (and accurate custom types). Columns are per-board — meaningless in "All projects".
  const { data: scopedBoard } = useKanbanBoard(companyId, scope === 'all' ? null : scope)
  const boardColumns = useMemo(
    () => (scopedBoard ? [...scopedBoard.columns].sort((a, b) => a.position - b.position) : []),
    [scopedBoard],
  )

  const filters: BacklogFilters = useMemo(
    () => ({
      query: ui.query || undefined,
      projectIds: scope === 'all' ? undefined : [scope],
      status: statuses,
      columnId: scope === 'all' ? undefined : ui.columnId || undefined,
      type: ui.type || undefined,
      priority: ui.priority || undefined,
      assignedTo: ui.assignedTo || undefined,
      sort,
      dir,
    }),
    [ui.query, scope, statuses, ui.columnId, ui.type, ui.priority, ui.assignedTo, sort, dir],
  )

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useBacklog(companyId, filters)
  const stories = useMemo(() => data?.pages.flat() ?? [], [data])
  const bulk = useBulkUpdateStories(companyId)
  const reorder = useReorderBacklogStory(companyId)
  // Create is per-project, so it targets the single scoped project (disabled in "All projects").
  const createCard = useCreateKanbanCard(companyId, scope === 'all' ? null : scope)

  // Members alphabetized for every assignee dropdown in the grid.
  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email)),
    [members],
  )

  const userNamesById = useMemo(() => {
    const map = new Map<string, string>()
    members.forEach((m) => map.set(m.id, m.displayName || m.email))
    return map
  }, [members])

  const projectNamesById = useMemo(() => {
    const map = new Map<string, string>()
    projects.forEach((p) => map.set(p.id, p.name))
    return map
  }, [projects])

  const dragEnabled = canEdit && scope !== 'all' && sort === 'backlog'
  const rows = stories ?? []
  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id])

  // Restore the saved scroll position once rows are present; persist it (on unmount) so opening a
  // story and coming back lands at the same spot. A ref avoids a store write per scroll event.
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollTopRef = useRef(ui.scrollTop)
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el && !isLoading) el.scrollTop = scrollTopRef.current
    // Only run when the data set changes (initial load / refetch), not on every scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, rows.length])
  useEffect(() => () => setUi({ scrollTop: scrollTopRef.current }), [setUi])

  const handleCreate = async (data: CreateKanbanCardRequest) => {
    // New backlog stories are off-board (Backlog status); place at the chosen end of the list.
    const positions = rows.map((r) => r.backlogPosition)
    const backlogPosition = rows.length === 0
      ? undefined
      : createAtTop
        ? Math.min(...positions) - 1000
        : Math.max(...positions) + 1000
    await createCard.mutateAsync({ ...data, columnId: '', status: 'Backlog', backlogPosition })
  }

  const openStory = (story: KanbanStorySummaryResponse) => {
    // The detail page resolves the story within the selected project, so switch scope first.
    setSelectedProjectId(story.projectId)
    navigate({
      to: '/kanban/stories/$storyNumber',
      params: { storyNumber: String(story.cardNumber) },
      search: { fromTicket: undefined },
    })
  }

  const columns = useMemo(() => buildColumns({
    canEdit,
    dragEnabled,
    showProject: scope === 'all',
    customCardTypes,
    userNamesById,
    projectNamesById,
    onOpen: openStory,
  }), [canEdit, dragEnabled, scope, customCardTypes, userNamesById, projectNamesById])

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, rowSelection },
    getRowId: (row) => row.id,
    enableRowSelection: canEdit,
    manualSorting: true,
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      setUi({ sorting: next })
    },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
  })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const fromIdx = rows.findIndex((r) => r.id === active.id)
    const toIdx = rows.findIndex((r) => r.id === over.id)
    if (fromIdx === -1 || toIdx === -1) return

    // Re-order the visible list, then take the dragged row's new neighbours to compute a fractional
    // backlogPosition between them (rows are sorted ascending — lower = higher priority).
    const reordered = arrayMove(rows, fromIdx, toIdx)
    const pos = reordered.findIndex((r) => r.id === active.id)
    const dragged = reordered[pos]
    const newPos = backlogMidpoint(reordered[pos - 1]?.backlogPosition, reordered[pos + 1]?.backlogPosition)

    reorder.mutate({ projectId: dragged.projectId, cardId: dragged.id, backlogPosition: newPos })
  }

  const applyBulk = (patch: Parameters<typeof bulk.mutate>[0]) => {
    bulk.mutate(patch, { onSuccess: () => setRowSelection({}) })
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Filters */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={ui.query}
          onChange={(e) => setUi({ query: e.target.value })}
          placeholder="Search backlog..."
          className="h-9 w-56 rounded-md border border-input bg-background px-3 text-sm"
        />
        <select
          value={scope}
          onChange={(e) => setUi({ scope: e.target.value, columnId: '' })}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          title="Scope"
        >
          <option value="all">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {scope !== 'all' && boardColumns.length > 0 && (
          <select
            value={ui.columnId}
            onChange={(e) => setUi({ columnId: e.target.value })}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            title="Column"
          >
            <option value="">All columns</option>
            {boardColumns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
        <select
          value={ui.type}
          onChange={(e) => setUi({ type: e.target.value })}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">All types</option>
          {cardTypeOptions(customCardTypes).map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select
          value={ui.priority}
          onChange={(e) => setUi({ priority: e.target.value as KanbanPriority | '' })}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select
          value={ui.assignedTo}
          onChange={(e) => setUi({ assignedTo: e.target.value })}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">All assignees</option>
          <option value="unassigned">Unassigned</option>
          {sortedMembers.map((m) => (
            <option key={m.id} value={m.id}>{m.displayName || m.email}</option>
          ))}
        </select>

        {canEdit && (
          <div className="ml-auto inline-flex overflow-hidden rounded-md border">
            <button
              onClick={() => { setCreateAtTop(true); setCreateOpen(true) }}
              disabled={scope === 'all'}
              title={scope === 'all' ? 'Pick a single project to add a story' : 'Add a story to the top of the backlog'}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Top
            </button>
            <button
              onClick={() => { setCreateAtTop(false); setCreateOpen(true) }}
              disabled={scope === 'all'}
              title={scope === 'all' ? 'Pick a single project to add a story' : 'Add a story to the bottom of the backlog'}
              className="inline-flex items-center gap-1 border-l px-2.5 py-1.5 text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Bottom
            </button>
          </div>
        )}
      </div>

      {/* Status chips (which lifecycle buckets to show) */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {KANBAN_STATUS_ORDER.map((s) => {
          const active = statuses.includes(s)
          return (
            <button
              key={s}
              onClick={() =>
                setUi({ statuses: active ? statuses.filter((x) => x !== s) : [...statuses, s] })
              }
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                active ? 'border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : 'border-input text-muted-foreground hover:bg-accent'
              }`}
            >
              {statusLabels[s]}
            </button>
          )
        })}
        {(statuses.length !== DEFAULT_STATUSES.length ||
          !DEFAULT_STATUSES.every((s) => statuses.includes(s))) && (
          <Button variant="ghost" size="sm" onClick={() => setUi({ statuses: DEFAULT_STATUSES })}>
            Reset
          </Button>
        )}
      </div>

      {/* Bulk action toolbar */}
      {selectedIds.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <span className="font-medium">{selectedIds.length} selected</span>
          <span className="text-muted-foreground">·</span>
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) applyBulk({ cardIds: selectedIds, type: e.target.value })
              e.target.value = ''
            }}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="">Set type…</option>
            {cardTypeOptions(customCardTypes).map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) applyBulk({ cardIds: selectedIds, priority: e.target.value as KanbanPriority })
              e.target.value = ''
            }}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="">Set priority…</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <span className="text-muted-foreground">·</span>
          <Button size="sm" variant="outline" title="Pull onto the kanban board to start work" onClick={() => applyBulk({ cardIds: selectedIds, status: 'Committed' })}>
            Commit to board
          </Button>
          <Button size="sm" variant="outline" title="Accept into the prioritized backlog (not started)" onClick={() => applyBulk({ cardIds: selectedIds, status: 'Backlog' })}>
            Accept
          </Button>
          <Button size="sm" variant="outline" title="File away as handled" onClick={() => applyBulk({ cardIds: selectedIds, status: 'Archived' })}>
            Archive
          </Button>
          <Button size="sm" variant="outline" title="Scrapped / won't do" onClick={() => applyBulk({ cardIds: selectedIds, status: 'Obsolete' })}>
            Mark obsolete
          </Button>
          {(bulk.isPending || reorder.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setRowSelection({})}>
            Clear
          </Button>
        </div>
      )}

      {/* Grid */}
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget
          scrollTopRef.current = el.scrollTop
          // Load the next page as the user nears the bottom of the list.
          if (hasNextPage && !isFetchingNextPage &&
              el.scrollHeight - el.scrollTop - el.clientHeight < 300) {
            fetchNextPage()
          }
        }}
        className="flex-1 overflow-auto rounded-md border"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No stories match these filters.
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-card">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id} className="border-b">
                    {hg.headers.map((header) => {
                      const canSort = header.column.id in SORTABLE
                      const sorted = header.column.getIsSorted()
                      return (
                        <th
                          key={header.id}
                          className={`whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground ${
                            canSort ? 'cursor-pointer select-none hover:text-foreground' : ''
                          }`}
                          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                        >
                          <span className="inline-flex items-center gap-1">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {canSort &&
                              (sorted === 'asc' ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : sorted === 'desc' ? (
                                <ArrowDown className="h-3 w-3" />
                              ) : (
                                <ChevronsUpDown className="h-3 w-3 opacity-40" />
                              ))}
                          </span>
                        </th>
                      )
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                  {table.getRowModel().rows.map((row) => (
                    <BacklogRow key={row.id} rowId={row.id} dragEnabled={dragEnabled}>
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-3 py-2 align-middle">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </BacklogRow>
                  ))}
                </SortableContext>
              </tbody>
            </table>
          </DndContext>
        )}
        {isFetchingNextPage && (
          <div className="flex items-center justify-center py-3 border-t">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {dragEnabled && (
        <p className="mt-2 text-xs text-muted-foreground">
          Drag rows to prioritize. Switch to a single project and the default order to reorder.
        </p>
      )}

      <CreateCardModal
        open={createOpen}
        columnId=""
        members={sortedMembers}
        customCardTypes={customCardTypes}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  )
}

function BacklogRow({
  rowId,
  dragEnabled,
  children,
}: {
  rowId: string
  dragEnabled: boolean
  children: React.ReactNode
}) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({
    id: rowId,
    disabled: !dragEnabled,
  })
  return (
    <RowDragContext.Provider value={{ attributes, listeners }}>
      <tr
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        className={`border-b last:border-0 hover:bg-accent/40 ${isDragging ? 'relative z-10 bg-card opacity-80 shadow' : ''}`}
      >
        {children}
      </tr>
    </RowDragContext.Provider>
  )
}

interface ColumnDeps {
  canEdit: boolean
  dragEnabled: boolean
  showProject: boolean
  customCardTypes: KanbanCardTypeResponse[]
  userNamesById: Map<string, string>
  projectNamesById: Map<string, string>
  onOpen: (story: KanbanStorySummaryResponse) => void
}

function buildColumns(deps: ColumnDeps) {
  const col = createColumnHelper<KanbanStorySummaryResponse>()
  const cols = []

  if (deps.canEdit) {
    cols.push(
      col.display({
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            aria-label="Select all"
            checked={table.getIsAllRowsSelected()}
            ref={(el) => {
              if (el) el.indeterminate = table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()
            }}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label="Select row"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      }),
    )
  }

  if (deps.dragEnabled) {
    cols.push(
      col.display({
        id: 'drag',
        header: () => null,
        cell: () => <DragHandle />,
      }),
    )
  }

  cols.push(
    col.accessor('cardNumber', {
      id: 'number',
      header: 'ID',
      cell: (info) => (
        <span className="font-mono text-xs text-muted-foreground">{formatStoryId(info.getValue())}</span>
      ),
    }),
    col.accessor('title', {
      id: 'title',
      header: 'Title',
      cell: (info) => (
        <button
          className="max-w-[28rem] truncate text-left font-medium hover:text-primary hover:underline"
          onClick={() => deps.onOpen(info.row.original)}
          title={info.getValue()}
        >
          {info.getValue()}
        </button>
      ),
    }),
    col.accessor('status', {
      id: 'status',
      header: 'Status',
      enableSorting: false,
      cell: (info) => (
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[info.getValue()]}`}>
          {statusLabels[info.getValue()]}
        </span>
      ),
    }),
    col.accessor('type', {
      id: 'type',
      header: 'Type',
      enableSorting: false,
      cell: (info) => {
        const badge = getCardTypeBadge(info.getValue(), deps.customCardTypes)
        return (
          <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${badge.className}`} style={badge.style}>
            {badge.label}
          </span>
        )
      },
    }),
    col.accessor('priority', {
      id: 'priority',
      header: 'Priority',
      cell: (info) => (
        <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${priorityColors[info.getValue()]}`}>
          {info.getValue()}
        </span>
      ),
    }),
  )

  if (deps.showProject) {
    cols.push(
      col.accessor('projectId', {
        id: 'project',
        header: 'Project',
        enableSorting: false,
        cell: (info) => (
          <span className="text-xs text-muted-foreground">
            {info.row.original.projectName ?? deps.projectNamesById.get(info.getValue()) ?? '—'}
          </span>
        ),
      }),
    )
  }

  cols.push(
    col.accessor((r) => r.assignedToUserId ?? '', {
      id: 'assignee',
      header: 'Assignee',
      enableSorting: false,
      cell: (info) => {
        const id = info.getValue()
        return <span className="text-xs">{id ? deps.userNamesById.get(id) ?? 'Unknown' : '—'}</span>
      },
    }),
    col.accessor('updatedOnDateTime', {
      id: 'updated',
      header: 'Updated',
      cell: (info) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {new Date(info.getValue()).toLocaleDateString()}
        </span>
      ),
    }),
  )

  return cols
}
