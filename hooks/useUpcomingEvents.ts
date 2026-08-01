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

    // 10 AM is the cutoff
    const isMorning = currentHour < 10;
    const displayType = isMorning ? 'TODAY' : 'TOMORROW';
    const mainDateISO = isMorning ? todayISO : tomorrowISO;

    const upcoming = events
      .filter((e) => e.childId === selectedChild?.id && !isPast(e.date))
      .sort((a, b) => a.date.localeCompare(b.date));

    const mainEvents = upcoming.filter((e) => e.date === mainDateISO);

    // Logic for featured later events (next 3 distinct days)
    let featuredLaterEvents: Event[] = [];
    let laterEvents = upcoming.filter((e) => e.date > mainDateISO);

    if (displayType === 'TOMORROW') {
      const distinctDays = Array.from(new Set(laterEvents.map(e => e.date))).slice(0, 3);
      featuredLaterEvents = laterEvents.filter(e => distinctDays.includes(e.date));
      laterEvents = laterEvents.filter(e => !distinctDays.includes(e.date));
    }

    const groupsByDate = new Map<string, Event[]>();
    for (const event of laterEvents) {
      const group = groupsByDate.get(event.date) ?? [];
      group.push(event);
      groupsByDate.set(event.date, group);
    }

    const laterGroups: EventDateGroup[] = Array.from(groupsByDate.entries()).map(
      ([date, groupEvents]) => ({ date, events: groupEvents })
    );

    // Card should be hidden if there are NO events to show for the current context (Today/Tomorrow lookahead)
    const hasVisibleContent =
      mainEvents.length > 0 ||
      featuredLaterEvents.length > 0 ||
      laterGroups.length > 0;

    return {
      mainEvents,
      featuredLaterEvents,
      displayType,
      laterGroups,
      isEmpty: !hasVisibleContent,
    };
  }, [events, selectedChild]);
}
