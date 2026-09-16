import React from 'react'
import { RefreshCw } from 'lucide-react'
import type { TaskPageComposerActionsModel } from '../../use-task-page-composer-actions'
import {
  ProjectRowItemDialog,
  ProjectRowSupportDialogs
} from '@/components/github-project/ProjectRowDialogs'
import {
  ProjectTableSkeleton,
  ProjectViewErrorState
} from '@/components/github-project/ProjectViewStates'
import { useProjectRowActions } from '@/components/github-project/useProjectRowActions'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { MyIssuesBoardColumns } from './MyIssuesBoardColumns'
import { useMyIssuesBoard } from './use-my-issues-board'

export default function MyIssuesBoard({
  model
}: {
  model: TaskPageComposerActionsModel
}): React.JSX.Element {
  const { repoSelection, githubViewerLogin } = model
  const board = useMyIssuesBoard({ selectedRepoIds: repoSelection, viewerLogin: githubViewerLogin })
  const rowActions = useProjectRowActions({
    table: board.table,
    currentCacheKey: board.currentCacheKey,
    selectedRepoIds: repoSelection
  })
  const addRepo = useAppStore((state) => state.addRepo)

  return (
    <div className="mt-3 flex min-h-0 min-w-0 max-h-full flex-1 flex-col overflow-hidden rounded-md border border-border/50 bg-muted/50 shadow-sm">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border/50 px-3 text-xs">
        <span className="truncate text-muted-foreground">
          {board.table?.project.title ??
            translate('auto.components.TaskPage.myIssuesTitle', 'My Issues')}
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          disabled={!board.activeProject || board.loading}
          onClick={board.refresh}
          aria-label={translate('auto.components.TaskPage.myIssuesRefresh', 'Refresh board')}
        >
          <RefreshCw className={board.loading ? 'size-3.5 animate-spin' : 'size-3.5'} />
        </Button>
      </div>
      <MyIssuesBoardBody board={board} rowActions={rowActions} />
      <ProjectRowSupportDialogs
        rowActions={rowActions}
        sourceSettings={board.settings}
        onAddRepo={addRepo}
      />
    </div>
  )
}

function MyIssuesBoardBody({
  board,
  rowActions
}: {
  board: ReturnType<typeof useMyIssuesBoard>
  rowActions: ReturnType<typeof useProjectRowActions>
}): React.JSX.Element | null {
  if (!board.activeProject) {
    return (
      <Hint>
        {translate(
          'auto.components.TaskPage.myIssuesNoProject',
          'Choose a project in Projects mode first.'
        )}
      </Hint>
    )
  }
  if (board.loading && !board.table) {
    return <ProjectTableSkeleton />
  }
  if (board.error) {
    return (
      <ProjectViewErrorState
        error={board.error.error}
        totalCount={board.error.totalCount}
        host={board.activeProject.host}
        onOpenInGitHub={() => {
          if (board.table) {
            void window.api.shell.openUrl(
              `${board.table.project.url}/views/${board.table.selectedView.number ?? ''}`
            )
          }
        }}
      />
    )
  }
  if (board.table && rowActions.resolvedDialogRepoItem) {
    return (
      <ProjectRowItemDialog
        rowActions={rowActions}
        backLabel={translate('auto.components.TaskPage.myIssuesTitle', 'My Issues')}
      />
    )
  }
  if (!board.table) {
    return null
  }
  if (board.statusFieldMissing) {
    return (
      <Hint>
        {translate(
          'auto.components.TaskPage.myIssuesStatusMissing',
          'The selected view does not expose a Status field. Pick a view that shows or groups by Status in Projects mode.'
        )}
      </Hint>
    )
  }
  if (board.rows.length === 0) {
    return (
      <Hint>
        {translate(
          'auto.components.TaskPage.myIssuesEmpty',
          'No issues assigned to you in this project.'
        )}
      </Hint>
    )
  }
  return (
    <MyIssuesBoardColumns
      lanes={board.lanes}
      draggingItemId={board.draggingItemId}
      dragOverLane={board.dragOverLane}
      onCardDragStart={board.onCardDragStart}
      onCardDragEnd={board.onCardDragEnd}
      onLaneDragOver={board.onLaneDragOver}
      onLaneDrop={board.onLaneDrop}
      onOpen={rowActions.openDialog}
      onStartWork={rowActions.startWork}
    />
  )
}

function Hint({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
      {children}
    </div>
  )
}
