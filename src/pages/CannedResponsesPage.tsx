import { useState } from 'react'
import { MessageSquare, Plus, Loader2, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useSelectedProject } from '@/hooks/useSelectedProject'
import { usePermissions } from '@/hooks/usePermissions'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'

interface CannedResponseResponse {
  id: string
  companyId: string
  projectId: string
  title: string
  bodyHtml: string
  shortcut?: string
  usageCount: number
  createdByUserId?: string
  createdOnDateTime: number
}

export function CannedResponsesPage() {
  const { companyId } = useCurrentUser()
  const { selectedProjectId: globalSelectedProjectId, projects: allProjects } = useSelectedProject()
  const { hasPermission } = usePermissions()
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [shortcut, setShortcut] = useState('')
  const [editorKey, setEditorKey] = useState(0)
  const [editEditorKey, setEditEditorKey] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editShortcut, setEditShortcut] = useState('')

  const projectId = globalSelectedProjectId || allProjects?.[0]?.id || ''

  const { data: responses, isLoading } = useQuery({
    queryKey: ['cannedResponses', companyId, projectId],
    queryFn: () =>
      api.get<CannedResponseResponse[]>(`/api/v1/companies/${companyId}/projects/${projectId}/canned-responses`),
    enabled: !!companyId && !!projectId,
  })

  const createResponse = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post<CannedResponseResponse>(`/api/v1/companies/${companyId}/projects/${projectId}/canned-responses`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cannedResponses'] })
      setShowCreate(false)
      setTitle('')
      setBodyHtml('')
      setShortcut('')
      setEditorKey((k) => k + 1)
    },
  })

  const updateResponse = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put<CannedResponseResponse>(`/api/v1/companies/${companyId}/projects/${projectId}/canned-responses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cannedResponses'] })
      setEditingId(null)
    },
  })

  const deleteResponse = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/v1/companies/${companyId}/projects/${projectId}/canned-responses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cannedResponses'] })
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    const isEmpty = !bodyHtml || bodyHtml === '<p></p>' || bodyHtml.replace(/<[^>]*>/g, '').trim() === ''
    if (isEmpty) return
    createResponse.mutate({ title, bodyHtml, shortcut: shortcut || undefined })
  }

  const startEdit = (r: CannedResponseResponse) => {
    setEditingId(r.id)
    setEditTitle(r.title)
    setEditBody(r.bodyHtml)
    setEditShortcut(r.shortcut || '')
    setEditEditorKey((k) => k + 1)
  }

  const saveEdit = (id: string) => {
    updateResponse.mutate({
      id,
      data: { title: editTitle, bodyHtml: editBody, shortcut: editShortcut || undefined },
    })
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('cannedResponses.title')}</h2>
          <p className="mt-1 text-muted-foreground">{t('cannedResponses.subtitle')}</p>
        </div>
        {hasPermission('CannedResponses.Create') && (
          <Button onClick={() => setShowCreate(true)} disabled={showCreate || editingId !== null || !projectId}>
            <Plus className="mr-2 h-4 w-4" /> {t('cannedResponses.newResponse')}
          </Button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mb-6 rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">{t('cannedResponses.createResponse')}</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('cannedResponses.responseTitle')}</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('cannedResponses.titlePlaceholder')} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t('cannedResponses.shortcut')} <span className="text-muted-foreground">({t('common.optional')})</span>
                </label>
                <Input value={shortcut} onChange={(e) => setShortcut(e.target.value)} placeholder={t('cannedResponses.shortcutPlaceholder')} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('cannedResponses.body')}</label>
              <RichTextEditor
                key={editorKey}
                content={bodyHtml}
                onChange={(html) => setBodyHtml(html)}
                placeholder={t('cannedResponses.bodyPlaceholder')}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={createResponse.isPending}>
                {createResponse.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('cannedResponses.createBtn')}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {!showCreate && isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!showCreate && !isLoading && responses && responses.length > 0 && (
        <div className="space-y-3">
          {responses.filter((r) => editingId === null || editingId === r.id).map((r) => (
            <div key={r.id} className="rounded-lg border bg-card p-4">
              {editingId === r.id ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder={t('cannedResponses.responseTitle')} />
                    <Input value={editShortcut} onChange={(e) => setEditShortcut(e.target.value)} placeholder={t('cannedResponses.shortcut')} />
                  </div>
                  <RichTextEditor
                    key={editEditorKey}
                    content={editBody}
                    onChange={(html) => setEditBody(html)}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(r.id)} disabled={updateResponse.isPending}>
                      {t('common.save')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{r.title}</h4>
                      {r.shortcut && (
                        <span className="rounded bg-accent px-1.5 py-0.5 text-xs font-mono">{r.shortcut}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {t('cannedResponses.used')} {r.usageCount}x
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground line-clamp-2" dangerouslySetInnerHTML={{ __html: r.bodyHtml }} />
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    {hasPermission('CannedResponses.Edit') && (
                      <Button size="sm" variant="outline" onClick={() => startEdit(r)}>
                        {t('common.edit')}
                      </Button>
                    )}
                    {hasPermission('CannedResponses.Delete') && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600"
                        onClick={() => {
                          if (confirm(t('cannedResponses.deleteConfirm'))) {
                            deleteResponse.mutate(r.id)
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!isLoading && (!responses || responses.length === 0) && !showCreate && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">{t('cannedResponses.noResponsesTitle')}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{t('cannedResponses.noResponsesDesc')}</p>
          {hasPermission('CannedResponses.Create') && (
            <Button className="mt-4" onClick={() => setShowCreate(true)} disabled={!projectId}>
              <Plus className="mr-2 h-4 w-4" /> {t('cannedResponses.createFirst')}
            </Button>
          )}
        </div>
      )}
    </>
  )
}
