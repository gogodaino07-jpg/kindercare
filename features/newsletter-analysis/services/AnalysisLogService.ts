import { Event } from '../../../types/models';

interface AnalysisLog {
  timestamp: string;
  originalEvents: Omit<Event, 'id'>[];
  finalEvents: Omit<Event, 'id'>[];
  diffDetected: boolean;
}

/**
 * Service to log the discrepancies between AI's initial analysis and
 * the user's final manual corrections. These logs are intended for
 * future model fine-tuning.
 */
export const AnalysisLogService = {
  async logCorrection(
    originalEvents: Omit<Event, 'id'>[],
    finalEvents: Omit<Event, 'id'>[]
  ): Promise<void> {
    const log: AnalysisLog = {
      timestamp: new Date().toISOString(),
      originalEvents,
      finalEvents,
      diffDetected: JSON.stringify(originalEvents) !== JSON.stringify(finalEvents),
    };

    // In a real production app, this would be a call to an analytics service
    // or a dedicated logging backend (e.g. Firebase Analytics or Firestore).
    console.log('[AnalysisLog] Recorded correction session:', JSON.stringify(log, null, 2));

    // For now, we just acknowledge the call.
    return Promise.resolve();
  }
};
