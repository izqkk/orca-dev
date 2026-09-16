import { describe, expect, it } from 'vitest'
import {
  MY_ISSUES_BOARD_DRAG_ITEM_ID_MAX_BYTES,
  MY_ISSUES_BOARD_DRAG_ITEM_MIME,
  readMyIssuesBoardDragData,
  writeMyIssuesBoardDragData
} from './my-issues-board-drag-payload'

class FakeDataTransfer {
  effectAllowed = 'all'
  readonly types: string[] = []
  private readonly data = new Map<string, string>()
  getData(type: string): string {
    return this.data.get(type) ?? ''
  }
  setData(type: string, value: string): void {
    if (!this.types.includes(type)) {
      this.types.push(type)
    }
    this.data.set(type, value)
  }
}

describe('my-issues board drag payload', () => {
  it('writes and reads the typed item id', () => {
    const transfer = new FakeDataTransfer()
    expect(writeMyIssuesBoardDragData(transfer, 'PVTI_1')).toBe(true)
    expect(transfer.effectAllowed).toBe('move')
    expect(transfer.getData(MY_ISSUES_BOARD_DRAG_ITEM_MIME)).toBe('PVTI_1')
    expect(transfer.getData('text/plain')).toBe('PVTI_1')
    expect(readMyIssuesBoardDragData(transfer)).toEqual({ status: 'item', itemId: 'PVTI_1' })
  })

  it('reports hidden when the typed slot exists but is unreadable', () => {
    const transfer = new FakeDataTransfer()
    transfer.setData(MY_ISSUES_BOARD_DRAG_ITEM_MIME, '')
    expect(readMyIssuesBoardDragData(transfer)).toEqual({ status: 'hidden' })
  })

  it('reports missing for plain external text', () => {
    const transfer = new FakeDataTransfer()
    transfer.setData('text/plain', 'PVTI_1')
    expect(readMyIssuesBoardDragData(transfer)).toEqual({ status: 'missing' })
  })

  it('refuses to write and rejects on read when the id is oversized', () => {
    const big = 'x'.repeat(MY_ISSUES_BOARD_DRAG_ITEM_ID_MAX_BYTES + 1)
    const transfer = new FakeDataTransfer()
    expect(writeMyIssuesBoardDragData(transfer, big)).toBe(false)
    transfer.setData(MY_ISSUES_BOARD_DRAG_ITEM_MIME, big)
    expect(readMyIssuesBoardDragData(transfer)).toEqual({ status: 'rejected', reason: 'too-large' })
  })
})
