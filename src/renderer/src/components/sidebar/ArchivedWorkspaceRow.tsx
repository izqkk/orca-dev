import { ArchiveRestore, Folder, FolderGit2, GitBranch, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'
import type { ArchivedItem } from './archived-workspace-items'

export function ArchivedWorkspaceRow({
  item,
  onRestore,
  onDelete
}: {
  item: ArchivedItem
  onRestore: (item: ArchivedItem) => void
  onDelete: (item: ArchivedItem) => void
}) {
  const Icon = item.kind === 'project' ? FolderGit2 : item.kind === 'folder' ? Folder : GitBranch
  // Why: the primary checkout can only leave Orca by removing its project.
  const deleteBlocked = item.kind === 'worktree' && item.worktree.isMainWorktree
  const deleteLabel =
    item.kind === 'project'
      ? translate('auto.components.sidebar.ArchivedWorkspaces.removeProject', 'Remove Project')
      : deleteBlocked
        ? translate(
            'auto.components.sidebar.ArchivedWorkspaces.primaryDeleteBlocked',
            "Primary worktree — can't be deleted"
          )
        : translate('auto.components.sidebar.ArchivedWorkspaces.delete', 'Delete')
  const restoreLabel = translate(
    'auto.components.sidebar.ArchivedWorkspaces.unarchive',
    'Unarchive'
  )
  return (
    <li className="group flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">{item.name}</div>
        {item.detail ? (
          <div className="truncate text-xs text-muted-foreground">{item.detail}</div>
        ) : null}
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={restoreLabel}
            onClick={() => onRestore(item)}
          >
            <ArchiveRestore className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={4}>
          {restoreLabel}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* Why span: a disabled button emits no pointer events, so the tooltip needs a live wrapper. */}
          <span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={deleteLabel}
              disabled={deleteBlocked}
              onClick={() => onDelete(item)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={4}>
          {deleteLabel}
        </TooltipContent>
      </Tooltip>
    </li>
  )
}
