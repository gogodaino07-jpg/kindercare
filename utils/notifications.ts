import * as Notifications from 'expo-notifications';
import { Event, NotificationSettings, TimeOfDay } from '../types/models';
import { isPast, parseISODate } from './date';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function timeToHour24(time: TimeOfDay): number {
  if (time.period === 'AM') return time.hour === 12 ? 0 : time.hour;
  return time.hour === 12 ? 12 : time.hour + 12;
}

function withTime(date: Date, time: TimeOfDay): Date {
  const result = new Date(date);
  result.setHours(timeToHour24(time), time.minute, 0, 0);
  return result;
}

export async function scheduleEventNotifications(
  events: Event[],
  settings: NotificationSettings
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!settings.enabled) return;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  const upcoming = events.filter((e) => !isPast(e.date));

  for (const event of upcoming) {
    const eventDate = parseISODate(event.date);

    const dayBefore = new Date(eventDate);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const dayBeforeTrigger = withTime(dayBefore, settings.dayBeforeTime);
    if (dayBeforeTrigger.getTime() > Date.now()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `내일 일정: ${event.title}`,
          body: event.note ? `준비물: ${event.note}` : '준비물을 확인해주세요',
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: dayBeforeTrigger },
      });
    }

    if (settings.sameDayEnabled) {
      const sameDayTrigger = withTime(eventDate, settings.sameDayTime);
      if (sameDayTrigger.getTime() > Date.now()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `오늘 일정: ${event.title}`,
            body: event.note ? `준비물: ${event.note}` : '오늘 일정이 있어요',
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: sameDayTrigger },
        });
      }
    }
  }
}
