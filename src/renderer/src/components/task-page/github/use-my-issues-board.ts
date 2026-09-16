import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppStore } from '@/store'
import { useProjectViewTable } from '@/components/github-project/useProjectViewTable'
import {
  readMyIssuesBoardDragData,
  writeMyIssuesBoardDragData
} from '@/lib/my-issues-board-drag-payload'
import {
  EMPTY_MY_ISSUES_PROJECT_STATE,
  moveMyIssuesItem,
  myIssuesProjectStatesEqual,
  syncMyIssuesBoard,
  type MyIssuesLane
} from '../../../../../shared/github/my-issues-board'
import {
  githubProjectHost,
  githubProjectIdentityKey
} from '../../../../../shared/github/project-identity'
import {
  findSingleSelectField,
  groupMyIssuesRowsByLane,
  selectMyIssuesRows,
  toMyIssuesSyncRows,
  type MyIssuesBoardRow
} from './my-issues-board-rows'

const EMPTY_ROWS: MyIssuesBoardRow[] = []

export function useMyIssuesBoard({
  selectedRepoIds,
  viewerLogin
}: {
  selectedRepoIds: ReadonlySet<string>
  viewerLogin: string | null
}) {
  // Why: same project + cache as Projects mode; the unfiltered `table` is used because the
  // board is scoped by assignee, not by the sidebar's repo selection.
  const tableState = useProjectViewTable(selectedRepoIds)
  const { activeProject, table, loading, error, currentCacheKey, settings, doFetch } = tableState
  const boardState = useAppStore((state) => state.githubMyIssuesBoard)
  const setGithubMyIssuesBoardProject = useAppStore((state) => state.setGithubMyIssuesBoardProject)
  const projectKey = activeProject ? githubProjectIdentityKey(activeProject) : null
  const projectState =
    (projectKey ? boardState[projectKey] : undefined) ?? EMPTY_MY_ISSUES_PROJECT_STATE

  const rows = useMemo(
    () => (table && viewerLogin ? selectMyIssuesRows(table, viewerLogin) : EMPTY_ROWS),
    [table, viewerLogin]
  )
  const statusFieldMissing = !!table && findSingleSelectField(table.selectedView, 'Status') === null

  useEffect(() => {
    if (!projectKey || !table || !viewerLogin) {
      return
    }
    const next = syncMyIssuesBoard(projectState, toMyIssuesSyncRows(rows), new Date().toISOString())
    if (next !== projectState && !myIssuesProjectStatesEqual(next, projectState)) {
      setGithubMyIssuesBoardProject(projectKey, next)
    }
  }, [projectKey, projectState, rows, setGithubMyIssuesBoardProject, table, viewerLogin])

  const lanes = useMemo(() => groupMyIssuesRowsByLane(rows, projectState), [rows, projectState])

  const [draggingItemId, setDraggingItemId] = useState<string | null>(null)
  const [dragOverLane, setDragOverLane] = useState<MyIssuesLane | null>(null)

  const onCardDragStart = useCallback((itemId: string, event: React.DragEvent<HTMLElement>) => {
    if (!writeMyIssuesBoardDragData(event.dataTransfer, itemId)) {
      event.preventDefault()
      return
    }
    setDraggingItemId(itemId)
  }, [])

  const onCardDragEnd = useCallback(() => {
    setDraggingItemId(null)
    setDragOverLane(null)
  }, [])

  const onLaneDragOver = useCallback((lane: MyIssuesLane, event: React.DragEvent<HTMLElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverLane(lane)
  }, [])

  const onLaneDrop = useCallback(
    (lane: MyIssuesLane, event: React.DragEvent<HTMLElement>) => {
      event.preventDefault()
      event.stopPropagation()
      setDragOverLane(null)
      const payload = readMyIssuesBoardDragData(event.dataTransfer)
      const itemId =
        payload.status === 'item'
          ? payload.itemId
          : payload.status === 'hidden'
            ? draggingItemId
            : null
      setDraggingItemId(null)
      if (!itemId || !projectKey || !rows.some((entry) => entry.row.id === itemId)) {
        return
      }
      const next = moveMyIssuesItem(projectState, itemId, lane, new Date().toISOString())
      if (next !== projectState) {
        setGithubMyIssuesBoardProject(projectKey, next)
      }
    },
    [draggingItemId, projectKey, projectState, rows, setGithubMyIssuesBoardProject]
  )

  const refresh = useCallback(() => {
    if (!activeProject) {
      return
    }
    const viewId =
      settings?.githubProjects?.lastViewByProject[githubProjectIdentityKey(activeProject)]?.viewId
    if (!viewId) {
      return
    }
    void doFetch(
      {
        owner: activeProject.owner,
        ownerType: activeProject.ownerType,
        projectNumber: activeProject.number,
        host: githubProjectHost(activeProject.host),
        viewId
      },
      true
    )
  }, [activeProject, doFetch, settings])

  return {
    activeProject,
    table,
    loading,
    error,
    currentCacheKey,
    settings,
    statusFieldMissing,
    rows,
    lanes,
    draggingItemId,
    dragOverLane,
    onCardDragStart,
    onCardDragEnd,
    onLaneDragOver,
    onLaneDrop,
    refresh
  }
}

export type MyIssuesBoardModel = ReturnType<typeof useMyIssuesBoard>
