import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';
import { useAppData } from '../../context/AppDataContext';

/**
 * Drop-in replacement for RN's `Text` that multiplies any explicit
 * `fontSize` in its style by the app-wide font-size setting (설정 > 글자
 * 크기). Texts with no explicit fontSize are left alone so icon glyphs
 * relying on the platform default aren't accidentally resized.
 *
 * Import this AS `Text` (`import Text from '.../AppText'`) so call sites
 * don't need to change — only the import line does.
 */
export default function AppText({ style, ...rest }: TextProps) {
  const { fontScale } = useAppData();
  const flat = StyleSheet.flatten(style);

  if (!flat || typeof flat.fontSize !== 'number' || fontScale === 1) {
    return <Text style={style} {...rest} />;
  }

  return <Text style={[style, { fontSize: flat.fontSize * fontScale }]} {...rest} />;
}
