import React, { useMemo, useState } from 'react'
import { Archive } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { getRepoExecutionHostId } from '../../../../shared/execution-host'
import {
  type ArchivedItem,
  filterArchivedItems,
  getArchivedItems
} from './archived-workspace-items'
import { ArchivedWorkspaceRow } from './ArchivedWorkspaceRow'
import { runWorktreeDelete } from './delete-worktree-flow'
import { runWorktreeContextMenuDeleteIntent } from './worktree-context-menu-delete-intent'
import {
  folderWorkspaceArchiveTarget,
  unarchiveProject,
  unarchiveWorkspace
} from './workspace-archive-actions'

const SEARCH_THRESHOLD = 8

function restoreArchivedItem(item: ArchivedItem): void {
  if (item.kind === 'project') {
    unarchiveProject(item.repo)
  } else if (item.kind === 'folder') {
    unarchiveWorkspace(folderWorkspaceArchiveTarget(item.folderWorkspace))
  } else {
    unarchiveWorkspace(item.worktree)
  }
}

function deleteArchivedItem(item: ArchivedItem): void {
  if (item.kind === 'project') {
    // Why: reuse Remove Project's confirmation so the disk-safety copy stays in one place.
    useAppStore.getState().openModal('confirm-remove-folder', {
      repoId: item.repo.id,
      displayName: item.repo.displayName,
      hostId: getRepoExecutionHostId(item.repo)
    })
  } else if (item.kind === 'folder') {
    runWorktreeContextMenuDeleteIntent({
      kind: 'folder',
      folderWorkspaceId: item.folderWorkspace.id,
      ...(item.folderWorkspace.executionHostId
        ? { executionHostId: item.folderWorkspace.executionHostId }
        : {})
    })
  } else {
    runWorktreeDelete(item.worktree.id, {
      expectedInstanceId: item.worktree.instanceId,
      ...(item.worktree.hostId ? { expectedHostId: item.worktree.hostId } : {})
    })
  }
}

function ArchivedSection({
  title,
  items,
  onRestore,
  onDelete
}: {
  title: string
  items: ArchivedItem[]
  onRestore: (item: ArchivedItem) => void
  onDelete: (item: ArchivedItem) => void
}) {
  if (items.length === 0) {
    return null
  }
  return (
    <section className="grid gap-0.5">
      <h4 className="px-2 pt-1 text-[11px] font-medium text-muted-foreground">{title}</h4>
      <ul className="grid gap-0.5">
        {items.map((item) => (
          <ArchivedWorkspaceRow
            key={item.key}
            item={item}
            onRestore={onRestore}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </section>
  )
}

export function ArchivedWorkspacesPopover(): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const { repos, worktreesByRepo, folderWorkspaces, projectGroups } = useAppStore(
    useShallow((s) => ({
      repos: s.repos,
      worktreesByRepo: s.worktreesByRepo,
      folderWorkspaces: s.folderWorkspaces,
      projectGroups: s.projectGroups
    }))
  )
  const { projects, workspaces } = useMemo(
    () => getArchivedItems({ repos, worktreesByRepo, folderWorkspaces, projectGroups }),
    [folderWorkspaces, projectGroups, repos, worktreesByRepo]
  )
  const total = projects.length + workspaces.length
  const visibleProjects = filterArchivedItems(projects, query)
  const visibleWorkspaces = filterArchivedItems(workspaces, query)
  const label = translate('auto.components.sidebar.ArchivedWorkspaces.title', 'Archived')

  const handleDelete = (item: ArchivedItem): void => {
    // Why: close first so the confirmation dialog is not stacked under the popover.
    setOpen(false)
    deleteArchivedItem(item)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setQuery('')
        }
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant={open ? 'secondary' : 'ghost'}
              size="icon-xs"
              type="button"
              aria-label={label}
              className="text-muted-foreground"
            >
              <Archive className="size-3.5" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={4}>
          {label}
        </TooltipContent>
      </Tooltip>
      <PopoverContent side="top" align="end" sideOffset={8} className="w-80">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          <h3 className="text-sm font-medium">{label}</h3>
          <span className="text-xs text-muted-foreground tabular-nums">{total}</span>
        </div>
        {total >= SEARCH_THRESHOLD ? (
          <div className="border-b border-border p-2">
            <Input
              type="search"
              autoFocus
              className="h-8"
              value={query}
              aria-label={translate(
                'auto.components.sidebar.ArchivedWorkspaces.search',
                'Search archived'
              )}
              placeholder={translate(
                'auto.components.sidebar.ArchivedWorkspaces.searchPlaceholder',
                'Search archived…'
              )}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        ) : null}
        {total === 0 ? (
          <div className="grid gap-1 px-3 py-6 text-center">
            <div className="text-[13px] font-medium">
              {translate('auto.components.sidebar.ArchivedWorkspaces.empty', 'Nothing archived')}
            </div>
            <div className="text-xs text-muted-foreground">
              {translate(
                'auto.components.sidebar.ArchivedWorkspaces.emptyHint',
                'Archive a project or workspace from its menu.'
              )}
            </div>
          </div>
        ) : (
          <div className="popover-wheel-scroll scrollbar-sleek grid max-h-96 gap-2 overflow-y-auto p-1.5">
            <ArchivedSection
              title={translate('auto.components.sidebar.ArchivedWorkspaces.projects', 'Projects')}
              items={visibleProjects}
              onRestore={restoreArchivedItem}
              onDelete={handleDelete}
            />
            <ArchivedSection
              title={translate(
                'auto.components.sidebar.ArchivedWorkspaces.workspaces',
                'Workspaces'
              )}
              items={visibleWorkspaces}
              onRestore={restoreArchivedItem}
              onDelete={handleDelete}
            />
            {visibleProjects.length + visibleWorkspaces.length === 0 ? (
              <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                {translate('auto.components.sidebar.ArchivedWorkspaces.noMatches', 'No matches')}
              </div>
            ) : null}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
