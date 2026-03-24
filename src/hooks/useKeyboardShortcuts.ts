import { useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'

export function useKeyboardShortcuts() {
  const router = useRouter()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea/editor
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        // Only handle Escape in inputs
        if (e.key === 'Escape') {
          target.blur()
        }
        return
      }

      // Navigation shortcuts
      if (e.key === 'g') {
        // Wait for second key
        const waitForSecond = (e2: KeyboardEvent) => {
          document.removeEventListener('keydown', waitForSecond)
          switch (e2.key) {
            case 'd': router.navigate({ to: '/' }); break
            case 't': router.navigate({ to: '/tickets', search: { status: undefined, assigned: undefined, priority: undefined, query: undefined, page: undefined } }); break
            case 'i': router.navigate({ to: '/intake' }); break
            case 'c': router.navigate({ to: '/customers' }); break
            case 'p': router.navigate({ to: '/projects' }); break
            case 's': router.navigate({ to: '/settings' }); break
            case 'a': router.navigate({ to: '/audit-log' }); break
          }
        }
        document.addEventListener('keydown', waitForSecond)
        setTimeout(() => document.removeEventListener('keydown', waitForSecond), 1000)
        return
      }

      // Quick actions
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
        // New ticket — navigate to tickets with create flag
        window.location.href = '/tickets?create=true'
      }

      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        // Show shortcuts help
        const existing = document.getElementById('shortcuts-help')
        if (existing) {
          existing.remove()
        } else {
          showShortcutsHelp()
        }
      }

      if (e.key === 'Escape') {
        const help = document.getElementById('shortcuts-help')
        if (help) help.remove()
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [router])
}

function showShortcutsHelp() {
  const div = document.createElement('div')
  div.id = 'shortcuts-help'
  div.className = 'fixed inset-0 z-[200] flex items-center justify-center'
  div.innerHTML = `
    <div class="fixed inset-0 bg-black/50" onclick="this.parentElement.remove()"></div>
    <div class="relative z-10 w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
      <h3 class="text-lg font-semibold mb-4">Keyboard Shortcuts</h3>
      <div class="space-y-3 text-sm">
        <div>
          <p class="font-medium text-muted-foreground mb-1">Navigation (g + key)</p>
          <div class="grid grid-cols-2 gap-1">
            <span><kbd class="rounded border px-1.5 py-0.5 text-xs font-mono">g d</kbd> Dashboard</span>
            <span><kbd class="rounded border px-1.5 py-0.5 text-xs font-mono">g t</kbd> Tickets</span>
            <span><kbd class="rounded border px-1.5 py-0.5 text-xs font-mono">g i</kbd> Intake</span>
            <span><kbd class="rounded border px-1.5 py-0.5 text-xs font-mono">g c</kbd> Customers</span>
            <span><kbd class="rounded border px-1.5 py-0.5 text-xs font-mono">g p</kbd> Projects</span>
            <span><kbd class="rounded border px-1.5 py-0.5 text-xs font-mono">g s</kbd> Settings</span>
            <span><kbd class="rounded border px-1.5 py-0.5 text-xs font-mono">g a</kbd> Audit Log</span>
          </div>
        </div>
        <div>
          <p class="font-medium text-muted-foreground mb-1">Actions</p>
          <div class="grid grid-cols-2 gap-1">
            <span><kbd class="rounded border px-1.5 py-0.5 text-xs font-mono">n</kbd> New ticket</span>
            <span><kbd class="rounded border px-1.5 py-0.5 text-xs font-mono">Ctrl+Enter</kbd> Send reply</span>
            <span><kbd class="rounded border px-1.5 py-0.5 text-xs font-mono">?</kbd> Show shortcuts</span>
            <span><kbd class="rounded border px-1.5 py-0.5 text-xs font-mono">Esc</kbd> Close / blur</span>
          </div>
        </div>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" class="mt-4 w-full rounded-md border px-3 py-2 text-sm hover:bg-accent">Close</button>
    </div>
  `
  document.body.appendChild(div)
}
