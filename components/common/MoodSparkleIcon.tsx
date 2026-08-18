import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface MoodSparkleIconProps {
  size?: number;
  color: string;
}

/** 기분 문구 옆에 붙는 작은 반짝임 아이콘 — 기분 라벨 자체에 이미 표정 이모지가 있어 얼굴 아이콘과 중복되지 않도록 별 모양을 사용. */
export default function MoodSparkleIcon({ size = 12, color }: MoodSparkleIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z"
        fill={color}
      />
    </Svg>
  );
}
