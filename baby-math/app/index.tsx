// 홈 화면 (태블릿 가로모드 전용)
// 하늘 배경 위에 카드가 떠 있는 구성
//  - 상단: 프로필(이름) + 별/코인 카운터
//  - 좌측: 오늘의 모험 히어로 카드 + 덧셈/뺄셈 놀이 타일
//  - 우측: 숫자 인식 / 도형 놀이 / 스티커판 사이드바
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInRight,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import BouncyPressable from '../src/components/BouncyPressable';
import RewardCounter from '../src/components/RewardCounter';
import SkyBackground from '../src/components/SkyBackground';
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
    stars,
    coins,
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

  // 덧셈(3단계) / 뺄셈(4단계) 바로가기 - 잠겨 있으면 안내만 띄운다
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
      <SkyBackground>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>🐣 준비 중...</Text>
        </View>
      </SkyBackground>
    );
  }

  return (
    <SkyBackground>
      <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
        {/* 상단 프로필 + 보상 카운터 */}
        <View style={styles.header}>
          <BouncyPressable
            style={styles.profile}
            onPress={() => {
              setNameDraft(playerName);
              setNameModal(true);
            }}
          >
            <View style={[styles.avatar, { borderColor: level.color }]}>
              <Text style={styles.avatarFace}>🐥</Text>
            </View>
            <View style={styles.profileText}>
              <Text style={styles.profileName} numberOfLines={1}>
                {playerName}
              </Text>
              <View style={[styles.levelChip, { backgroundColor: level.color }]}>
                <Text style={styles.levelChipText}>{level.id}단계 모험가</Text>
              </View>
            </View>
          </BouncyPressable>

          <View style={styles.counters}>
            <RewardCounter emoji="⭐" value={stars} isFlyTarget tint={colors.yellow} />
            <RewardCounter emoji="🪙" value={coins} tint={colors.primary} />
          </View>
        </View>

        <View style={styles.body}>
          {/* 좌측 메인 */}
          <View style={styles.main}>
            <Animated.View entering={FadeInDown.duration(340)} style={styles.heroWrap}>
              <BouncyPressable
                style={styles.fill}
                pressScale={0.98}
                onPress={() => router.push('/level-map')}
              >
                <View style={[styles.hero, { borderBottomColor: level.color }, shadow.float]}>
                  <View style={[styles.heroStripe, { backgroundColor: level.color }]} />

                  <View style={styles.heroLeft}>
                    <BobbingEmoji emoji={level.emoji} color={level.color} />
                  </View>

                  <View style={styles.heroRight}>
                    <Text style={styles.heroLabel}>오늘의 모험</Text>
                    <Text style={styles.heroTitle}>
                      {level.id}단계 · {level.title}
                    </Text>
                    <Text style={styles.heroSubtitle}>{level.subtitle}</Text>

                    <View style={styles.segments}>
                      {Array.from({ length: level.stages }, (_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.segment,
                            i < stage - 1 && { backgroundColor: level.color },
                            i === stage - 1 && [styles.segmentNow, { borderColor: level.color }],
                          ]}
                        />
                      ))}
                      <Text style={styles.segmentText}>
                        스테이지 {stage} / {level.stages}
                      </Text>
                    </View>

                    <View style={[styles.cta, { backgroundColor: level.color }]}>
                      <Text style={styles.ctaText}>▶  이어서 하기</Text>
                    </View>
                  </View>
                </View>
              </BouncyPressable>
            </Animated.View>

            {/* 덧셈 / 뺄셈 놀이 */}
            <View style={styles.tileRow}>
              <PlayTile
                emoji="➕"
                title="덧셈놀이"
                caption="그림으로 더해요"
                color={colors.green}
                bg="#E8FAE6"
                tilt={-1.5}
                delay={90}
                locked={!isLevelUnlocked(3)}
                onPress={() => openLevel(3)}
              />
              <PlayTile
                emoji="➖"
                title="뺄셈놀이"
                caption="그림으로 빼요"
                color={colors.blue}
                bg="#E6F2FF"
                tilt={1.5}
                delay={150}
                locked={!isLevelUnlocked(4)}
                onPress={() => openLevel(4)}
              />
            </View>
          </View>

          {/* 우측 사이드바 */}
          <View style={styles.sidebar}>
            {PRACTICES.map((practice, i) => (
              <SideItem
                key={practice.key}
                emoji={practice.emoji}
                title={practice.title}
                caption="자유 놀이"
                color={practice.color}
                delay={120 + i * 60}
                onPress={() => router.push({ pathname: '/quiz', params: { practice: practice.key } })}
              />
            ))}
            <SideItem
              emoji="🏅"
              title="스티커판"
              caption={`${stickers.length} / ${LEVELS.length} 모았어요`}
              color={colors.pink}
              delay={240}
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
            <Text style={styles.noticeText}>🔒 {notice}</Text>
          </Animated.View>
        )}

        {/* 이름 바꾸기 */}
        <Modal
          visible={nameModal}
          transparent
          animationType="fade"
          onRequestClose={() => setNameModal(false)}
        >
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
    </SkyBackground>
  );
}

/** 히어로 카드에서 위아래로 살랑거리는 캐릭터 */
function BobbingEmoji({ emoji, color }: { emoji: string; color: string }) {
  const bob = useSharedValue(0);

  useEffect(() => {
    bob.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [bob]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -10 * bob.value }] }));

  return (
    <View style={[styles.heroCircle, { backgroundColor: `${color}22`, borderColor: color }]}>
      <Animated.Text style={[styles.heroEmoji, style]}>{emoji}</Animated.Text>
    </View>
  );
}

function PlayTile({
  emoji,
  title,
  caption,
  color,
  bg,
  tilt,
  delay,
  locked,
  onPress,
}: {
  emoji: string;
  title: string;
  caption: string;
  color: string;
  bg: string;
  tilt: number;
  delay: number;
  locked?: boolean;
  onPress: () => void;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(320)}
      style={[styles.tileWrap, { transform: [{ rotate: `${tilt}deg` }] }]}
    >
      <BouncyPressable style={styles.fill} onPress={onPress}>
        <View
          style={[
            styles.tile,
            shadow.card,
            {
              backgroundColor: locked ? '#F2EFE9' : bg,
              borderBottomColor: locked ? colors.locked : color,
            },
          ]}
        >
          <View style={[styles.tileBadge, { backgroundColor: locked ? colors.locked : color }]}>
            <Text style={styles.tileBadgeText}>{locked ? '🔒' : emoji}</Text>
          </View>
          <Text style={[styles.tileTitle, locked && styles.lockedText]}>{title}</Text>
          <Text style={styles.tileCaption}>{locked ? '아직 잠겨 있어요' : caption}</Text>
        </View>
      </BouncyPressable>
    </Animated.View>
  );
}

function SideItem({
  emoji,
  title,
  caption,
  color,
  delay,
  onPress,
}: {
  emoji: string;
  title: string;
  caption: string;
  color: string;
  delay: number;
  onPress: () => void;
}) {
  return (
    <Animated.View entering={FadeInRight.delay(delay).duration(320)} style={styles.sideWrap}>
      <BouncyPressable style={styles.fill} onPress={onPress}>
        <View style={[styles.sideCard, shadow.card, { borderBottomColor: color }]}>
          <View style={[styles.sideBadge, { backgroundColor: `${color}26`, borderColor: color }]}>
            <Text style={styles.sideEmoji}>{emoji}</Text>
          </View>
          <View style={styles.flexShrink}>
            <Text style={styles.sideTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.sideCaption} numberOfLines={1}>
              {caption}
            </Text>
          </View>
        </View>
      </BouncyPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 28, fontWeight: '800', color: colors.textSub },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingRight: 18,
    paddingLeft: 8,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.92)',
    maxWidth: 300,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 3,
    backgroundColor: '#FFF6DF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFace: { fontSize: 30 },
  profileText: { gap: 3, flexShrink: 1 },
  profileName: { fontSize: 21, fontWeight: '900', color: colors.text },
  levelChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  levelChipText: { fontSize: 12, fontWeight: '900', color: '#FFFFFF' },
  counters: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  body: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  main: { flex: 1, gap: spacing.md },

  heroWrap: { flex: 1.5 },
  hero: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingLeft: spacing.xl,
    paddingRight: spacing.lg,
    borderRadius: radius.xl,
    borderBottomWidth: 8,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  heroStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 14 },
  heroLeft: { alignItems: 'center', justifyContent: 'center' },
  heroCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: { fontSize: 74 },
  heroRight: { flex: 1, gap: 4 },
  heroLabel: { fontSize: 15, fontWeight: '900', color: colors.textSub, letterSpacing: 1 },
  heroTitle: { fontSize: 34, fontWeight: '900', color: colors.text },
  heroSubtitle: { fontSize: 17, fontWeight: '700', color: colors.textSub },
  segments: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  segment: {
    width: 40,
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  segmentNow: { backgroundColor: '#FFFFFF', borderWidth: 3 },
  segmentText: { marginLeft: 8, fontSize: 15, fontWeight: '800', color: colors.textSub },
  cta: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    paddingHorizontal: 26,
    paddingVertical: 13,
    borderRadius: radius.pill,
  },
  ctaText: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },

  tileRow: { flex: 1, flexDirection: 'row', gap: spacing.md },
  tileWrap: { flex: 1 },
  tile: {
    flex: 1,
    borderRadius: radius.lg,
    borderBottomWidth: 7,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
  },
  tileBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tileBadgeText: { fontSize: 30, color: '#FFFFFF' },
  tileTitle: { fontSize: 23, fontWeight: '900', color: colors.text },
  tileCaption: { fontSize: 14, fontWeight: '700', color: colors.textSub },
  lockedText: { color: colors.lockedText },

  sidebar: { width: 210, gap: spacing.md },
  sideWrap: { flex: 1 },
  sideCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderBottomWidth: 6,
    backgroundColor: colors.card,
  },
  sideBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideEmoji: { fontSize: 26 },
  sideTitle: { fontSize: 18, fontWeight: '900', color: colors.text },
  sideCaption: { fontSize: 13, fontWeight: '700', color: colors.textSub, marginTop: 2 },

  notice: {
    position: 'absolute',
    bottom: 22,
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
