import { measureClipboardTextByteLength } from '../../../shared/clipboard-text'

export const MY_ISSUES_BOARD_DRAG_ITEM_MIME = 'application/x-orca-my-issues-item-id'
export const MY_ISSUES_BOARD_DRAG_ITEM_ID_MAX_BYTES = 1024

export type MyIssuesBoardDragReadResult =
  | { status: 'item'; itemId: string }
  | { status: 'hidden' }
  | { status: 'missing' }
  | { status: 'rejected'; reason: 'too-large' }

export function writeMyIssuesBoardDragData(
  dataTransfer: Pick<DataTransfer, 'setData'> & { effectAllowed: string },
  itemId: string
): boolean {
  if (!itemId || isItemIdTooLarge(itemId)) {
    return false
  }
  dataTransfer.effectAllowed = 'move'
  dataTransfer.setData(MY_ISSUES_BOARD_DRAG_ITEM_MIME, itemId)
  dataTransfer.setData('text/plain', itemId)
  return true
}

export function readMyIssuesBoardDragData(
  dataTransfer: Pick<DataTransfer, 'getData' | 'types'>
): MyIssuesBoardDragReadResult {
  const hasTypedPayload = Array.from(dataTransfer.types).includes(MY_ISSUES_BOARD_DRAG_ITEM_MIME)
  const itemId = dataTransfer.getData(MY_ISSUES_BOARD_DRAG_ITEM_MIME)
  if (!itemId) {
    return hasTypedPayload ? { status: 'hidden' } : { status: 'missing' }
  }
  if (isItemIdTooLarge(itemId)) {
    return { status: 'rejected', reason: 'too-large' }
  }
  return { status: 'item', itemId }
}

function isItemIdTooLarge(itemId: string): boolean {
  return (
    itemId.length > MY_ISSUES_BOARD_DRAG_ITEM_ID_MAX_BYTES ||
    measureClipboardTextByteLength(itemId, {
      stopAfterBytes: MY_ISSUES_BOARD_DRAG_ITEM_ID_MAX_BYTES
    }).exceededLimit
  )
}
