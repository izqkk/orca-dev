import React from 'react'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import type { GitHubProjectRow } from '../../../../../shared/github/project-types'
import { MY_ISSUES_LANES, type MyIssuesLane } from '../../../../../shared/github/my-issues-board'
import type { MyIssuesBoardRow } from './my-issues-board-rows'
import { MyIssuesCard } from './MyIssuesCard'

export const MY_ISSUES_LANE_LABELS: Record<MyIssuesLane, () => string> = {
  backlog: () => translate('auto.components.TaskPage.myIssuesLaneBacklog', 'Backlog'),
  ready: () => translate('auto.components.TaskPage.myIssuesLaneReady', 'Ready'),
  today: () => translate('auto.components.TaskPage.myIssuesLaneToday', 'Today'),
  'in-review': () => translate('auto.components.TaskPage.myIssuesLaneInReview', 'In Review'),
  done: () => translate('auto.components.TaskPage.myIssuesLaneDone', 'Done')
}

export function MyIssuesBoardColumns({
  lanes,
  draggingItemId,
  dragOverLane,
  onCardDragStart,
  onCardDragEnd,
  onLaneDragOver,
  onLaneDrop,
  onOpen,
  onStartWork
}: {
  lanes: Record<MyIssuesLane, MyIssuesBoardRow[]>
  draggingItemId: string | null
  dragOverLane: MyIssuesLane | null
  onCardDragStart: (itemId: string, event: React.DragEvent<HTMLElement>) => void
  onCardDragEnd: () => void
  onLaneDragOver: (lane: MyIssuesLane, event: React.DragEvent<HTMLElement>) => void
  onLaneDrop: (lane: MyIssuesLane, event: React.DragEvent<HTMLElement>) => void
  onOpen: (row: GitHubProjectRow) => void
  onStartWork: (row: GitHubProjectRow) => void
}): React.JSX.Element {
  return (
    <div className="grid min-h-0 min-w-0 flex-1 auto-cols-[minmax(240px,1fr)] grid-flow-col gap-3 overflow-x-auto p-3">
      {MY_ISSUES_LANES.map((lane) => {
        const label = MY_ISSUES_LANE_LABELS[lane]()
        const entries = lanes[lane]
        const dragOver = dragOverLane === lane
        return (
          <section
            key={lane}
            aria-label={label}
            data-lane={lane}
            data-drag-over={dragOver ? 'true' : undefined}
            onDragOver={(event) => onLaneDragOver(lane, event)}
            onDrop={(event) => onLaneDrop(lane, event)}
            className={cn(
              'flex min-h-0 flex-col rounded-md border border-border/50 bg-muted/20 transition-[border-color,box-shadow]',
              dragOver && 'border-ring/70 ring-1 ring-ring/70'
            )}
          >
            <div className="flex h-9 shrink-0 items-center justify-between border-b border-border/50 px-3">
              <span className="truncate text-xs font-medium text-foreground">{label}</span>
              <span className="text-[11px] text-muted-foreground">{entries.length}</span>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2 scrollbar-sleek">
              {entries.map((entry) => (
                <MyIssuesCard
                  key={entry.row.id}
                  entry={entry}
                  dragging={draggingItemId === entry.row.id}
                  onOpen={onOpen}
                  onStartWork={onStartWork}
                  onDragStart={onCardDragStart}
                  onDragEnd={onCardDragEnd}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
