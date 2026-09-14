import React from 'react';
import { StyleSheet, Text, TextProps, TextStyle } from 'react-native';
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
  const fontOption = FONT_OPTIONS.find((f) => f.id === fontChoiceId);
  const globalFontFamily = fontOption?.fontFamily;

  const overrides: { fontSize?: number; fontFamily?: string; fontWeight?: TextStyle['fontWeight'] } = {};
  if (flat && typeof flat.fontSize === 'number' && (fontScale !== 1 || (globalFontFamily && !flat?.fontFamily && fontOption?.sizeBoost))) {
    const boost = globalFontFamily && !flat?.fontFamily ? (fontOption?.sizeBoost ?? 1) : 1;
    overrides.fontSize = flat.fontSize * fontScale * boost;
  }
  if (globalFontFamily && !flat?.fontFamily) {
    overrides.fontFamily = globalFontFamily;
    // 구글 폰트로 불러온 손글씨체들은 대부분 Regular 굵기 하나만 제공한다.
    // fontWeight를 bold 계열로 같이 주면 안드로이드가 해당 굵기의 타입페이스를
    // 못 찾아 커스텀 폰트 자체를 무시하고 시스템 기본 폰트로 되돌아가버려서,
    // 제목처럼 굵게 스타일링된 텍스트에만 폰트 설정이 안 먹는 것처럼 보였다.
    if (flat?.fontWeight && flat.fontWeight !== 'normal') {
      overrides.fontWeight = 'normal';
    }
  }

  if (Object.keys(overrides).length === 0) {
    return <Text style={style} {...rest} />;
  }

  return <Text style={[style, overrides]} {...rest} />;
}
