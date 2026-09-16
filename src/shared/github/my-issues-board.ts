export type MyIssuesLane = 'backlog' | 'ready' | 'today' | 'in-review' | 'done'

export const MY_ISSUES_LANES: readonly MyIssuesLane[] = [
  'backlog',
  'ready',
  'today',
  'in-review',
  'done'
]

export type MyIssuesBoardItemState = {
  lane: MyIssuesLane
  /** Status option id seen at the last sync; null when the row had no status. */
  remoteStatusOptionId: string | null
  /** ISO timestamp of the last local move or first sync; orders the `today` lane. */
  movedAt: string
}

export type MyIssuesBoardProjectState = {
  items: Record<string, MyIssuesBoardItemState>
}

/** Keyed by `githubProjectIdentityKey(project)`. */
export type MyIssuesBoardState = Record<string, MyIssuesBoardProjectState>

export type MyIssuesSyncRow = {
  id: string
  statusOptionId: string | null
  statusName: string | null
}

export const EMPTY_MY_ISSUES_PROJECT_STATE: MyIssuesBoardProjectState = { items: {} }

const LANE_SET = new Set<string>(MY_ISSUES_LANES)

export function isMyIssuesLane(value: unknown): value is MyIssuesLane {
  return typeof value === 'string' && LANE_SET.has(value)
}

// Why: matched by name so any project with the same Status vocabulary works; `today` is local-only.
const REMOTE_STATUS_TO_LANE: Record<string, MyIssuesLane> = {
  'ideen sonstiges': 'backlog',
  backlog: 'backlog',
  ready: 'backlog',
  'in progress': 'ready',
  'in review': 'in-review',
  done: 'done'
}

export function mapRemoteStatusToLane(statusName: string | null | undefined): MyIssuesLane {
  if (!statusName) {
    return 'backlog'
  }
  return REMOTE_STATUS_TO_LANE[statusName.trim().toLowerCase()] ?? 'backlog'
}

export function syncMyIssuesBoard(
  previous: MyIssuesBoardProjectState,
  rows: readonly MyIssuesSyncRow[],
  now: string
): MyIssuesBoardProjectState {
  const items: Record<string, MyIssuesBoardItemState> = {}
  let changed = Object.keys(previous.items).length !== rows.length
  for (const row of rows) {
    const entry = previous.items[row.id]
    if (entry && entry.remoteStatusOptionId === row.statusOptionId) {
      items[row.id] = entry
      continue
    }
    items[row.id] = {
      lane: mapRemoteStatusToLane(row.statusName),
      remoteStatusOptionId: row.statusOptionId,
      movedAt: now
    }
    changed = true
  }
  return changed ? { items } : previous
}

export function moveMyIssuesItem(
  state: MyIssuesBoardProjectState,
  itemId: string,
  lane: MyIssuesLane,
  now: string
): MyIssuesBoardProjectState {
  const entry = state.items[itemId]
  if (!entry || entry.lane === lane) {
    return state
  }
  return { items: { ...state.items, [itemId]: { ...entry, lane, movedAt: now } } }
}

export function myIssuesProjectStatesEqual(
  a: MyIssuesBoardProjectState,
  b: MyIssuesBoardProjectState
): boolean {
  const aKeys = Object.keys(a.items)
  if (aKeys.length !== Object.keys(b.items).length) {
    return false
  }
  return aKeys.every((key) => {
    const x = a.items[key]
    const y = b.items[key]
    return (
      !!y &&
      x.lane === y.lane &&
      x.remoteStatusOptionId === y.remoteStatusOptionId &&
      x.movedAt === y.movedAt
    )
  })
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

function sanitizeItem(value: unknown): MyIssuesBoardItemState | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: guarded by the typeof 'object' check above; only string-keyed reads follow.
  const { lane, remoteStatusOptionId, movedAt } = value as Record<string, unknown>
  if (!isMyIssuesLane(lane) || !isIsoTimestamp(movedAt)) {
    return null
  }
  if (remoteStatusOptionId !== null && typeof remoteStatusOptionId !== 'string') {
    return null
  }
  return { lane, remoteStatusOptionId, movedAt }
}

export function sanitizeMyIssuesBoardState(value: unknown): MyIssuesBoardState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  const result: MyIssuesBoardState = {}
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: guarded by the typeof 'object' check above; only string-keyed reads follow.
  for (const [projectKey, projectValue] of Object.entries(value as Record<string, unknown>)) {
    if (!projectValue || typeof projectValue !== 'object') {
      continue
    }
    const rawItems = (projectValue as Record<string, unknown>).items
    if (!rawItems || typeof rawItems !== 'object' || Array.isArray(rawItems)) {
      continue
    }
    const items: Record<string, MyIssuesBoardItemState> = {}
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: guarded by the typeof 'object' check above; only string-keyed reads follow.
    for (const [itemId, rawItem] of Object.entries(rawItems as Record<string, unknown>)) {
      const item = sanitizeItem(rawItem)
      if (item) {
        items[itemId] = item
      }
    }
    result[projectKey] = { items }
  }
  return result
}
