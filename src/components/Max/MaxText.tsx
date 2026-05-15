import { Fragment, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Link2, Check, Loader2 } from 'lucide-react'
import { useLinkTicketByNumber, useLinkTicketToStoryByNumber } from '@/hooks/useMax'

const REF_PATTERN = /(STR-\d+|#\d+)/g

interface MaxTextProps {
  text: string | null | undefined
  className?: string
  // Optional — when provided, each detected ref renders a small "+ link"
  // button next to it that links the current ticket to that ref.
  linkContext?: {
    companyId: string
    projectId: string
    sourceTicketId: string
  }
}

export function MaxText({ text, className, linkContext }: MaxTextProps) {
  if (!text) return null
  const parts = text.split(REF_PATTERN)
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          if (part.startsWith('STR-')) {
            const storyNumber = part.slice(4)
            return (
              <Fragment key={i}>
                <Link
                  to="/kanban/stories/$storyNumber"
                  params={{ storyNumber }}
                  search={{ fromTicket: undefined }}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  {part}
                </Link>
                {linkContext && (
                  <LinkButton
                    label="story"
                    storyNumber={storyNumber}
                    linkContext={linkContext}
                  />
                )}
              </Fragment>
            )
          }
          const ticketNumber = part.slice(1)
          return (
            <Fragment key={i}>
              <Link
                to="/tickets"
                search={{ status: undefined, assigned: undefined, priority: undefined, query: ticketNumber, page: 1 }}
                className="text-primary underline-offset-2 hover:underline"
              >
                {part}
              </Link>
              {linkContext && (
                <LinkButton
                  label="ticket"
                  ticketNumber={ticketNumber}
                  linkContext={linkContext}
                />
              )}
            </Fragment>
          )
        }
        return <Fragment key={i}>{part}</Fragment>
      })}
    </span>
  )
}

type LinkButtonProps = {
  label: 'ticket' | 'story'
  ticketNumber?: string
  storyNumber?: string
  linkContext: { companyId: string; projectId: string; sourceTicketId: string }
}

function LinkButton({ label, ticketNumber, storyNumber, linkContext }: LinkButtonProps) {
  const [done, setDone] = useState(false)
  const linkTicket = useLinkTicketByNumber(linkContext.companyId, linkContext.sourceTicketId)
  const linkStory = useLinkTicketToStoryByNumber(
    linkContext.companyId,
    linkContext.projectId,
    linkContext.sourceTicketId,
  )
  const pending = linkTicket.isPending || linkStory.isPending

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (done || pending) return
    const onSuccess = () => {
      setDone(true)
      setTimeout(() => setDone(false), 2500)
    }
    if (label === 'ticket' && ticketNumber) {
      linkTicket.mutate(ticketNumber, { onSuccess })
    } else if (label === 'story' && storyNumber) {
      linkStory.mutate(storyNumber, { onSuccess })
    }
  }

  const isDone = done
  const baseClass = 'ml-1 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium align-middle transition-colors'
  const stateClass = isDone
    ? 'border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400'
    : 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/15'
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending || isDone}
      title={isDone ? `Linked to ${label}` : `Link this ticket to ${label}`}
      className={`${baseClass} ${stateClass} disabled:opacity-70`}
    >
      {pending ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : isDone ? <Check className="h-2.5 w-2.5" /> : <Link2 className="h-2.5 w-2.5" />}
      {isDone ? 'linked' : 'link'}
    </button>
  )
}
