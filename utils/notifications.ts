import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Child, Event, NotificationSettings, TimeOfDay } from '../types/models';
import { daysSinceBirth, isPast, nextBirthMilestoneDate, parseISODate, toISODate } from './date';

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

export const SNOOZE_CATEGORY_ID = 'event-reminder-actions';
export const SNOOZE_ACTION_ID = 'snooze';

let snoozeCategoryRegistered = false;
/** 알림에 "나중에 다시 알림" 액션 버튼을 붙이려면 이 카테고리를 스케줄 전에 등록해둬야 한다. */
async function ensureSnoozeCategory(): Promise<void> {
  if (snoozeCategoryRegistered) return;
  snoozeCategoryRegistered = true;
  await Notifications.setNotificationCategoryAsync(SNOOZE_CATEGORY_ID, [
    {
      identifier: SNOOZE_ACTION_ID,
      buttonTitle: '나중에 다시 알림',
      options: { opensAppToForeground: true },
    },
  ]);
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
): {
  title: string;
  body: string;
  data: { date: string; notifKey: string };
  categoryIdentifier: string;
} {
  const date = dateEvents[0].date;
  // 같은 알림에 스누즈를 여러 번 눌러도 항상 같은 예약을 가리키도록 날짜+라벨로 안정적인 키를 만든다.
  const data = { date, notifKey: `${date}:${label}` };
  if (dateEvents.length === 1) {
    return {
      title: `[${label}] ${dateEvents[0].title}`,
      body: summaryLine(dateEvents[0]),
      data,
      categoryIdentifier: SNOOZE_CATEGORY_ID,
    };
  }
  return {
    title: `[${label}] 일정 ${dateEvents.length}건`,
    body: dateEvents.map((e) => `• ${e.title}`).join('\n'),
    data,
    categoryIdentifier: SNOOZE_CATEGORY_ID,
  };
}

// events/notificationSettings가 바뀔 때마다 호출되는데, 로그인 직후처럼 둘 다 짧은 시간에
// 여러 번 바뀌면 이 함수가 겹쳐서 실행될 수 있다. 각 호출은 "전체 취소 후 재등록"이라, 두
// 호출이 겹치면 (A: 취소 → B: 취소 → A: 등록 → B: 등록) 순서로 인터리빙되면서 A가 등록한
// 알림이 B의 취소를 피해 살아남아 같은 알림이 중복으로 남는 경쟁 상태가 있었다 — 실기기에서
// 똑같은 알림 2개가 동시에 온 것으로 확인됨. 실행 중에 새 호출이 들어오면 지금 실행을
// 끊지 않고, 끝난 뒤 마지막 인자로 한 번만 더 실행되도록 직렬화해서 막는다.
let scheduleInFlight: Promise<void> | null = null;
let pendingArgs: { events: Event[]; settings: NotificationSettings; children: Child[] } | null = null;

export function scheduleEventNotifications(
  events: Event[],
  settings: NotificationSettings,
  children: Child[] = []
): Promise<void> {
  if (scheduleInFlight) {
    pendingArgs = { events, settings, children };
    return scheduleInFlight;
  }
  scheduleInFlight = runScheduleEventNotifications(events, settings, children).finally(() => {
    scheduleInFlight = null;
    if (pendingArgs) {
      const next = pendingArgs;
      pendingArgs = null;
      scheduleEventNotifications(next.events, next.settings, next.children);
    }
  });
  return scheduleInFlight;
}

async function runScheduleEventNotifications(
  events: Event[],
  settings: NotificationSettings,
  children: Child[]
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;
  await ensureAndroidChannel();

  // 생후 100일 단위 기념일 알림은 "알림 설정"(일정 리마인더 on/off)이 꺼져 있어도
  // 계속 예약해준다 — 일정 리마인더와는 성격이 다른 축하 이벤트라서.
  await scheduleBirthMilestoneNotifications(children);
  if (!settings.enabled) return;

  await ensureSnoozeCategory();

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

/** 생후 100/200/300…일째(무한정) 기념일 하루 전날 저녁에 미리 알려준다. 매번 "다음 한 번의
 *  기념일"만 예약해두고, 이 함수 자체가 events/settings가 바뀔 때마다(즉 앱을 쓸 때마다)
 *  다시 호출되므로 그때마다 최신 다음 기념일로 자연스럽게 갱신된다. */
async function scheduleBirthMilestoneNotifications(children: Child[]): Promise<void> {
  for (const child of children) {
    const milestoneDate = nextBirthMilestoneDate(child.birthdate);
    if (!milestoneDate) continue;

    const daysSince = daysSinceBirth(child.birthdate, milestoneDate);
    if (daysSince === undefined) continue;
    const dayBefore = new Date(milestoneDate);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const trigger = withTime(dayBefore, { hour: 7, minute: 0, period: 'PM' });
    if (trigger.getTime() <= Date.now()) continue;

    const childLabel = child.name?.trim() || '아이';
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🎉 내일은 ${childLabel} 생후 ${daysSince}일이에요!`,
        body: '벌써 이만큼 자랐어요. 홈 화면에서 축하 효과를 확인해보세요.',
        data: { childId: child.id, milestoneDays: daysSince },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: trigger,
        channelId: ANDROID_CHANNEL_ID,
      },
    });
  }
}

const SNOOZE_MAP_STORAGE_KEY = 'kindercare_snooze_map';

async function loadSnoozeMap(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(SNOOZE_MAP_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * 알림의 "나중에 다시 알림" 버튼을 눌렀을 때 같은 알림(notifKey)을 지정한 분(minutes) 뒤로
 * 재예약한다. 같은 notifKey로 이미 잡혀 있는 이전 스누즈 예약이 있으면 먼저 취소해서, 스누즈를
 * 여러 번 반복해도(15분 → 다시 30분 등) 중복으로 울리지 않고 항상 가장 최근 선택만 남는다.
 */
export async function snoozeNotification(
  notifKey: string,
  title: string,
  body: string,
  date: string,
  minutes: number
): Promise<void> {
  await ensureAndroidChannel();
  await ensureSnoozeCategory();

  const map = await loadSnoozeMap();
  const previousId = map[notifKey];
  if (previousId) {
    await Notifications.cancelScheduledNotificationAsync(previousId).catch(() => {});
  }

  const newId = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { date, notifKey, isSnooze: true },
      categoryIdentifier: SNOOZE_CATEGORY_ID,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(Date.now() + minutes * 60 * 1000),
      channelId: ANDROID_CHANNEL_ID,
    },
  });

  map[notifKey] = newId;
  await AsyncStorage.setItem(SNOOZE_MAP_STORAGE_KEY, JSON.stringify(map)).catch(() => {});
}

// TODO(임시 테스트 기능): 배포 전 제거. 설정 > 알림 화면의 "테스트 알림 보내기" 버튼에서만 쓰인다.
// 스누즈 액션 버튼이 붙은 알림을 3초 뒤에 띄워서 실제 알림/스누즈 동작을 빠르게 확인하기 위한 용도.
export async function sendTestSnoozeNotification(): Promise<void> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  await ensureAndroidChannel();
  await ensureSnoozeCategory();

  const notifKey = `test:${Date.now()}`;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '[테스트] 알림 확인',
      body: '스누즈 버튼을 눌러 동작을 확인해보세요.',
      data: { date: toISODate(new Date()), notifKey },
      categoryIdentifier: SNOOZE_CATEGORY_ID,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3,
      channelId: ANDROID_CHANNEL_ID,
    },
  });
}
