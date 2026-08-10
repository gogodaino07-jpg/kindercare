import React from 'react';
import Svg, { Rect, Path, Circle } from 'react-native-svg';

interface PremiumCalendarIconProps {
  size?: number;
}

export default function PremiumCalendarIcon({ size = 22 }: PremiumCalendarIconProps) {
  // The original SVG was 64x64. Scale factor = size / 64
  const scale = size / 64;

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      {/* Background/Frame */}
      <Rect
        x="10"
        y="14"
        width="44"
        height="40"
        rx="8"
        fill="#FFFFFF" // Adding white fill for visibility
        stroke="#4A4A4A"
        strokeWidth="3.2"
      />
      {/* Top Header Bar */}
      <Path
        d="M10 24 H54"
        stroke="#4A4A4A"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      {/* Rings/Hooks */}
      <Path
        d="M20 10 V18"
        stroke="#4A4A4A"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <Path
        d="M44 10 V18"
        stroke="#4A4A4A"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      {/* Dots (Events) */}
      <Circle cx="22" cy="34" r="2.6" fill="#4A8FE7"/>
      <Circle cx="32" cy="34" r="2.6" fill="#4A4A4A" opacity={0.35}/>
      <Circle cx="42" cy="34" r="2.6" fill="#4A4A4A" opacity={0.35}/>

      <Circle cx="22" cy="44" r="2.6" fill="#4A4A4A" opacity={0.35}/>
      <Circle cx="32" cy="44" r="2.6" fill="#4A8FE7"/>
      <Circle cx="42" cy="44" r="2.6" fill="#4A4A4A" opacity={0.35}/>
    </Svg>
  );
}
