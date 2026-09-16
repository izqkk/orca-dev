import { z } from 'zod'
import { sanitizeMyIssuesBoardState } from '../github/my-issues-board'
import type { MyIssuesBoardState } from '../github/my-issues-board'

/** Delegates to the shared sanitizer rather than a per-field zod shape, so an
 *  unrecognized lane or item degrades per-entry instead of rejecting the whole
 *  ui.set payload. */
export const MyIssuesBoardParam = z
  .custom<MyIssuesBoardState>()
  .transform((value) => sanitizeMyIssuesBoardState(value))
