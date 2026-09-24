import { Archive } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { translate } from '@/i18n/i18n'
import type { Worktree } from '../../../../shared/worktree/types'
import { archiveWorkspaces } from './workspace-archive-actions'

export function WorkspaceArchiveMenuItem({
  worktrees,
  disabled,
  onBeforeArchive
}: {
  worktrees: readonly Worktree[]
  disabled: boolean
  onBeforeArchive: () => void
}) {
  return (
    <DropdownMenuItem
      disabled={disabled || worktrees.length === 0}
      onSelect={() => {
        onBeforeArchive()
        const targets = worktrees.map(({ id, hostId }) => ({ id, hostId }))
        // Why: same menu-close delay as Sleep so teardown never races the closing menu's focus restore.
        window.setTimeout(() => void archiveWorkspaces(targets), 50)
      }}
    >
      <Archive className="size-3.5" />
      {worktrees.length > 1
        ? translate(
            'auto.components.sidebar.WorktreeContextMenu.archiveMany',
            'Archive {{value0}} Workspaces',
            { value0: worktrees.length }
          )
        : translate('auto.components.sidebar.WorktreeContextMenu.archive', 'Archive')}
    </DropdownMenuItem>
  )
}
