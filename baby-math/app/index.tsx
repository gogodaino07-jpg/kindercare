// 홈 화면 (태블릿 가로모드 전용 레이아웃)
// 상단: 프로필 + 별/코인 카운터
// 좌측: 오늘의 모험 카드 + 덧셈/뺄셈 놀이 카드
// 우측: 숫자 인식 / 도형 놀이 / 스티커판 사이드바
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import BouncyPressable from '../src/components/BouncyPressable';
import ScreenHeader from '../src/components/ScreenHeader';
import { LEVELS, PRACTICES, getLevel } from '../src/constants/levels';
import { colors, radius, shadow, spacing } from '../src/constants/theme';
import { useGame } from '../src/context/GameContext';

export default function HomeScreen() {
  const router = useRouter();
  const {
    playerName,
    setPlayerName,
    currentLevelId,
    nextStageOf,
    isLevelUnlocked,
    stickers,
    loaded,
  } = useGame();

  const [nameModal, setNameModal] = useState(false);
  const [nameDraft, setNameDraft] = useState(playerName);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  const showNotice = (text: string) => {
    setNotice(text);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 2200);
  };

  const level = getLevel(currentLevelId) ?? LEVELS[0];
  const stage = nextStageOf(currentLevelId);

  // 덧셈(3단계) / 뺄셈(4단계) 바로가기
  const openLevel = (levelId: number) => {
    if (!isLevelUnlocked(levelId)) {
      const prev = getLevel(levelId - 1);
      showNotice(`${prev?.id}단계 «${prev?.title}»를 먼저 클리어하면 열려요!`);
      return;
    }
    router.push({ pathname: '/quiz', params: { level: String(levelId) } });
  };

  if (!loaded) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>🐣 준비 중...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader
        left={
          <BouncyPressable
            style={[styles.profile, shadow.card]}
            onPress={() => {
              setNameDraft(playerName);
              setNameModal(true);
            }}
          >
            <Text style={styles.profileFace}>🐥</Text>
            <View>
              <Text style={styles.profileHello}>안녕!</Text>
              <Text style={styles.profileName} numberOfLines={1}>
                {playerName}
              </Text>
            </View>
          </BouncyPressable>
        }
      />

      <View style={styles.body}>
        {/* 좌측 메인 영역 */}
        <View style={styles.mainArea}>
          <Animated.View entering={FadeInDown.duration(320)} style={styles.adventureWrap}>
            <BouncyPressable
              style={styles.fill}
              pressScale={0.97}
              onPress={() => router.push('/level-map')}
            >
              <LinearGradient
                colors={[colors.primary, colors.pink]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.adventureCard, shadow.float]}
              >
                <View style={styles.adventureTop}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>오늘의 모험</Text>
                  </View>
                  <Text style={styles.adventureEmoji}>{level.emoji}</Text>
                </View>

                <Text style={styles.adventureTitle}>
                  {level.id}단계 · {level.title}
                </Text>
                <Text style={styles.adventureSubtitle}>{level.subtitle}</Text>

                <View style={styles.stageRow}>
                  {Array.from({ length: level.stages }, (_, i) => (
                    <View
                      key={i}
                      style={[styles.stagePip, i < stage - 1 && styles.stagePipDone, i === stage - 1 && styles.stagePipNow]}
                    />
                  ))}
                  <Text style={styles.stageText}>
                    스테이지 {stage} / {level.stages}
                  </Text>
                </View>

                <View style={styles.playButton}>
                  <Text style={styles.playButtonText}>▶  모험 떠나기</Text>
                </View>
              </LinearGradient>
            </BouncyPressable>
          </Animated.View>

          {/* 덧셈 / 뺄셈 바로가기 */}
          <View style={styles.quickRow}>
            <QuickCard
              emoji="➕"
              title="덧셈놀이"
              caption="그림으로 더해요"
              color={colors.green}
              locked={!isLevelUnlocked(3)}
              onPress={() => openLevel(3)}
            />
            <QuickCard
              emoji="➖"
              title="뺄셈놀이"
              caption="그림으로 빼요"
              color={colors.blue}
              locked={!isLevelUnlocked(4)}
              onPress={() => openLevel(4)}
            />
          </View>
        </View>

        {/* 우측 사이드바 */}
        <View style={styles.sidebar}>
          {PRACTICES.map((practice) => (
            <SidebarCard
              key={practice.key}
              emoji={practice.emoji}
              title={practice.title}
              color={practice.color}
              onPress={() =>
                router.push({ pathname: '/quiz', params: { practice: practice.key } })
              }
            />
          ))}
          <SidebarCard
            emoji="🏅"
            title="스티커판"
            color={colors.pink}
            caption={`${stickers.length} / ${LEVELS.length}`}
            onPress={() => router.push('/stickers')}
          />
        </View>
      </View>

      {!!notice && (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(180)}
          style={[styles.notice, shadow.float]}
          pointerEvents="none"
        >
          <Text style={styles.noticeText}>{notice}</Text>
        </Animated.View>
      )}

      {/* 이름 바꾸기 */}
      <Modal visible={nameModal} transparent animationType="fade" onRequestClose={() => setNameModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, shadow.float]}>
            <Text style={styles.modalTitle}>이름을 알려주세요</Text>
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              style={styles.input}
              maxLength={10}
              placeholder="우리 아기"
              placeholderTextColor={colors.textSub}
            />
            <View style={styles.modalButtons}>
              <BouncyPressable
                style={[styles.modalButton, styles.modalCancel]}
                onPress={() => setNameModal(false)}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </BouncyPressable>
              <BouncyPressable
                style={[styles.modalButton, styles.modalConfirm]}
                onPress={() => {
                  setPlayerName(nameDraft);
                  setNameModal(false);
                }}
              >
                <Text style={styles.modalConfirmText}>저장</Text>
              </BouncyPressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function QuickCard({
  emoji,
  title,
  caption,
  color,
  locked,
  onPress,
}: {
  emoji: string;
  title: string;
  caption: string;
  color: string;
  locked?: boolean;
  onPress: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(80).duration(320)} style={styles.quickWrap}>
      <BouncyPressable style={styles.fill} onPress={onPress}>
        <View style={[styles.quickCard, shadow.card, { borderColor: locked ? colors.locked : color }]}>
          <Text style={[styles.quickEmoji, locked && styles.lockedContent]}>{emoji}</Text>
          <View style={styles.flexShrink}>
            <Text style={[styles.quickTitle, locked && styles.lockedText]}>{title}</Text>
            <Text style={styles.quickCaption}>{locked ? '아직 잠겨 있어요' : caption}</Text>
          </View>
          {locked && <Text style={styles.lockBadge}>🔒</Text>}
        </View>
      </BouncyPressable>
    </Animated.View>
  );
}

function SidebarCard({
  emoji,
  title,
  caption,
  color,
  onPress,
}: {
  emoji: string;
  title: string;
  caption?: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(140).duration(320)} style={styles.sidebarItem}>
      <BouncyPressable style={styles.fill} onPress={onPress}>
        <View style={[styles.sidebarCard, shadow.card, { borderColor: color }]}>
          <Text style={styles.sidebarEmoji}>{emoji}</Text>
          <Text style={styles.sidebarTitle}>{title}</Text>
          {!!caption && <Text style={styles.sidebarCaption}>{caption}</Text>}
        </View>
      </BouncyPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  fill: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  loadingText: { fontSize: 28, fontWeight: '800', color: colors.textSub },

  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 3,
    borderColor: colors.border,
    maxWidth: 260,
  },
  profileFace: { fontSize: 32 },
  profileHello: { fontSize: 13, fontWeight: '700', color: colors.textSub },
  profileName: { fontSize: 20, fontWeight: '800', color: colors.text },

  body: { flex: 1, flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  mainArea: { flex: 1, gap: spacing.md },

  adventureWrap: { flex: 1.6 },
  adventureCard: { flex: 1, borderRadius: radius.xl, padding: spacing.lg, justifyContent: 'space-between' },
  adventureTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  badgeText: { fontSize: 15, fontWeight: '800', color: colors.primaryDeep },
  adventureEmoji: { fontSize: 56 },
  adventureTitle: { fontSize: 34, fontWeight: '900', color: colors.textOnPrimary },
  adventureSubtitle: { fontSize: 17, fontWeight: '700', color: 'rgba(255,255,255,0.92)', marginTop: 2 },
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.sm },
  stagePip: {
    width: 22,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  stagePipDone: { backgroundColor: '#FFFFFF' },
  stagePipNow: { backgroundColor: colors.yellow },
  stageText: { marginLeft: 6, fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  playButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
  },
  playButtonText: { fontSize: 20, fontWeight: '900', color: colors.primaryDeep },

  quickRow: { flex: 1, flexDirection: 'row', gap: spacing.md },
  quickWrap: { flex: 1 },
  quickCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 3,
    backgroundColor: colors.card,
  },
  quickEmoji: { fontSize: 44 },
  quickTitle: { fontSize: 24, fontWeight: '900', color: colors.text },
  quickCaption: { fontSize: 14, fontWeight: '700', color: colors.textSub, marginTop: 2 },
  lockedContent: { opacity: 0.4 },
  lockedText: { color: colors.lockedText },
  lockBadge: { fontSize: 24, marginLeft: 'auto' },

  sidebar: { width: 240, gap: spacing.md },
  sidebarItem: { flex: 1 },
  sidebarCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 3,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
  },
  sidebarEmoji: { fontSize: 40 },
  sidebarTitle: { fontSize: 20, fontWeight: '900', color: colors.text },
  sidebarCaption: { fontSize: 14, fontWeight: '700', color: colors.textSub },

  notice: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  noticeText: { fontSize: 17, fontWeight: '800', color: colors.text },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(59,42,26,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: 420,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: { fontSize: 22, fontWeight: '900', color: colors.text, textAlign: 'center' },
  input: {
    borderWidth: 3,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  modalButtons: { flexDirection: 'row', gap: spacing.sm },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: radius.md, alignItems: 'center' },
  modalCancel: { backgroundColor: colors.border },
  modalCancelText: { fontSize: 18, fontWeight: '800', color: colors.textSub },
  modalConfirm: { backgroundColor: colors.primary },
  modalConfirmText: { fontSize: 18, fontWeight: '800', color: colors.textOnPrimary },
});
