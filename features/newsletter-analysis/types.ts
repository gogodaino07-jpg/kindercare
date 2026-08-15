import { Event, MealPlan } from '../../types/models';

/** An AI-extracted event still being reviewed on the ai-review screen — not saved yet, so it has no permanent `id`, just a `localId` for React keys/local edits. */
export type DraftEvent = Omit<Event, 'id'> & { localId: string };

/** Same idea as DraftEvent, for the meal plan entries surfaced alongside events during review. */
export type DraftMealPlan = Omit<MealPlan, 'id'> & { localId: string };
