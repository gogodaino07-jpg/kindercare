import React, { useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/theme';

interface ScreenBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

const DOT_SPACING = 22;
const DOT_RADIUS = 1.3;

/** Pale gray background with a subtle dot grid, used app-wide for a unified tone. */
export default function ScreenBackground({ children, style }: ScreenBackgroundProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.container, style]}>
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
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
