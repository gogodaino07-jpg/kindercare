import React from 'react';
import { Image, StyleProp, TextStyle } from 'react-native';
import Text from './AppText';

const DEFAULT_ICON = '📌';
const DEFAULT_ICON_IMAGE = require('../../assets/icons.png');

/** Renders an event's icon — the curated default (pushpin) shows the app's illustrated default icon image; anything else renders as emoji text. */
export default function EventIcon({
  icon,
  size,
  textStyle,
}: {
  icon?: string;
  size: number;
  textStyle?: StyleProp<TextStyle>;
}) {
  const value = icon || DEFAULT_ICON;

  if (value === DEFAULT_ICON) {
    return <Image source={DEFAULT_ICON_IMAGE} style={{ width: size, height: size }} resizeMode="contain" />;
  }

  return <Text style={[{ fontSize: size }, textStyle]}>{value}</Text>;
}
