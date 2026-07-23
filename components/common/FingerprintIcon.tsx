import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface FingerprintIconProps {
  size?: number;
  color: string;
}

/** Crisp vector fingerprint/biometric glyph — sharper and more consistent across
 * devices than relying on emoji font rendering for the biometric keypad key. */
export default function FingerprintIcon({ size = 28, color }: FingerprintIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2a9 9 0 0 0-9 9v3a1 1 0 0 0 2 0v-3a7 7 0 0 1 14 0v3a5 5 0 0 1-5 5 1 1 0 0 0 0 2 7 7 0 0 0 7-7v-3a9 9 0 0 0-9-9z"
        fill={color}
      />
      <Path
        d="M12 6a5 5 0 0 0-5 5v4a1 1 0 0 0 2 0v-4a3 3 0 0 1 6 0v6a3 3 0 0 1-3 3 1 1 0 0 0 0 2 5 5 0 0 0 5-5v-6a5 5 0 0 0-5-5z"
        fill={color}
      />
      <Path d="M12 10a1 1 0 0 0-1 1v6a1 1 0 0 0 2 0v-6a1 1 0 0 0-1-1z" fill={color} />
    </Svg>
  );
}
