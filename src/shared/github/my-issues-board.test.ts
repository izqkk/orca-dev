import { describe, expect, it } from 'vitest'
import {
  EMPTY_MY_ISSUES_PROJECT_STATE,
  MY_ISSUES_ABSENT_ENTRY_TTL_MS,
  MY_ISSUES_LANES,
  mapRemoteStatusToLane,
  moveMyIssuesItem,
  myIssuesProjectStatesEqual,
  sanitizeMyIssuesBoardState,
  syncMyIssuesBoard
} from './my-issues-board'

const NOW = '2026-09-16T10:00:00.000Z'
const LATER = '2026-09-16T11:00:00.000Z'

describe('MY_ISSUES_LANES', () => {
  it('lists the five lanes left to right', () => {
    expect(MY_ISSUES_LANES).toEqual(['backlog', 'ready', 'today', 'in-review', 'done'])
  })
})

describe('mapRemoteStatusToLane', () => {
  it.each([
    ['Ideen Sonstiges', 'backlog'],
    ['Backlog', 'backlog'],
    ['Ready', 'backlog'],
    ['In progress', 'ready'],
    ['In review', 'in-review'],
    ['Done', 'done']
  ])('maps %j to %j', (name, lane) => {
    expect(mapRemoteStatusToLane(name)).toBe(lane)
  })

  it('ignores case and surrounding whitespace', () => {
    expect(mapRemoteStatusToLane('  IN PROGRESS ')).toBe('ready')
    expect(mapRemoteStatusToLane('in Review')).toBe('in-review')
  })

  it('falls back to backlog for unknown or missing status', () => {
    expect(mapRemoteStatusToLane('Blocked')).toBe('backlog')
    expect(mapRemoteStatusToLane(null)).toBe('backlog')
    expect(mapRemoteStatusToLane(undefined)).toBe('backlog')
    expect(mapRemoteStatusToLane('')).toBe('backlog')
  })

  it('never maps to today', () => {
    expect(mapRemoteStatusToLane('Today')).toBe('backlog')
  })
})

describe('syncMyIssuesBoard', () => {
  it('places a new row in the mapped lane and records the remote status', () => {
    const next = syncMyIssuesBoard(
      EMPTY_MY_ISSUES_PROJECT_STATE,
      [{ id: 'i1', statusOptionId: 'opt-progress', statusName: 'In progress' }],
      NOW
    )
    expect(next.items).toEqual({
      i1: { lane: 'ready', remoteStatusOptionId: 'opt-progress', movedAt: NOW }
    })
  })

  it('re-lanes an item when the remote status changed (remote wins)', () => {
    const previous = {
      items: { i1: { lane: 'today', remoteStatusOptionId: 'opt-progress', movedAt: NOW } }
    } as const
    const next = syncMyIssuesBoard(
      previous,
      [{ id: 'i1', statusOptionId: 'opt-review', statusName: 'In review' }],
      LATER
    )
    expect(next.items.i1).toEqual({
      lane: 'in-review',
      remoteStatusOptionId: 'opt-review',
      movedAt: LATER
    })
  })

  it('keeps the local lane when the remote status is unchanged (local wins)', () => {
    const previous = {
      items: { i1: { lane: 'today', remoteStatusOptionId: 'opt-progress', movedAt: NOW } }
    } as const
    const next = syncMyIssuesBoard(
      previous,
      [{ id: 'i1', statusOptionId: 'opt-progress', statusName: 'In progress' }],
      LATER
    )
    expect(next.items.i1).toBe(previous.items.i1)
  })

  it('treats a cleared status as a change to null', () => {
    const previous = {
      items: { i1: { lane: 'today', remoteStatusOptionId: 'opt-progress', movedAt: NOW } }
    } as const
    const next = syncMyIssuesBoard(
      previous,
      [{ id: 'i1', statusOptionId: null, statusName: null }],
      LATER
    )
    expect(next.items.i1).toEqual({ lane: 'backlog', remoteStatusOptionId: null, movedAt: LATER })
  })

  it('keeps an absent entry unchanged when movedAt is within the TTL', () => {
    const previous = {
      items: {
        i1: { lane: 'today', remoteStatusOptionId: 'opt-progress', movedAt: NOW },
        gone: { lane: 'done', remoteStatusOptionId: 'opt-done', movedAt: NOW }
      }
    } as const
    const next = syncMyIssuesBoard(
      previous,
      [{ id: 'i1', statusOptionId: 'opt-progress', statusName: 'In progress' }],
      LATER
    )
    expect(next.items.gone).toBe(previous.items.gone)
    expect(Object.keys(next.items).sort()).toEqual(['gone', 'i1'])
  })

  it('drops an absent entry once movedAt is older than the TTL relative to now', () => {
    const staleMovedAt = new Date(Date.parse(NOW) - MY_ISSUES_ABSENT_ENTRY_TTL_MS - 1).toISOString()
    const previous = {
      items: {
        i1: { lane: 'today', remoteStatusOptionId: 'opt-progress', movedAt: NOW },
        gone: { lane: 'done', remoteStatusOptionId: 'opt-done', movedAt: staleMovedAt }
      }
    } as const
    const next = syncMyIssuesBoard(
      previous,
      [{ id: 'i1', statusOptionId: 'opt-progress', statusName: 'In progress' }],
      NOW
    )
    expect(Object.keys(next.items)).toEqual(['i1'])
  })

  it('returns the same reference when nothing changed, including an absent-but-recent entry', () => {
    const previous = {
      items: {
        i1: { lane: 'today', remoteStatusOptionId: 'opt-progress', movedAt: NOW },
        gone: { lane: 'done', remoteStatusOptionId: 'opt-done', movedAt: NOW }
      }
    } as const
    const next = syncMyIssuesBoard(
      previous,
      [{ id: 'i1', statusOptionId: 'opt-progress', statusName: 'In progress' }],
      LATER
    )
    expect(next).toBe(previous)
  })
})

describe('moveMyIssuesItem', () => {
  it('changes the lane and movedAt but keeps the remote status', () => {
    const state = {
      items: { i1: { lane: 'ready', remoteStatusOptionId: 'opt-progress', movedAt: NOW } }
    } as const
    const next = moveMyIssuesItem(state, 'i1', 'today', LATER)
    expect(next.items.i1).toEqual({
      lane: 'today',
      remoteStatusOptionId: 'opt-progress',
      movedAt: LATER
    })
  })

  it('is a no-op for an unknown item or the same lane', () => {
    const state = {
      items: { i1: { lane: 'ready', remoteStatusOptionId: 'opt-progress', movedAt: NOW } }
    } as const
    expect(moveMyIssuesItem(state, 'nope', 'today', LATER)).toBe(state)
    expect(moveMyIssuesItem(state, 'i1', 'ready', LATER)).toBe(state)
  })
})

describe('myIssuesProjectStatesEqual', () => {
  it('compares items field by field', () => {
    const a = { items: { i1: { lane: 'ready', remoteStatusOptionId: 'x', movedAt: NOW } } } as const
    const b = { items: { i1: { lane: 'ready', remoteStatusOptionId: 'x', movedAt: NOW } } } as const
    const c = { items: { i1: { lane: 'today', remoteStatusOptionId: 'x', movedAt: NOW } } } as const
    expect(myIssuesProjectStatesEqual(a, b)).toBe(true)
    expect(myIssuesProjectStatesEqual(a, c)).toBe(false)
    expect(myIssuesProjectStatesEqual(a, EMPTY_MY_ISSUES_PROJECT_STATE)).toBe(false)
  })
})

describe('sanitizeMyIssuesBoardState', () => {
  it('returns an empty record for non-objects', () => {
    expect(sanitizeMyIssuesBoardState(undefined)).toEqual({})
    expect(sanitizeMyIssuesBoardState(null)).toEqual({})
    expect(sanitizeMyIssuesBoardState('x')).toEqual({})
    expect(sanitizeMyIssuesBoardState([])).toEqual({})
  })

  it('keeps valid entries and drops garbage without throwing', () => {
    const input = {
      'organization:runprise:2': {
        items: {
          ok: { lane: 'today', remoteStatusOptionId: 'opt', movedAt: NOW },
          okNull: { lane: 'done', remoteStatusOptionId: null, movedAt: NOW },
          badLane: { lane: 'later', remoteStatusOptionId: 'opt', movedAt: NOW },
          badDate: { lane: 'today', remoteStatusOptionId: 'opt', movedAt: 'yesterday' },
          badStatus: { lane: 'today', remoteStatusOptionId: 7, movedAt: NOW },
          notObject: 'x'
        }
      },
      broken: { items: 'nope' },
      alsoBroken: 42
    }
    expect(sanitizeMyIssuesBoardState(input)).toEqual({
      'organization:runprise:2': {
        items: {
          ok: { lane: 'today', remoteStatusOptionId: 'opt', movedAt: NOW },
          okNull: { lane: 'done', remoteStatusOptionId: null, movedAt: NOW }
        }
      }
    })
  })
})
