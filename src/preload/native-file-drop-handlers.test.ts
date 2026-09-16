// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { ipcSend } = vi.hoisted(() => ({ ipcSend: vi.fn() }))
vi.mock('electron', () => ({
  ipcRenderer: { send: ipcSend, invoke: vi.fn(), on: vi.fn(), removeListener: vi.fn() },
  webUtils: { getPathForFile: vi.fn(() => '') }
}))

import { installNativeFileDropHandlers } from './preload-runtime-support'
import { ORCA_INTERNAL_FILE_DRAG_TYPE } from '../shared/native-file-drop'

class FakeDataTransfer {
  dropEffect = 'none'
  effectAllowed = 'all'
  readonly types: string[]
  readonly files: File[]
  readonly items: { kind: string; type: string; getAsFile: () => File | null }[] = []
  private readonly data = new Map<string, string>()
  constructor(types: string[], files: File[] = []) {
    this.types = [...types, ...(files.length > 0 ? ['Files'] : [])]
    this.files = files
    for (const type of types) {
      this.data.set(type, 'payload')
    }
  }
  getData(type: string): string {
    return this.data.get(type) ?? ''
  }
  setData(type: string, value: string): void {
    this.data.set(type, value)
    if (!this.types.includes(type)) {
      this.types.push(type)
    }
  }
}

function dispatchDrop(target: HTMLElement, transfer: FakeDataTransfer): Event {
  const event = new Event('drop', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', { value: transfer })
  target.dispatchEvent(event)
  return event
}

describe('installNativeFileDropHandlers drop listener', () => {
  let root: HTMLDivElement
  let target: HTMLDivElement
  let seenByTarget: Event[]

  beforeEach(() => {
    root = document.createElement('div')
    target = document.createElement('div')
    root.appendChild(target)
    document.body.appendChild(root)
    seenByTarget = []
    // Why: React delegates to the root container in the bubble phase; a bubble listener on the
    // parent stands in for it.
    root.addEventListener('drop', (event) => seenByTarget.push(event))
    installNativeFileDropHandlers()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    ipcSend.mockReset()
  })

  it('lets a file-less internal drag propagate to React while still cancelling the default', () => {
    const event = dispatchDrop(
      target,
      new FakeDataTransfer(['application/x-orca-my-issues-item-id', 'text/plain'])
    )
    expect(seenByTarget).toHaveLength(1)
    expect(event.defaultPrevented).toBe(true)
    expect(ipcSend).not.toHaveBeenCalled()
  })

  it('leaves drags stamped with the internal file MIME completely alone', () => {
    const event = dispatchDrop(target, new FakeDataTransfer([ORCA_INTERNAL_FILE_DRAG_TYPE]))
    expect(seenByTarget).toHaveLength(1)
    expect(event.defaultPrevented).toBe(false)
    expect(ipcSend).not.toHaveBeenCalled()
  })

  it('still claims a native OS file drop before React sees it', () => {
    const file = new File(['x'], 'a.txt')
    const event = dispatchDrop(target, new FakeDataTransfer([], [file]))
    expect(seenByTarget).toHaveLength(0)
    expect(event.defaultPrevented).toBe(true)
  })
})
