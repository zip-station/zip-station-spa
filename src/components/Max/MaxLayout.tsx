import { Link, useRouterState } from '@tanstack/react-router'
import { Sparkles, HelpCircle, ListTodo } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

const tabs = [
  { href: '/max/tasks', labelKey: 'max.tabs.tasks', icon: ListTodo },
  { href: '/max/questions', labelKey: 'max.tabs.questions', icon: HelpCircle },
] as const

export function MaxLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const path = useRouterState({ select: (s) => s.location.pathname })

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Sparkles className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">{t('max.heading', 'Max')}</h1>
      </div>

      <div className="mb-6 border-b">
        <nav className="flex gap-1">
          {tabs.map((tab) => {
            const isActive = path === tab.href || path.startsWith(`${tab.href}/`)
            return (
              <Link
                key={tab.href}
                to={tab.href}
                className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:border-muted hover:text-foreground'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {t(tab.labelKey)}
              </Link>
            )
          })}
        </nav>
      </div>

      {children}
    </div>
  )
}
