import { useState } from 'react'
import { FolderOpen, Plus, Loader2, Trash2, Mail, Settings } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useProjects, useCreateProject, useDeleteProject } from '@/hooks/useProjects'
import { useTranslation } from 'react-i18next'

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function ProjectsPage() {
  const { companyId } = useCurrentUser()
  const { data: projects, isLoading } = useProjects(companyId)
  const createProject = useCreateProject(companyId)
  const deleteProject = useDeleteProject(companyId)
  const { t } = useTranslation()

  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [supportEmail, setSupportEmail] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleNameChange = (value: string) => {
    setName(value)
    if (!slugManual) {
      setSlug(slugify(value))
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      await createProject.mutateAsync({
        name,
        slug: slug || slugify(name),
        description: description || undefined,
        supportEmailAddress: supportEmail,
      })
      setShowCreate(false)
      setName('')
      setSlug('')
      setSlugManual(false)
      setSupportEmail('')
      setDescription('')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('projects.failedToCreate')
      setError(message)
    }
  }

  const handleDelete = async (projectId: string, projectName: string) => {
    if (!confirm(t('projects.deleteConfirm', { name: projectName }))) return
    await deleteProject.mutateAsync(projectId)
  }

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('projects.title')}</h2>
          <p className="mt-1 text-muted-foreground">
            {t('projects.subtitle')}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} disabled={showCreate}>
          <Plus className="mr-2 h-4 w-4" /> {t('projects.newProject')}
        </Button>
      </div>

      {/* Create project form */}
      {showCreate && (
        <div className="mb-8 rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">{t('projects.createProject')}</h3>

          {error && (
            <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">{t('projects.projectName')}</label>
                <Input
                  id="name"
                  placeholder={t('projects.projectNamePlaceholder')}
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="slug" className="text-sm font-medium">{t('projects.slug')}</label>
                <Input
                  id="slug"
                  placeholder={t('projects.slugPlaceholder')}
                  value={slug}
                  onChange={(e) => {
                    setSlug(slugify(e.target.value))
                    setSlugManual(true)
                  }}
                  required
                />
                <p className="text-xs text-muted-foreground">{t('projects.slugHelp')}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="supportEmail" className="text-sm font-medium">{t('projects.supportEmail')}</label>
              <Input
                id="supportEmail"
                type="email"
                placeholder={t('projects.supportEmailPlaceholder')}
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">{t('projects.supportEmailHelp')}</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                {t('projects.description')} <span className="text-muted-foreground">({t('common.optional')})</span>
              </label>
              <Input
                id="description"
                placeholder={t('projects.descriptionPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={createProject.isPending}>
                {createProject.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('projects.createProjectBtn')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreate(false)
                  setError(null)
                }}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Project list */}
      {!isLoading && projects && projects.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div key={project.id} className="rounded-lg border bg-card p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FolderOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{project.name}</h3>
                    <p className="text-xs text-muted-foreground">/{project.slug}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(project.id, project.name)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Delete project"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {project.description && (
                <p className="mt-3 text-sm text-muted-foreground">{project.description}</p>
              )}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  {project.supportEmailAddress}
                </div>
                <Link
                  to="/projects/$projectId/settings"
                  params={{ projectId: project.id }}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <Settings className="h-3.5 w-3.5" /> {t('projects.viewSettings')}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (!projects || projects.length === 0) && !showCreate && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">{t('projects.noProjectsTitle')}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('projects.noProjectsDesc')}
          </p>
          <Button className="mt-4" onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" /> {t('projects.createFirst')}
          </Button>
        </div>
      )}
    </>
  )
}
