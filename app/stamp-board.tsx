import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import CoupangBanner from '../components/common/CoupangBanner';
import { useSubscription } from '../context/SubscriptionContext';

export default function StampBoardScreen() {
  const router = useRouter();
  const { isSubscribed } = useSubscription();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconButton} hitSlop={6}>
            <MaterialCommunityIcons name="chevron-left" size={26} color="#1E293B" />
          </Pressable>
        </View>

        <View style={styles.content} />

        {!isSubscribed && <CoupangBanner style={{ paddingBottom: insets.bottom }} />}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1 },
});
