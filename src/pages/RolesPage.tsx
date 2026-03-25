import { useState } from 'react'
import { Shield, Plus, Loader2, Trash2, Pencil } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Toast } from '@/components/ui/Toast'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { usePermissions } from '@/hooks/usePermissions'
import { api } from '@/lib/api'

interface RoleResponse {
  id: string
  companyId: string
  name: string
  description?: string
  permissions: string[]
  isSystem: boolean
  createdOnDateTime: number
}

export function RolesPage() {
  const { companyId } = useCurrentUser()
  const { hasPermission } = usePermissions()
  const queryClient = useQueryClient()

  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Fetch roles
  const { data: roles, isLoading } = useQuery({
    queryKey: ['roles', companyId],
    queryFn: () => api.get<RoleResponse[]>(`/api/v1/companies/${companyId}/roles`),
    enabled: !!companyId,
  })

  // Fetch available permissions
  const { data: permissionGroups } = useQuery({
    queryKey: ['permissionGroups'],
    queryFn: () => api.get<Record<string, string[]>>('/api/v1/permissions'),
  })

  const createRole = useMutation({
    mutationFn: (data: { name: string; description?: string; permissions: string[] }) =>
      api.post<RoleResponse>(`/api/v1/companies/${companyId}/roles`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      resetForm()
      setSaved(true)
    },
    onError: (err: Error) => setError(err.message),
  })

  const updateRole = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; description?: string; permissions: string[] } }) =>
      api.put<RoleResponse>(`/api/v1/companies/${companyId}/roles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      queryClient.invalidateQueries({ queryKey: ['myPermissions'] })
      resetForm()
      setSaved(true)
    },
    onError: (err: Error) => setError(err.message),
  })

  const deleteRole = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/v1/companies/${companyId}/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      queryClient.invalidateQueries({ queryKey: ['myPermissions'] })
      setDeleteId(null)
    },
  })

  const resetForm = () => {
    setShowCreate(false)
    setEditingId(null)
    setName('')
    setDescription('')
    setSelectedPermissions(new Set())
    setError(null)
  }

  const startEdit = (role: RoleResponse) => {
    setEditingId(role.id)
    setName(role.name)
    setDescription(role.description || '')
    setSelectedPermissions(new Set(role.permissions))
    setShowCreate(false)
    setError(null)
  }

  const startCreate = () => {
    resetForm()
    setShowCreate(true)
  }

  const togglePermission = (perm: string) => {
    setSelectedPermissions(prev => {
      const next = new Set(prev)
      next.has(perm) ? next.delete(perm) : next.add(perm)
      return next
    })
  }

  const toggleGroup = (perms: string[]) => {
    setSelectedPermissions(prev => {
      const next = new Set(prev)
      const allSelected = perms.every(p => next.has(p))
      if (allSelected) {
        perms.forEach(p => next.delete(p))
      } else {
        perms.forEach(p => next.add(p))
      }
      return next
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const data = { name, description: description || undefined, permissions: Array.from(selectedPermissions) }
    if (editingId) {
      updateRole.mutate({ id: editingId, data })
    } else {
      createRole.mutate(data)
    }
  }

  const canCreate = hasPermission('Roles.Create')
  const canEdit = hasPermission('Roles.Edit')
  const canDelete = hasPermission('Roles.Delete')

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Roles & Permissions</h2>
          <p className="mt-1 text-muted-foreground">Manage roles and their permissions</p>
        </div>
        {canCreate && !showCreate && !editingId && (
          <Button onClick={startCreate}>
            <Plus className="mr-2 h-4 w-4" /> New Role
          </Button>
        )}
      </div>

      {saved && <Toast message="Role saved successfully" type="success" onClose={() => setSaved(false)} />}

      {/* Create / Edit form */}
      {(showCreate || editingId) && (
        <div className="mb-6 rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">{editingId ? 'Edit Role' : 'Create Role'}</h3>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Support Agent" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description <span className="text-muted-foreground">(optional)</span></label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of this role" />
              </div>
            </div>

            {/* Permission checkboxes */}
            <div className="space-y-4">
              <label className="text-sm font-medium">Permissions</label>
              {permissionGroups && Object.entries(permissionGroups).map(([group, perms]) => {
                const allSelected = perms.every(p => selectedPermissions.has(p))
                const someSelected = perms.some(p => selectedPermissions.has(p))
                return (
                  <div key={group} className="rounded-md border p-3">
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
                        onChange={() => toggleGroup(perms)}
                        className="h-4 w-4 rounded border-input"
                      />
                      <span className="text-sm font-semibold">{group}</span>
                    </label>
                    <div className="ml-6 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                      {perms.map(perm => (
                        <label key={perm} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedPermissions.has(perm)}
                            onChange={() => togglePermission(perm)}
                            className="h-3.5 w-3.5 rounded border-input"
                          />
                          <span className="text-xs text-muted-foreground">{perm.split('.')[1]}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={createRole.isPending || updateRole.isPending}>
                {(createRole.isPending || updateRole.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? 'Save Changes' : 'Create Role'}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* Roles list */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && !showCreate && !editingId && roles && roles.length > 0 && (
        <div className="space-y-3">
          {roles.map(role => (
            <div key={role.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium">{role.name}</h4>
                    {role.isSystem && (
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                        System
                      </span>
                    )}
                  </div>
                  {role.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{role.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {role.permissions.length > 0 ? (
                      role.permissions.map(p => (
                        <span key={p} className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
                          {p}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">No permissions</span>
                    )}
                  </div>
                </div>
                {!role.isSystem && (
                  <div className="flex items-center gap-1 ml-4">
                    {canEdit && (
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => startEdit(role)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-red-600" onClick={() => setDeleteId(role.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && !showCreate && !editingId && (!roles || roles.length === 0) && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No roles yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">Create roles and assign permissions to control what team members can do.</p>
          {canCreate && (
            <Button className="mt-4" onClick={startCreate}>
              <Plus className="mr-2 h-4 w-4" /> Create First Role
            </Button>
          )}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <ConfirmModal
          title="Delete Role"
          message="Are you sure you want to delete this role? Users assigned to it will lose these permissions."
          confirmLabel="Delete"
          destructive
          onConfirm={() => deleteRole.mutate(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </>
  )
}
