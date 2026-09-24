import type { FolderWorkspace } from '../../../../shared/folder-workspace-types'
import type { ProjectGroup } from '../../../../shared/project-group-types'
import type { Repo } from '../../../../shared/repo-types'
import type { Worktree } from '../../../../shared/worktree/types'
import { getRepoExecutionHostId } from '../../../../shared/execution-host'

export type ArchivedItem =
  | { kind: 'project'; key: string; name: string; detail: string; repo: Repo }
  | { kind: 'worktree'; key: string; name: string; detail: string; worktree: Worktree }
  | {
      kind: 'folder'
      key: string
      name: string
      detail: string
      folderWorkspace: FolderWorkspace
    }

export function getArchivedItems(args: {
  repos: readonly Repo[]
  worktreesByRepo: Readonly<Record<string, readonly Worktree[] | undefined>>
  folderWorkspaces: readonly FolderWorkspace[]
  projectGroups: readonly ProjectGroup[]
}): { projects: ArchivedItem[]; workspaces: ArchivedItem[] } {
  const projects: ArchivedItem[] = []
  const workspaces: ArchivedItem[] = []
  const repoById = new Map(args.repos.map((repo) => [repo.id, repo]))
  for (const repo of args.repos) {
    if (repo.isArchived === true) {
      projects.push({
        kind: 'project',
        key: `project:${getRepoExecutionHostId(repo)}:${repo.id}`,
        name: repo.displayName,
        detail: repo.path,
        repo
      })
    }
  }
  for (const [repoId, worktrees] of Object.entries(args.worktreesByRepo)) {
    const repo = repoById.get(repoId)
    // Why: an archived project already lists its workspaces through the project row.
    if (repo?.isArchived === true) {
      continue
    }
    for (const worktree of worktrees ?? []) {
      if (!worktree.isArchived) {
        continue
      }
      workspaces.push({
        kind: 'worktree',
        key: `worktree:${worktree.hostId ?? ''}:${worktree.id}`,
        name: worktree.displayName || worktree.branch,
        detail: [repo?.displayName, worktree.branch].filter(Boolean).join(' · '),
        worktree
      })
    }
  }
  const groupNameById = new Map(args.projectGroups.map((group) => [group.id, group.name]))
  for (const folderWorkspace of args.folderWorkspaces) {
    if (!folderWorkspace.isArchived) {
      continue
    }
    workspaces.push({
      kind: 'folder',
      key: `folder:${folderWorkspace.executionHostId ?? ''}:${folderWorkspace.id}`,
      name: folderWorkspace.name,
      detail: groupNameById.get(folderWorkspace.projectGroupId) ?? folderWorkspace.folderPath,
      folderWorkspace
    })
  }
  const byName = (a: ArchivedItem, b: ArchivedItem): number => a.name.localeCompare(b.name)
  return { projects: projects.sort(byName), workspaces: workspaces.sort(byName) }
}

export function filterArchivedItems(items: ArchivedItem[], query: string): ArchivedItem[] {
  const normalized = query.trim().toLocaleLowerCase()
  if (!normalized) {
    return items
  }
  return items.filter(
    (item) =>
      item.name.toLocaleLowerCase().includes(normalized) ||
      item.detail.toLocaleLowerCase().includes(normalized)
  )
}
