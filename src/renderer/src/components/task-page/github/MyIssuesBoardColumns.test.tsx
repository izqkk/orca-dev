// @vitest-environment happy-dom

import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { GitHubProjectRow } from '../../../../../shared/github/project-types'
import type { MyIssuesLane } from '../../../../../shared/github/my-issues-board'
import type { MyIssuesBoardRow } from './my-issues-board-rows'
import { MyIssuesBoardColumns } from './MyIssuesBoardColumns'

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: () => null
}))

afterEach(cleanup)

function entry(id: string, title: string, number: number): MyIssuesBoardRow {
  const row: GitHubProjectRow = {
    id,
    itemType: 'ISSUE',
    content: {
      number,
      title,
      body: null,
      url: `https://github.com/octo-org/app/issues/${number}`,
      state: 'OPEN',
      stateReason: null,
      isDraft: null,
      repository: 'octo-org/app',
      assignees: [{ login: 'octocat', name: null, avatarUrl: null }],
      labels: [],
      parentIssue: null,
      issueType: null
    },
    fieldValuesByFieldId: {},
    updatedAt: '2026-09-16T10:00:00.000Z',
    position: number
  }
  return {
    row,
    statusOptionId: null,
    statusName: null,
    priorityRank: Number.POSITIVE_INFINITY,
    priority: { name: 'P1', color: 'ORANGE' },
    size: { name: 'M', color: 'BLUE' }
  }
}

function emptyLanes(): Record<MyIssuesLane, MyIssuesBoardRow[]> {
  return { backlog: [], ready: [], today: [], 'in-review': [], done: [] }
}

describe('MyIssuesBoardColumns', () => {
  it('renders five lanes with counts and cards', () => {
    const lanes = emptyLanes()
    lanes.backlog = [entry('a', 'Fix login', 12)]
    lanes.today = [entry('b', 'Ship board', 13), entry('c', 'Write docs', 14)]
    render(
      <MyIssuesBoardColumns
        lanes={lanes}
        draggingItemId={null}
        dragOverLane={null}
        onCardDragStart={vi.fn()}
        onCardDragEnd={vi.fn()}
        onLaneDragOver={vi.fn()}
        onLaneDrop={vi.fn()}
        onOpen={vi.fn()}
        onStartWork={vi.fn()}
      />
    )
    const sections = screen.getAllByRole('region')
    expect(sections).toHaveLength(5)
    expect(sections.map((s) => s.getAttribute('data-lane'))).toEqual([
      'backlog',
      'ready',
      'today',
      'in-review',
      'done'
    ])
    expect(within(sections[0]).getByText('1')).toBeInTheDocument()
    expect(within(sections[2]).getByText('2')).toBeInTheDocument()
    expect(screen.getByText('Fix login')).toBeInTheDocument()
    expect(screen.getByText('#12 · app')).toBeInTheDocument()
    expect(screen.getAllByText('P1')).toHaveLength(3)
    expect(screen.getAllByText('M')).toHaveLength(3)
  })

  it('forwards drag-over and drop to the lane handlers', () => {
    const lanes = emptyLanes()
    lanes.backlog = [entry('a', 'Fix login', 12)]
    const onLaneDragOver = vi.fn()
    const onLaneDrop = vi.fn()
    render(
      <MyIssuesBoardColumns
        lanes={lanes}
        draggingItemId="a"
        dragOverLane="ready"
        onCardDragStart={vi.fn()}
        onCardDragEnd={vi.fn()}
        onLaneDragOver={onLaneDragOver}
        onLaneDrop={onLaneDrop}
        onOpen={vi.fn()}
        onStartWork={vi.fn()}
      />
    )
    const ready = screen.getAllByRole('region')[1]
    expect(ready).toHaveAttribute('data-drag-over', 'true')
    fireEvent.dragOver(ready)
    expect(onLaneDragOver).toHaveBeenCalledWith('ready', expect.anything())
    fireEvent.drop(ready)
    expect(onLaneDrop).toHaveBeenCalledWith('ready', expect.anything())
  })

  it('opens the card on click and starts work from the arrow button', () => {
    const lanes = emptyLanes()
    lanes.backlog = [entry('a', 'Fix login', 12)]
    const onOpen = vi.fn()
    const onStartWork = vi.fn()
    render(
      <MyIssuesBoardColumns
        lanes={lanes}
        draggingItemId={null}
        dragOverLane={null}
        onCardDragStart={vi.fn()}
        onCardDragEnd={vi.fn()}
        onLaneDragOver={vi.fn()}
        onLaneDrop={vi.fn()}
        onOpen={onOpen}
        onStartWork={onStartWork}
      />
    )
    fireEvent.click(screen.getByText('Fix login'))
    expect(onOpen).toHaveBeenCalledWith(lanes.backlog[0].row)
    fireEvent.click(screen.getByRole('button', { name: 'Start workspace from #12' }))
    expect(onStartWork).toHaveBeenCalledWith(lanes.backlog[0].row)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })
})
