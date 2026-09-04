# 아기 수학 (baby-math)

킨더케어와는 **별도의 앱**입니다. 태블릿 가로모드 전용 유아 수학 학습 앱의 홈 화면과 기본 구조입니다.

## 실행

```bash
cd baby-math
npm install
npm run android   # 또는 npm run ios
```

가로모드 고정(`expo-screen-orientation`)과 효과음(`expo-audio`)을 사용하므로 Expo Go가 아니라
개발 빌드(`expo run:android`)로 실행하는 것을 권장합니다.

## 화면 구성

| 경로 | 화면 | 내용 |
| --- | --- | --- |
| `app/index.tsx` | 홈 | 하늘 배경 위에 프로필 + 별/코인 카운터, 오늘의 모험 히어로 카드, 덧셈·뺄셈 놀이 타일, 우측 사이드바 |
| `app/level-map.tsx` | 레벨맵 | 5단계 코스, 잠금/해제 상태와 스테이지 진행도 |
| `app/quiz.tsx` | 문제 풀이 | 진행 바 + 그림 문제 + 카드형 보기, 정답/오답 연출 |
| `app/stickers.tsx` | 스티커판 | 레벨 클리어로 모은 스티커 컬렉션 |

## 학습 단계

1. 숫자 세기 · 숫자-사물 매칭 (1~10)
2. 숫자 비교 (많다/적다, 크다/작다)
3. 덧셈 기초 (그림으로 더하기)
4. 뺄셈 기초 (그림으로 빼기)
5. 덧셈뺄셈 혼합 퀴즈

각 레벨은 여러 스테이지(스테이지당 5문제)로 나뉘고, 이전 레벨을 모두 클리어해야 다음 레벨이 열립니다.
레벨을 모두 깨면 스티커를 하나 받습니다. (`src/constants/levels.ts` 에서 조정)

## 폴더 구조

```
app/                 expo-router 화면
src/components/      버튼·카드·진행바·하늘 배경 등 공용 UI
src/constants/       디자인 토큰(theme), 레벨 정의(levels)
src/context/         GameContext(진행/보상 저장), RewardFxContext(별 fly-to 연출)
src/lib/             questions(문제 생성기), sound(효과음)
assets/sounds/       정답/오답/클리어 효과음
```

## 인터랙션

- 모든 버튼: 탭 시 스프링 바운스 (`BouncyPressable`)
- 정답: 카드 초록 반짝 + 캐릭터 리액션 + 효과음 + 별이 상단 카운터로 날아가는 fly-to
- 오답: 부드러운 shake + 정답 유도 힌트 (다시 고를 수 있음)
- 스테이지 클리어: 진행 바가 애니메이션으로 채워지고 스티커 획득 연출
- 화면 전환: 300ms 슬라이드/페이드

## 저장

진행 상황(별, 코인, 스티커, 레벨별 클리어 스테이지, 이름)은 AsyncStorage(`baby-math/progress-v1`)에
로컬 저장됩니다. 서버 연동은 아직 없습니다.
