import React, { useMemo } from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/theme';

interface ScreenBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
  showDots?: boolean;
}

const DOT_SPACING = 22;
const DOT_RADIUS = 1.3;

/** Pale gray background, optionally with a subtle dot grid, used app-wide for a unified tone. */
export default function ScreenBackground({ children, style, showDots = true }: ScreenBackgroundProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.container, style]}>
      {showDots && (
        // 완전히 정적인 배경이라 매 스크롤 프레임마다 다시 그릴 필요가 없는데,
        // 위에 얹힌 스크롤 콘텐츠와 같은 레이어를 공유하면 안드로이드가 이
        // SVG까지 매번 재래스터화해서 길게 스크롤할 때 화면 전체가 버벅이는
        // 원인이 됐다. GPU 텍스처로 한 번만 캐싱해서 재사용하도록 고정.
        <View
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          renderToHardwareTextureAndroid={Platform.OS === 'android'}
        >
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
            <Defs>
              <Pattern
                id="dotGrid"
                width={DOT_SPACING}
                height={DOT_SPACING}
                patternUnits="userSpaceOnUse"
              >
                <Circle cx={DOT_SPACING / 2} cy={DOT_SPACING / 2} r={DOT_RADIUS} fill={colors.dotColor} />
              </Pattern>
            </Defs>
            <Rect x={0} y={0} width="100%" height="100%" fill="url(#dotGrid)" />
          </Svg>
        </View>
      )}
      {children}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.gray50,
    },
  });
}
