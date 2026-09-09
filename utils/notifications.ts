import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
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

const ANDROID_CHANNEL_ID = 'event-reminders';

/** Android 8+ silently drops notifications with no channel, so this must run before any schedule call. */
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: '일정 알림',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
}

function timeToHour24(time: TimeOfDay): number {
  if (time.period === 'AM') return time.hour === 12 ? 0 : time.hour;
  return time.hour === 12 ? 12 : time.hour + 12;
}

function withTime(date: Date, time: TimeOfDay): Date {
  const result = new Date(date);
  result.setHours(timeToHour24(time), time.minute, 0, 0);
  return result;
}

/** 준비물도 공지사항도 없이 제목만 있는 일정은 알려줄 내용이 없어 푸시 알림을 보낼 필요가 없다. */
function hasNotifiableContent(event: Event): boolean {
  return (event.items?.length ?? 0) > 0 || !!event.note?.trim() || !!event.noticeText?.trim();
}

/** 알림 본문에 보여줄 요약 — 준비물이 있으면 준비물을, 없으면 공지사항을 우선 보여준다. */
function summaryLine(event: Event): string {
  if (event.note?.trim()) return `준비물: ${event.note}`;
  if (event.noticeText?.trim()) return event.noticeText;
  return '일정을 확인해주세요';
}

/** 같은 날짜에 일정이 여러 건이면 하나로 묶어서 알려준다 — 1건이면 그 일정 내용 그대로, 여러 건이면 건수+목록으로. */
function buildNotificationContent(
  label: string,
  dateEvents: Event[]
): { title: string; body: string; data: { date: string } } {
  const data = { date: dateEvents[0].date };
  if (dateEvents.length === 1) {
    return { title: `[${label}] ${dateEvents[0].title}`, body: summaryLine(dateEvents[0]), data };
  }
  return {
    title: `[${label}] 일정 ${dateEvents.length}건`,
    body: dateEvents.map((e) => `• ${e.title}`).join('\n'),
    data,
  };
}

// events/notificationSettings가 바뀔 때마다 호출되는데, 로그인 직후처럼 둘 다 짧은 시간에
// 여러 번 바뀌면 이 함수가 겹쳐서 실행될 수 있다. 각 호출은 "전체 취소 후 재등록"이라, 두
// 호출이 겹치면 (A: 취소 → B: 취소 → A: 등록 → B: 등록) 순서로 인터리빙되면서 A가 등록한
// 알림이 B의 취소를 피해 살아남아 같은 알림이 중복으로 남는 경쟁 상태가 있었다 — 실기기에서
// 똑같은 알림 2개가 동시에 온 것으로 확인됨. 실행 중에 새 호출이 들어오면 지금 실행을
// 끊지 않고, 끝난 뒤 마지막 인자로 한 번만 더 실행되도록 직렬화해서 막는다.
let scheduleInFlight: Promise<void> | null = null;
let pendingArgs: { events: Event[]; settings: NotificationSettings } | null = null;

export function scheduleEventNotifications(
  events: Event[],
  settings: NotificationSettings
): Promise<void> {
  if (scheduleInFlight) {
    pendingArgs = { events, settings };
    return scheduleInFlight;
  }
  scheduleInFlight = runScheduleEventNotifications(events, settings).finally(() => {
    scheduleInFlight = null;
    if (pendingArgs) {
      const next = pendingArgs;
      pendingArgs = null;
      scheduleEventNotifications(next.events, next.settings);
    }
  });
  return scheduleInFlight;
}

async function runScheduleEventNotifications(
  events: Event[],
  settings: NotificationSettings
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!settings.enabled) return;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  await ensureAndroidChannel();

  const upcoming = events.filter((e) => !isPast(e.date) && hasNotifiableContent(e));

  const byDate = new Map<string, Event[]>();
  for (const event of upcoming) {
    const arr = byDate.get(event.date) ?? [];
    arr.push(event);
    byDate.set(event.date, arr);
  }

  for (const [dateISO, dateEvents] of byDate) {
    const eventDate = parseISODate(dateISO);

    const dayBeforeEvents = dateEvents.filter((e) => e.notifyDayBefore !== false);
    if (dayBeforeEvents.length > 0) {
      const dayBefore = new Date(eventDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      const dayBeforeTrigger = withTime(dayBefore, settings.dayBeforeTime);
      if (dayBeforeTrigger.getTime() > Date.now()) {
        await Notifications.scheduleNotificationAsync({
          content: buildNotificationContent('내일', dayBeforeEvents),
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: dayBeforeTrigger,
            channelId: ANDROID_CHANNEL_ID,
          },
        });
      }
    }

    if (settings.sameDayEnabled) {
      const sameDayTrigger = withTime(eventDate, settings.sameDayTime);
      if (sameDayTrigger.getTime() > Date.now()) {
        await Notifications.scheduleNotificationAsync({
          content: buildNotificationContent('오늘', dateEvents),
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: sameDayTrigger,
            channelId: ANDROID_CHANNEL_ID,
          },
        });
      }
    }
  }
}
