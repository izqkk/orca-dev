import { describe, expect, it } from 'vitest'
import { computeVisibleWorktreeIds } from './visible-worktrees'
import { filterArchivedItems, getArchivedItems } from './archived-workspace-items'
import type { FolderWorkspace } from '../../../../shared/folder-workspace-types'
import type { Repo } from '../../../../shared/repo-types'
import type { Worktree } from '../../../../shared/worktree/types'
import { LOCAL_EXECUTION_HOST_ID } from '../../../../shared/execution-host'
import { getWorkspaceCleanupInactivityReasons } from '../../../../shared/workspace-cleanup'

function makeWorktree(id: string, repoId: string, overrides: Partial<Worktree> = {}): Worktree {
  return {
    id,
    instanceId: `${id}-instance`,
    repoId,
    path: `/tmp/${id}`,
    head: 'abc123',
    branch: `feature/${id}`,
    isBare: false,
    isMainWorktree: false,
    displayName: id,
    comment: '',
    linkedIssue: null,
    linkedPR: null,
    linkedLinearIssue: null,
    isArchived: false,
    isUnread: false,
    isPinned: false,
    sortOrder: 0,
    lastActivityAt: 0,
    ...overrides
  }
}

function makeRepo(id: string, overrides: Partial<Repo> = {}): Repo {
  return { id, path: `/${id}`, displayName: id, badgeColor: '#000', addedAt: 0, ...overrides }
}

function makeFolderWorkspace(
  id: string,
  overrides: Partial<FolderWorkspace> = {}
): FolderWorkspace {
  return {
    id,
    projectGroupId: 'group-1',
    name: id,
    folderPath: `/folders/${id}`,
    linkedTask: null,
    comment: '',
    isArchived: false,
    isUnread: false,
    isPinned: false,
    sortOrder: 0,
    lastActivityAt: 0,
    createdAt: 0,
    updatedAt: 0,
    ...overrides
  }
}

function visibleIds(worktreesByRepo: Record<string, Worktree[]>, repos: Repo[]): string[] {
  const sortedIds = Object.values(worktreesByRepo)
    .flat()
    .map((worktree) => worktree.id)
  return computeVisibleWorktreeIds(worktreesByRepo, sortedIds, {
    filterRepoIds: [],
    showSleepingWorkspaces: true,
    tabsByWorktree: {},
    ptyIdsByTabId: {},
    browserTabsByWorktree: {},
    worktreeIdsWithLiveAgent: new Set(),
    hideDefaultBranchWorkspace: false,
    hideAutomationGeneratedWorkspaces: false,
    hideCliCreatedWorkspaces: false,
    hideDetachedHeadWorkspaces: false,
    hideWorkspacesFromOtherDevices: false,
    pairedDeviceIdsByEnvironment: new Map(),
    repoMap: new Map(repos.map((repo) => [repo.id, repo])),
    workspaceHostScope: 'all',
    defaultHostId: LOCAL_EXECUTION_HOST_ID,
    worktreeLineageById: {}
  })
}

describe('sidebar archive visibility', () => {
  it('hides every workspace of an archived project', () => {
    const ids = visibleIds(
      { live: [makeWorktree('a', 'live')], shelved: [makeWorktree('b', 'shelved')] },
      [makeRepo('live'), makeRepo('shelved', { isArchived: true })]
    )
    expect(ids).toEqual(['a'])
  })

  it('hides individually archived workspaces', () => {
    const ids = visibleIds(
      { live: [makeWorktree('a', 'live'), makeWorktree('b', 'live', { isArchived: true })] },
      [makeRepo('live')]
    )
    expect(ids).toEqual(['a'])
  })
})

describe('getArchivedItems', () => {
  it('lists archived projects, worktrees and folder workspaces once each', () => {
    const { projects, workspaces } = getArchivedItems({
      repos: [makeRepo('live', { displayName: 'Live' }), makeRepo('shelved', { isArchived: true })],
      worktreesByRepo: {
        live: [makeWorktree('kept', 'live'), makeWorktree('old', 'live', { isArchived: true })],
        // Why: covered by the project row, so it must not appear twice.
        shelved: [makeWorktree('inside', 'shelved', { isArchived: true })]
      },
      folderWorkspaces: [
        makeFolderWorkspace('notes', { isArchived: true }),
        makeFolderWorkspace('active')
      ],
      projectGroups: [
        {
          id: 'group-1',
          name: 'Docs',
          parentPath: '/folders',
          parentGroupId: null,
          createdFrom: 'manual',
          tabOrder: 0,
          isCollapsed: false,
          color: null,
          createdAt: 0,
          updatedAt: 0
        }
      ]
    })
    expect(projects.map((item) => item.name)).toEqual(['shelved'])
    expect(workspaces.map((item) => [item.kind, item.name, item.detail])).toEqual([
      ['folder', 'notes', 'Docs'],
      ['worktree', 'old', 'Live · feature/old']
    ])
  })

  it('filters by name or detail, case-insensitively', () => {
    const { workspaces } = getArchivedItems({
      repos: [makeRepo('live', { displayName: 'Live' })],
      worktreesByRepo: {
        live: [
          makeWorktree('alpha', 'live', { isArchived: true }),
          makeWorktree('beta', 'live', { isArchived: true })
        ]
      },
      folderWorkspaces: [],
      projectGroups: []
    })
    expect(filterArchivedItems(workspaces, 'FEATURE/B').map((item) => item.name)).toEqual(['beta'])
    expect(filterArchivedItems(workspaces, '  ')).toHaveLength(2)
  })
})

describe('workspace cleanup and archive', () => {
  it('never offers an archived workspace for cleanup, however old', () => {
    const scannedAt = 365 * 24 * 60 * 60 * 1000
    expect(
      getWorkspaceCleanupInactivityReasons({ isArchived: true, lastActivityAt: 0 }, scannedAt)
    ).toEqual([])
    expect(
      getWorkspaceCleanupInactivityReasons({ isArchived: false, lastActivityAt: 0 }, scannedAt)
    ).toEqual(['idle-clean'])
  })
})
