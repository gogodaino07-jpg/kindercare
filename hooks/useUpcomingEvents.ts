import { useMemo } from 'react';
import { useAppData } from '../context/AppDataContext';
import { Event } from '../types/models';
import { isPast, isTomorrow, toISODate } from '../utils/date';

export interface EventDateGroup {
  date: string;
  events: Event[];
}

export interface UpcomingEvents {
  mainEvents: Event[];
  /** Today's leftover events when the main focus has shifted to tomorrow (afternoon). Empty in the morning, since mainEvents already covers today. */
  secondaryEvents: Event[];
  featuredLaterEvents: Event[]; // New: Next 3 days of events when after 10 AM
  displayType: 'TODAY' | 'TOMORROW';
  laterGroups: EventDateGroup[];
  isEmpty: boolean;
}

export function useUpcomingEvents(): UpcomingEvents {
  const { events, selectedChild } = useAppData();

  return useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const todayISO = toISODate(now);

    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(now.getDate() + 1);
    const tomorrowISO = toISODate(tomorrowDate);

    const isMorning = currentHour < 10;
    const displayType = isMorning ? 'TODAY' : 'TOMORROW';
    const mainDateISO = isMorning ? todayISO : tomorrowISO;

    const weekLaterDate = new Date(now);
    weekLaterDate.setDate(now.getDate() + 7);
    const weekLaterISO = toISODate(weekLaterDate);

    const upcoming = events
      .filter((e) => e.childId === selectedChild?.id && e.date >= todayISO && e.date < weekLaterISO)
      .sort((a, b) => a.date.localeCompare(b.date));

    const mainEvents = upcoming.filter((e) => e.date === mainDateISO);

    // In the afternoon, focus shifts to tomorrow — but today's leftover events still need
    // surfacing (just de-emphasized), not silently dropped or mixed into the future timeline.
    const secondaryEvents = isMorning ? [] : upcoming.filter((e) => e.date === todayISO);

    // Filter events for the "Upcoming" timeline (excluding the main focused date AND today,
    // so today's events never leak into the future-adventures section).
    const laterEvents = upcoming.filter((e) => e.date !== mainDateISO && e.date !== todayISO);

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
      displayType,
      laterGroups,
      isEmpty: !hasVisibleContent,
    };
  }, [events, selectedChild]);
}
