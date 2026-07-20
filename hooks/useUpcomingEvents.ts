import { useMemo } from 'react';
import { useAppData } from '../context/AppDataContext';
import { Event } from '../types/models';
import { isPast, isTomorrow } from '../utils/date';

export interface EventDateGroup {
  date: string;
  events: Event[];
}

export interface UpcomingEvents {
  tomorrowEvents: Event[];
  laterGroups: EventDateGroup[];
  isEmpty: boolean;
}

export function useUpcomingEvents(): UpcomingEvents {
  const { events, selectedChild } = useAppData();

  return useMemo(() => {
    const upcoming = events
      .filter((e) => e.childId === selectedChild?.id && !isPast(e.date))
      .sort((a, b) => a.date.localeCompare(b.date));

    const tomorrowEvents = upcoming.filter((e) => isTomorrow(e.date));
    const laterEvents = upcoming.filter((e) => !isTomorrow(e.date));

    const groupsByDate = new Map<string, Event[]>();
    for (const event of laterEvents) {
      const group = groupsByDate.get(event.date) ?? [];
      group.push(event);
      groupsByDate.set(event.date, group);
    }
    const laterGroups: EventDateGroup[] = Array.from(groupsByDate.entries()).map(
      ([date, groupEvents]) => ({ date, events: groupEvents })
    );

    return {
      tomorrowEvents,
      laterGroups,
      isEmpty: upcoming.length === 0,
    };
  }, [events, selectedChild]);
}
