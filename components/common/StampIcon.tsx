import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

interface StampIconProps {
  size?: number;
  color: string;
}

/** 도장판 화면 진입용 스탬프(도장) 아이콘. */
export default function StampIcon({ size = 24, color }: StampIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="9.5" r="5.5" stroke={color} strokeWidth={1.8} fill="none" />
      <Path d="M8.5 9.7l2.2 2.2 4.2-4.4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M9 16l-2 4.5h10L15 16" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}
