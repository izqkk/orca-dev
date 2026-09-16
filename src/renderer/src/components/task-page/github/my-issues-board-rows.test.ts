import { describe, expect, it } from 'vitest'
import type {
  GitHubProjectRow,
  GitHubProjectTable,
  GitHubProjectView
} from '../../../../../shared/github/project-types'
import {
  findSingleSelectField,
  groupMyIssuesRowsByLane,
  selectMyIssuesRows,
  toMyIssuesSyncRows
} from './my-issues-board-rows'

const STATUS_FIELD = {
  kind: 'single-select' as const,
  id: 'f-status',
  name: 'Status',
  dataType: 'SINGLE_SELECT' as const,
  options: [
    { id: 'o-backlog', name: 'Backlog', color: 'GRAY' },
    { id: 'o-progress', name: 'In progress', color: 'YELLOW' },
    { id: 'o-done', name: 'Done', color: 'GREEN' }
  ]
}
const PRIORITY_FIELD = {
  kind: 'single-select' as const,
  id: 'f-prio',
  name: 'Priority',
  dataType: 'SINGLE_SELECT' as const,
  options: [
    { id: 'p0', name: 'P0', color: 'RED' },
    { id: 'p1', name: 'P1', color: 'ORANGE' },
    { id: 'p2', name: 'P2', color: 'YELLOW' }
  ]
}
const VIEW: GitHubProjectView = {
  id: 'v1',
  number: 1,
  name: 'Backlog',
  layout: 'BOARD_LAYOUT',
  filter: '',
  fields: [PRIORITY_FIELD],
  groupByFields: [STATUS_FIELD],
  sortByFields: []
}

function row(
  id: string,
  overrides: Partial<GitHubProjectRow['content']> & {
    itemType?: GitHubProjectRow['itemType']
    status?: string
    priority?: string
    position?: number
  } = {}
): GitHubProjectRow {
  const { itemType, status, priority, position, ...content } = overrides
  const fieldValuesByFieldId: GitHubProjectRow['fieldValuesByFieldId'] = {}
  if (status) {
    const option = STATUS_FIELD.options.find((o) => o.id === status)!
    fieldValuesByFieldId['f-status'] = {
      kind: 'single-select',
      fieldId: 'f-status',
      optionId: option.id,
      name: option.name,
      color: option.color
    }
  }
  if (priority) {
    const option = PRIORITY_FIELD.options.find((o) => o.id === priority)!
    fieldValuesByFieldId['f-prio'] = {
      kind: 'single-select',
      fieldId: 'f-prio',
      optionId: option.id,
      name: option.name,
      color: option.color
    }
  }
  return {
    id,
    itemType: itemType ?? 'ISSUE',
    content: {
      number: 1,
      title: id,
      body: null,
      url: null,
      state: 'OPEN',
      stateReason: null,
      isDraft: null,
      repository: 'runprise/app',
      assignees: [{ login: 'izqkk', name: null, avatarUrl: null }],
      labels: [],
      parentIssue: null,
      issueType: null,
      ...content
    },
    fieldValuesByFieldId,
    updatedAt: '2026-09-16T10:00:00.000Z',
    position: position ?? 0
  }
}

function table(rows: GitHubProjectRow[]): GitHubProjectTable {
  return {
    project: {
      id: 'P',
      owner: 'runprise',
      ownerType: 'organization',
      number: 2,
      title: 'X',
      url: 'https://github.com/orgs/runprise/projects/2'
    },
    selectedView: VIEW,
    rows,
    totalCount: rows.length,
    parentFieldDropped: false
  }
}

describe('findSingleSelectField', () => {
  it('searches visible fields then group-by fields, case-insensitively', () => {
    expect(findSingleSelectField(VIEW, 'status')?.id).toBe('f-status')
    expect(findSingleSelectField(VIEW, 'PRIORITY')?.id).toBe('f-prio')
    expect(findSingleSelectField(VIEW, 'Size')).toBeNull()
  })
})

describe('selectMyIssuesRows', () => {
  it('keeps only ISSUE rows assigned to the viewer', () => {
    const rows = selectMyIssuesRows(
      table([
        row('mine', { status: 'o-progress' }),
        row('pr', { itemType: 'PULL_REQUEST' }),
        row('draft', { itemType: 'DRAFT_ISSUE' }),
        row('other', { assignees: [{ login: 'someone', name: null, avatarUrl: null }] }),
        row('unassigned', { assignees: [] })
      ]),
      'izqkk'
    )
    expect(rows.map((r) => r.row.id)).toEqual(['mine'])
  })

  it('matches the viewer login case-insensitively', () => {
    const rows = selectMyIssuesRows(table([row('mine')]), 'IZQKK')
    expect(rows).toHaveLength(1)
  })

  it('extracts status, priority rank and chips', () => {
    const [r] = selectMyIssuesRows(
      table([row('a', { status: 'o-progress', priority: 'p1' })]),
      'izqkk'
    )
    expect(r.statusOptionId).toBe('o-progress')
    expect(r.statusName).toBe('In progress')
    expect(r.priorityRank).toBe(1)
    expect(r.priority).toEqual({ name: 'P1', color: 'ORANGE' })
    expect(r.size).toBeNull()
  })

  it('yields null status and Infinity rank when fields are unset', () => {
    const [r] = selectMyIssuesRows(table([row('a')]), 'izqkk')
    expect(r.statusOptionId).toBeNull()
    expect(r.statusName).toBeNull()
    expect(r.priorityRank).toBe(Number.POSITIVE_INFINITY)
  })
})

describe('toMyIssuesSyncRows', () => {
  it('projects id + status only', () => {
    const rows = selectMyIssuesRows(table([row('a', { status: 'o-done' })]), 'izqkk')
    expect(toMyIssuesSyncRows(rows)).toEqual([
      { id: 'a', statusOptionId: 'o-done', statusName: 'Done' }
    ])
  })
})

describe('groupMyIssuesRowsByLane', () => {
  it('places rows by local lane, falling back to the remote mapping when the overlay has no entry', () => {
    const rows = selectMyIssuesRows(
      table([row('a', { status: 'o-progress' }), row('b', { status: 'o-done' }), row('c')]),
      'izqkk'
    )
    const grouped = groupMyIssuesRowsByLane(rows, {
      items: {
        a: {
          lane: 'today',
          remoteStatusOptionId: 'o-progress',
          movedAt: '2026-09-16T10:00:00.000Z'
        }
      }
    })
    expect(grouped.today.map((r) => r.row.id)).toEqual(['a'])
    expect(grouped.done.map((r) => r.row.id)).toEqual(['b'])
    expect(grouped.backlog.map((r) => r.row.id)).toEqual(['c'])
    expect(grouped.ready).toEqual([])
    expect(grouped['in-review']).toEqual([])
  })

  it('orders lanes by priority rank then remote position', () => {
    const rows = selectMyIssuesRows(
      table([
        row('late-p2', { priority: 'p2', position: 0 }),
        row('none', { position: 1 }),
        row('p0', { priority: 'p0', position: 5 }),
        row('p2-first', { priority: 'p2', position: 3 })
      ]),
      'izqkk'
    )
    const grouped = groupMyIssuesRowsByLane(rows, { items: {} })
    expect(grouped.backlog.map((r) => r.row.id)).toEqual(['p0', 'late-p2', 'p2-first', 'none'])
  })

  it('orders today by movedAt ascending', () => {
    const rows = selectMyIssuesRows(table([row('a'), row('b')]), 'izqkk')
    const grouped = groupMyIssuesRowsByLane(rows, {
      items: {
        a: { lane: 'today', remoteStatusOptionId: null, movedAt: '2026-09-16T12:00:00.000Z' },
        b: { lane: 'today', remoteStatusOptionId: null, movedAt: '2026-09-16T11:00:00.000Z' }
      }
    })
    expect(grouped.today.map((r) => r.row.id)).toEqual(['b', 'a'])
  })
})
