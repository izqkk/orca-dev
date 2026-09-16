import React from 'react'
import GitHubItemDialog from '@/components/GitHubItemDialog'
import { launchWorkItemDirect } from '@/lib/launch-work-item-direct'
import ProjectItemSlugDialog from './ProjectItemSlugDialog'
import { ProjectMissingRepoDialog } from './ProjectMissingRepoDialog'
import type { useProjectRowActions } from './useProjectRowActions'
import type { useProjectViewTable } from './useProjectViewTable'

type RowActions = ReturnType<typeof useProjectRowActions>

// Why: shared by ProjectViewWrapper and the My Issues board — same repo-backed item dialog,
// only the back-navigation label differs per surface.
export function ProjectRowItemDialog({
  rowActions,
  backLabel
}: {
  rowActions: RowActions
  backLabel: string
}): React.JSX.Element | null {
  const dialogItem = rowActions.resolvedDialogRepoItem
  if (!dialogItem) {
    return null
  }
  return (
    <GitHubItemDialog
      workItem={dialogItem.workItem}
      repoPath={dialogItem.repoPath}
      repoId={dialogItem.repoId}
      sourceContext={rowActions.dialogSourceContext}
      projectOrigin={dialogItem.origin}
      backLabel={backLabel}
      onUse={(item) => {
        rowActions.setDialogRepoItem(null)
        // Why: issue #4756 keeps project-view actions on the direct "start work now" path, not the TaskPage background-create flow.
        void launchWorkItemDirect({
          item,
          repoId: dialogItem.workItem.repoId,
          launchSource: 'task_page',
          telemetrySource: 'sidebar',
          openModalFallback: () => {
            if (item.url) {
              void window.api.shell.openUrl(item.url)
            }
          }
        })
      }}
      onClose={() => rowActions.setDialogRepoItem(null)}
    />
  )
}

// Why: the slug-fallback and missing-repo dialogs are identical across every project-row
// surface (Project view, My Issues board) — always mounted, gated by their own state.
export function ProjectRowSupportDialogs({
  rowActions,
  sourceSettings,
  onAddRepo
}: {
  rowActions: RowActions
  sourceSettings: ReturnType<typeof useProjectViewTable>['settings']
  onAddRepo: () => void | Promise<unknown>
}): React.JSX.Element {
  return (
    <>
      <ProjectItemSlugDialog
        projectOrigin={rowActions.missingDialogs.slugDialog?.origin ?? null}
        sourceSettings={sourceSettings}
        onClose={() => rowActions.setSlugDialog(null)}
      />
      <ProjectMissingRepoDialog
        missingRepo={rowActions.missingDialogs.repoNotInOrca}
        onClose={() => rowActions.setRepoNotInOrca(null)}
        onAddRepo={onAddRepo}
      />
    </>
  )
}
