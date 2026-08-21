import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';
import { FONT_OPTIONS } from '../../constants/fontOptions';
import { useAppData } from '../../context/AppDataContext';

/**
 * Drop-in replacement for RN's `Text` that:
 * - multiplies any explicit `fontSize` in its style by the app-wide
 *   font-size setting (설정 > 글자 크기). Texts with no explicit fontSize
 *   are left alone so icon glyphs relying on the platform default aren't
 *   accidentally resized.
 * - applies the app-wide 글씨체 설정 font family, unless the style already
 *   specifies its own `fontFamily` (e.g. per-option previews on the font
 *   settings screen itself).
 *
 * Import this AS `Text` (`import Text from '.../AppText'`) so call sites
 * don't need to change — only the import line does.
 */
export default function AppText({ style, ...rest }: TextProps) {
  const { fontScale, fontChoiceId } = useAppData();
  const flat = StyleSheet.flatten(style);
  const globalFontFamily = FONT_OPTIONS.find((f) => f.id === fontChoiceId)?.fontFamily;

  const overrides: { fontSize?: number; fontFamily?: string } = {};
  if (flat && typeof flat.fontSize === 'number' && fontScale !== 1) {
    overrides.fontSize = flat.fontSize * fontScale;
  }
  if (globalFontFamily && !flat?.fontFamily) {
    overrides.fontFamily = globalFontFamily;
  }

  if (Object.keys(overrides).length === 0) {
    return <Text style={style} {...rest} />;
  }

  return <Text style={[style, overrides]} {...rest} />;
}
