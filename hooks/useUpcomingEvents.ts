import { useMemo } from 'react';
import { useAppData } from '../context/AppDataContext';
import { Event } from '../types/models';
import { isPast, isTomorrow, toISODate } from '../utils/date';

export interface EventDateGroup {
  date: string;
  events: Event[];
}

export interface UpcomingEvents {
  /** Today's events — always shown regardless of the current time. */
  mainEvents: Event[];
  /** Tomorrow's events — always shown alongside today's, regardless of the current time. */
  secondaryEvents: Event[];
  featuredLaterEvents: Event[];
  displayType: 'TODAY' | 'TOMORROW';
  laterGroups: EventDateGroup[];
  isEmpty: boolean;
}

export function useUpcomingEvents(): UpcomingEvents {
  const { events, selectedChild } = useAppData();

  return useMemo(() => {
    const now = new Date();
    const todayISO = toISODate(now);

    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(now.getDate() + 1);
    const tomorrowISO = toISODate(tomorrowDate);

    const weekLaterDate = new Date(now);
    weekLaterDate.setDate(now.getDate() + 7);
    const weekLaterISO = toISODate(weekLaterDate);

    const upcoming = events
      .filter((e) => e.childId === selectedChild?.id && e.date >= todayISO && e.date < weekLaterISO)
      .sort((a, b) => a.date.localeCompare(b.date));

    const mainEvents = upcoming.filter((e) => e.date === todayISO);
    const secondaryEvents = upcoming.filter((e) => e.date === tomorrowISO);

    // Filter events for the "Upcoming" timeline (excluding today and tomorrow,
    // which already have their own dedicated cards above).
    const laterEvents = upcoming.filter((e) => e.date !== todayISO && e.date !== tomorrowISO);

    const groupsByDate = new Map<string, Event[]>();
    for (const event of laterEvents) {
      const group = groupsByDate.get(event.date) ?? [];
      group.push(event);
      groupsByDate.set(event.date, group);
    }

    const laterGroups: EventDateGroup[] = Array.from(groupsByDate.entries())
      .map(([date, groupEvents]) => ({ date, events: groupEvents }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // For backward compatibility with existing components if needed
    const featuredLaterEvents = laterEvents;

    const hasVisibleContent = mainEvents.length > 0 || laterGroups.length > 0 || secondaryEvents.length > 0;

    return {
      mainEvents,
      secondaryEvents,
      featuredLaterEvents,
      displayType: 'TODAY',
      laterGroups,
      isEmpty: !hasVisibleContent,
    };
  }, [events, selectedChild]);
}
