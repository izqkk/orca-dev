import { toast } from 'sonner'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { getRepoExecutionHostId } from '../../../../shared/execution-host'
import type { ExecutionHostId } from '../../../../shared/execution-host'
import type { FolderWorkspace } from '../../../../shared/folder-workspace-types'
import type { Repo } from '../../../../shared/repo-types'
import type { Worktree } from '../../../../shared/worktree/types'
import { folderWorkspaceKey, parseWorkspaceKey } from '../../../../shared/workspace-scope'
import type { WorktreeMetaBatchUpdate } from '@/store/slices/worktree-helpers'
import { runSleepWorktrees } from './sleep-worktree-flow'

type ArchiveTarget = Pick<Worktree, 'id' | 'hostId'>

function setWorkspacesArchived(targets: readonly ArchiveTarget[], isArchived: boolean): void {
  const state = useAppStore.getState()
  const batch: WorktreeMetaBatchUpdate[] = []
  for (const target of targets) {
    const executionHostId: ExecutionHostId = target.hostId ?? 'local'
    // Why: folder keys route through updateWorktreeMeta; the batch path only covers git worktrees.
    if (parseWorkspaceKey(target.id)?.type === 'folder') {
      void state.updateWorktreeMeta(target.id, { isArchived }, { executionHostId })
    } else {
      batch.push({ worktreeId: target.id, updates: { isArchived }, executionHostId })
    }
  }
  if (batch.length > 0) {
    void state.updateWorktreesMeta(batch)
  }
}

export async function archiveWorkspaces(targets: readonly ArchiveTarget[]): Promise<void> {
  if (targets.length === 0) {
    return
  }
  // Why: archived workspaces drop out of activity tracking, so release their terminals first.
  await runSleepWorktrees(targets.map((target) => target.id))
  setWorkspacesArchived(targets, true)
  toast.success(
    targets.length === 1
      ? translate('auto.components.sidebar.archive.workspaceArchived', 'Workspace archived')
      : translate(
          'auto.components.sidebar.archive.workspacesArchived',
          '{{value0}} workspaces archived',
          { value0: targets.length }
        )
  )
}

export function unarchiveWorkspace(target: ArchiveTarget): void {
  setWorkspacesArchived([target], false)
}

export function folderWorkspaceArchiveTarget(folderWorkspace: FolderWorkspace): ArchiveTarget {
  return {
    id: folderWorkspaceKey(folderWorkspace.id),
    hostId: folderWorkspace.executionHostId ?? undefined
  }
}

export async function archiveProject(repo: Repo): Promise<void> {
  const state = useAppStore.getState()
  const hostId = getRepoExecutionHostId(repo)
  const repoWorktreeIds = (state.worktreesByRepo[repo.id] ?? [])
    .filter((worktree) => !worktree.hostId || worktree.hostId === hostId)
    .map((worktree) => worktree.id)
  await runSleepWorktrees(repoWorktreeIds)
  const ok = await state.updateRepo(repo.id, { isArchived: true }, { hostId })
  if (ok) {
    toast.success(
      translate('auto.components.sidebar.archive.projectArchived', '{{value0}} archived', {
        value0: repo.displayName
      })
    )
  }
}

export function unarchiveProject(repo: Repo): void {
  void useAppStore
    .getState()
    .updateRepo(repo.id, { isArchived: false }, { hostId: getRepoExecutionHostId(repo) })
}
