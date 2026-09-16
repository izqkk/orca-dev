import { describe, expect, it } from 'vitest'
import { sanitizeGithubMyIssuesBoard, sanitizeTaskResumeState } from './ui-slice-hydration-values'

describe('sanitizeTaskResumeState githubMode', () => {
  it.each(['items', 'project', 'my-issues'])('keeps %j', (mode) => {
    expect(sanitizeTaskResumeState({ githubMode: mode })?.githubMode).toBe(mode)
  })

  it('drops an unknown mode', () => {
    expect(sanitizeTaskResumeState({ githubMode: 'board' })?.githubMode).toBeUndefined()
  })
})

describe('sanitizeGithubMyIssuesBoard', () => {
  it('delegates to the shared sanitizer', () => {
    expect(sanitizeGithubMyIssuesBoard(undefined)).toEqual({})
    expect(
      sanitizeGithubMyIssuesBoard({
        p: {
          items: {
            a: { lane: 'today', remoteStatusOptionId: null, movedAt: '2026-09-16T10:00:00.000Z' },
            b: { lane: 'nope', remoteStatusOptionId: null, movedAt: '2026-09-16T10:00:00.000Z' }
          }
        }
      })
    ).toEqual({
      p: {
        items: {
          a: { lane: 'today', remoteStatusOptionId: null, movedAt: '2026-09-16T10:00:00.000Z' }
        }
      }
    })
  })
})
