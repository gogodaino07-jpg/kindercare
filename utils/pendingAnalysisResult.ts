import { Event } from '../types/models';

/**
 * Module-level (not React state) hand-off from upload.tsx to ai-review.tsx —
 * same pattern as utils/externalAction.ts. Passing the extracted events
 * through router params would mean serializing a whole JSON array into the
 * URL, so a plain in-memory holder is simpler and avoids that limit.
 */
let pendingResult: Omit<Event, 'id'>[] | null = null;

export function setPendingAnalysisResult(events: Omit<Event, 'id'>[]): void {
  pendingResult = events;
}

/** Reads and clears the pending result so a stale result never lingers for a later, unrelated visit to the AI review screen. */
export function takePendingAnalysisResult(): Omit<Event, 'id'>[] | null {
  const result = pendingResult;
  pendingResult = null;
  return result;
}
