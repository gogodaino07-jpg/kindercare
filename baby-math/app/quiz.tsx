// 문제 풀이 화면
// - 상단: 진행 상황(점 + 진행 바)
// - 가운데: 그림/도형으로 시각화된 문제
// - 아래: 카드형 정답 보기 (오답이면 흔들림 + 힌트, 정답이면 초록 반짝 + 별 보상)
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import AnswerCard, { AnswerState } from '../src/components/AnswerCard';
import CharacterReaction from '../src/components/CharacterReaction';
import ProgressTrack from '../src/components/ProgressTrack';
import QuestionVisual from '../src/components/QuestionVisual';
import ScreenHeader from '../src/components/ScreenHeader';
import StageClearOverlay from '../src/components/StageClearOverlay';
import { PRACTICES, QUESTIONS_PER_STAGE, QuestionKind, getLevel } from '../src/constants/levels';
import { colors, radius, shadow, spacing } from '../src/constants/theme';
import { useGame } from '../src/context/GameContext';
import { Point, useRewardFx } from '../src/context/RewardFxContext';
import { Question, makeQuestionSet } from '../src/lib/questions';
import { playSound } from '../src/lib/sound';

const CORRECT_MESSAGES = ['잘했어요!', '정답이에요!', '멋져요!', '최고예요!'];

export default function QuizScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ level?: string; practice?: string }>();
  const { addStars, completeStage, nextStageOf } = useGame();
  const { flyStars } = useRewardFx();

  const level = params.level ? getLevel(Number(params.level)) : undefined;
  const practice = params.practice ? PRACTICES.find((p) => p.key === params.practice) : undefined;
  const kinds: QuestionKind[] = level ? level.kinds : [practice?.kind ?? 'count'];

  // 이번 판에서 도전 중인 스테이지 (화면에 들어온 시점에 고정)
  const [stage, setStage] = useState(() => (level ? nextStageOf(level.id) : 1));
  const [questions, setQuestions] = useState<Question[]>(() =>
    makeQuestionSet(kinds, QUESTIONS_PER_STAGE),
  );
  const [index, setIndex] = useState(0);
  const [solved, setSolved] = useState(0);
  const [earnedStars, setEarnedStars] = useState(0);
  const [pickedCorrect, setPickedCorrect] = useState<number | null>(null);
  const [wrongPicks, setWrongPicks] = useState<number[]>([]);
  const [reaction, setReaction] = useState<{ tone: 'correct' | 'wrong'; message: string } | null>(
    null,
  );
  const [clear, setClear] = useState<{ sticker?: { emoji: string; name: string } } | null>(null);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    },
    [],
  );

  const question = questions[index];

  const finishStage = useCallback(() => {
    playSound('clear');
    if (level) {
      const { unlockedSticker } = completeStage(level.id, stage);
      setClear({ sticker: unlockedSticker ? level.sticker : undefined });
    } else {
      setClear({});
    }
  }, [completeStage, level, stage]);

  const goNext = useCallback(() => {
    setReaction(null);
    setPickedCorrect(null);
    setWrongPicks([]);
    if (index + 1 < questions.length) {
      setIndex(index + 1);
    } else {
      finishStage();
    }
  }, [finishStage, index, questions.length]);

  const handlePick = (choiceIndex: number, center: Point) => {
    if (pickedCorrect !== null || clear) return;

    if (choiceIndex === question.answerIndex) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      playSound('correct');
      setPickedCorrect(choiceIndex);
      setSolved((prev) => prev + 1);
      setReaction({
        tone: 'correct',
        message: CORRECT_MESSAGES[Math.floor(Math.random() * CORRECT_MESSAGES.length)],
      });
      // 별이 카드에서 상단 카운터로 날아가고, 도착하면 카운터가 올라간다
      flyStars(center, 1, () => {
        addStars(1);
        setEarnedStars((prev) => prev + 1);
      });
      later(goNext, 1200);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    playSound('wrong');
    setWrongPicks((prev) => (prev.includes(choiceIndex) ? prev : [...prev, choiceIndex]));
    setReaction({ tone: 'wrong', message: question.hint });
  };

  const answerState = (choiceIndex: number): AnswerState => {
    if (pickedCorrect === choiceIndex) return 'correct';
    if (pickedCorrect !== null) return 'dimmed';
    if (wrongPicks.includes(choiceIndex)) return 'wrong';
    return 'idle';
  };

  const restart = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setStage(level ? nextStageOf(level.id) : 1);
    setQuestions(makeQuestionSet(kinds, QUESTIONS_PER_STAGE));
    setIndex(0);
    setSolved(0);
    setEarnedStars(0);
    setPickedCorrect(null);
    setWrongPicks([]);
    setReaction(null);
    setClear(null);
  };

  const headerTitle = level ? `${level.id}단계 · ${level.title}` : (practice?.title ?? '놀이');
  const headerSubtitle = level ? `스테이지 ${stage} / ${level.stages}` : '자유 놀이';
  const isLastStage = level ? stage >= level.stages : false;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader onBack={() => router.back()} title={headerTitle} subtitle={headerSubtitle} />

      <View style={styles.progressArea}>
        <ProgressTrack total={questions.length} solved={solved} current={index} />
      </View>

      <View style={styles.body}>
        <View style={styles.questionArea}>
          <View style={[styles.promptBubble, shadow.card]}>
            <Text style={styles.prompt}>{question.prompt}</Text>
          </View>

          <View style={styles.visualArea}>
            <QuestionVisual key={question.id} visual={question.visual} />
          </View>

          <View style={styles.reactionArea}>
            {!!reaction && <CharacterReaction tone={reaction.tone} message={reaction.message} />}
          </View>
        </View>

        <Animated.View
          key={question.id}
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(140)}
          style={styles.choiceRow}
        >
          {question.choices.map((choice, i) => (
            <AnswerCard
              key={`${question.id}-${i}`}
              choice={choice}
              state={answerState(i)}
              disabled={pickedCorrect !== null}
              onPress={(center) => handlePick(i, center)}
            />
          ))}
        </Animated.View>
      </View>

      {!!clear && (
        <StageClearOverlay
          title={
            level
              ? isLastStage
                ? `${level.id}단계 «${level.title}» 클리어!`
                : `스테이지 ${stage} 클리어!`
              : `${practice?.title ?? '놀이'} 한 판 끝!`
          }
          earnedStars={earnedStars}
          progress={level ? Math.min(stage / level.stages, 1) : 1}
          sticker={clear.sticker}
          primaryLabel={level ? (isLastStage ? '레벨맵 보기' : '다음 스테이지') : '한 판 더'}
          onPrimary={() => {
            if (level && isLastStage) {
              router.replace('/level-map');
              return;
            }
            restart();
          }}
          onHome={() => router.replace('/')}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  progressArea: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xs },
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm },
  questionArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  promptBubble: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 3,
    borderColor: colors.border,
  },
  prompt: { fontSize: 26, fontWeight: '900', color: colors.text },
  visualArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  reactionArea: { height: 66, justifyContent: 'center' },
  choiceRow: { flexDirection: 'row', gap: spacing.md, minHeight: 130 },
});
