import type {
  GitHubProjectField,
  GitHubProjectRow,
  GitHubProjectTable,
  GitHubProjectView
} from '../../../../../shared/github/project-types'
import {
  MY_ISSUES_LANES,
  mapRemoteStatusToLane,
  type MyIssuesBoardProjectState,
  type MyIssuesLane,
  type MyIssuesSyncRow
} from '../../../../../shared/github/my-issues-board'

type SingleSelectField = Extract<GitHubProjectField, { kind: 'single-select' }>
type Chip = { name: string; color: string }

export type MyIssuesBoardRow = {
  row: GitHubProjectRow
  statusOptionId: string | null
  statusName: string | null
  /** Option index inside the Priority field; Infinity when unset or the field is absent. */
  priorityRank: number
  priority: Chip | null
  size: Chip | null
}

// Why: a board view often hides Status from its columns and only groups by it.
export function findSingleSelectField(
  view: GitHubProjectView,
  name: string
): SingleSelectField | null {
  const wanted = name.trim().toLowerCase()
  for (const field of [...view.fields, ...view.groupByFields]) {
    if (field.kind === 'single-select' && field.name.trim().toLowerCase() === wanted) {
      return field
    }
  }
  return null
}

function singleSelectValue(
  row: GitHubProjectRow,
  field: SingleSelectField | null
): { optionId: string; name: string; color: string } | null {
  if (!field) {
    return null
  }
  const value = row.fieldValuesByFieldId[field.id]
  return value?.kind === 'single-select' ? value : null
}

export function selectMyIssuesRows(
  table: GitHubProjectTable,
  viewerLogin: string
): MyIssuesBoardRow[] {
  const login = viewerLogin.trim().toLowerCase()
  const statusField = findSingleSelectField(table.selectedView, 'Status')
  const priorityField = findSingleSelectField(table.selectedView, 'Priority')
  const sizeField = findSingleSelectField(table.selectedView, 'Size')
  const result: MyIssuesBoardRow[] = []
  for (const row of table.rows) {
    if (row.itemType !== 'ISSUE') {
      continue
    }
    // Why: the board is a to-do surface; closed issues drop out at the next sync.
    if (row.content.state !== 'OPEN') {
      continue
    }
    if (!row.content.assignees.some((user) => user.login.toLowerCase() === login)) {
      continue
    }
    const status = singleSelectValue(row, statusField)
    const priority = singleSelectValue(row, priorityField)
    const size = singleSelectValue(row, sizeField)
    const priorityIndex = priority
      ? (priorityField?.options.findIndex((option) => option.id === priority.optionId) ?? -1)
      : -1
    result.push({
      row,
      statusOptionId: status?.optionId ?? null,
      statusName: status?.name ?? null,
      priorityRank: priorityIndex >= 0 ? priorityIndex : Number.POSITIVE_INFINITY,
      priority: priority ? { name: priority.name, color: priority.color } : null,
      size: size ? { name: size.name, color: size.color } : null
    })
  }
  return result
}

export function toMyIssuesSyncRows(rows: readonly MyIssuesBoardRow[]): MyIssuesSyncRow[] {
  return rows.map((entry) => ({
    id: entry.row.id,
    statusOptionId: entry.statusOptionId,
    statusName: entry.statusName
  }))
}

function byPriorityThenPosition(a: MyIssuesBoardRow, b: MyIssuesBoardRow): number {
  return a.priorityRank - b.priorityRank || a.row.position - b.row.position
}

export function groupMyIssuesRowsByLane(
  rows: readonly MyIssuesBoardRow[],
  state: MyIssuesBoardProjectState
): Record<MyIssuesLane, MyIssuesBoardRow[]> {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: built from MY_ISSUES_LANES, so every lane key is present.
  const grouped = Object.fromEntries(
    MY_ISSUES_LANES.map((lane) => [lane, []])
  ) as unknown as Record<MyIssuesLane, MyIssuesBoardRow[]>
  for (const entry of rows) {
    const lane = state.items[entry.row.id]?.lane ?? mapRemoteStatusToLane(entry.statusName)
    grouped[lane].push(entry)
  }
  for (const lane of MY_ISSUES_LANES) {
    if (lane === 'today') {
      grouped.today.sort((a, b) => {
        const movedA = state.items[a.row.id]?.movedAt ?? ''
        const movedB = state.items[b.row.id]?.movedAt ?? ''
        return movedA.localeCompare(movedB) || byPriorityThenPosition(a, b)
      })
    } else {
      grouped[lane].sort(byPriorityThenPosition)
    }
  }
  return grouped
}
