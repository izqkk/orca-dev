import React from 'react'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import {
  chipStyle,
  singleSelectChipColors
} from '@/components/github-project/project-cell-chip-colors'
import type { GitHubProjectRow } from '../../../../../shared/github/project-types'
import type { MyIssuesBoardRow } from './my-issues-board-rows'

function OptionChip({ chip }: { chip: { name: string; color: string } }): React.JSX.Element {
  return (
    <span
      className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-none text-[var(--github-project-chip-fg-light)] dark:text-[var(--github-project-chip-fg-dark)]"
      style={chipStyle(singleSelectChipColors(chip.color))}
    >
      {chip.name}
    </span>
  )
}

export function MyIssuesCard({
  entry,
  dragging,
  onOpen,
  onStartWork,
  onDragStart,
  onDragEnd
}: {
  entry: MyIssuesBoardRow
  dragging: boolean
  onOpen: (row: GitHubProjectRow) => void
  onStartWork: (row: GitHubProjectRow) => void
  onDragStart: (itemId: string, event: React.DragEvent<HTMLElement>) => void
  onDragEnd: () => void
}): React.JSX.Element {
  const { row } = entry
  const repoName = row.content.repository?.split('/').pop() ?? ''
  const reference = row.content.number !== null ? `#${row.content.number}` : ''
  const identity = [reference, repoName].filter(Boolean).join(' · ')
  // Why: fall back to the title when the issue has no number, so the aria-label never reads "... from ".
  const referenceLabel = reference || row.content.title
  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      data-item-id={row.id}
      onDragStart={(event) => onDragStart(row.id, event)}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(row)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) {
          return
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen(row)
        }
      }}
      className={cn(
        'group/row cursor-grab rounded-md border border-border/50 bg-background px-3 py-2 text-left transition hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring active:cursor-grabbing',
        dragging && 'opacity-50'
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-mono text-[11px] text-muted-foreground">{identity}</div>
          <h3 className="mt-1 line-clamp-2 text-[13px] font-medium leading-snug text-foreground">
            {row.content.title}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(event) => {
                  event.stopPropagation()
                  onStartWork(row)
                }}
                aria-label={translate(
                  'auto.components.TaskPage.myIssuesStartWorkspace',
                  'Start workspace from {{value0}}',
                  { value0: referenceLabel }
                )}
              >
                <ArrowRight className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              {translate('auto.components.TaskPage.7d08e8be0f', 'Start')}
            </TooltipContent>
          </Tooltip>
          {row.content.url ? (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={(event) => {
                event.stopPropagation()
                void window.api.shell.openUrl(row.content.url ?? '')
              }}
              aria-label={translate(
                'auto.components.TaskPage.myIssuesOpenInGitHub',
                'Open {{value0}} in GitHub',
                { value0: referenceLabel }
              )}
            >
              <ExternalLink className="size-3.5" />
            </Button>
          ) : null}
        </div>
      </div>
      {entry.priority || entry.size || row.content.assignees.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {entry.priority ? <OptionChip chip={entry.priority} /> : null}
          {entry.size ? <OptionChip chip={entry.size} /> : null}
          <span className="ml-auto flex items-center -space-x-1">
            {row.content.assignees.slice(0, 3).map((user) =>
              user.avatarUrl ? (
                <img
                  key={user.login}
                  src={user.avatarUrl}
                  alt={user.login}
                  className="size-4 rounded-full border border-background"
                />
              ) : (
                <span
                  key={user.login}
                  className="size-4 rounded-full border border-background bg-muted text-[9px] leading-4 text-center text-muted-foreground"
                >
                  {user.login.slice(0, 1).toUpperCase()}
                </span>
              )
            )}
          </span>
        </div>
      ) : null}
    </div>
  )
}
