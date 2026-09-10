import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native';
// 핀치줌 제스처(RNGH)와 페이지 스와이프가 같은 화면에서 부드럽게 같이 동작하도록,
// 일반 react-native의 ScrollView 대신 RNGH가 제공하는 ScrollView를 쓴다 — 서로 다른
// 두 제스처 시스템(RN 기본 responder vs RNGH)이 섞이면 핀치 인식이 버벅이거나 늦게 먹는다.
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZoomableImage } from '../../features/newsletter-analysis/components/ZoomableImage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PhotoViewerModalProps {
  /** null이면 닫힘, 배열이면 그 사진들을 스와이프로 넘겨보는 전체화면 뷰어를 연다. */
  photos: string[] | null;
  onClose: () => void;
}

/** 일정에 첨부된 스캔 원본 사진을 꽉 찬 전체화면으로 보여주는 뷰어 — 캘린더 일자
 *  상세와 홈 화면 준비물 목록 양쪽에서 공유해서 쓴다. 작은 팝업 카드로 보면
 *  사진이 너무 작아 보인다는 피드백으로, 화면 전체를 쓰고 우측 상단에 닫기
 *  버튼만 띄우는 방식으로 바꿨다. */
export default function PhotoViewerModal({ photos, onClose }: PhotoViewerModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={!!photos} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {/* RN Modal은 안드로이드에서 별도 네이티브 윈도우에 렌더링돼 앱 루트의
          GestureHandlerRootView 밖에 놓이면서 핀치줌/팬 제스처가 먹지 않는다 —
          Modal 내부에 별도로 하나 더 씌워줘야 제스처가 정상 동작한다. */}
      <GestureHandlerRootView style={styles.overlay}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {(photos ?? []).map((uri) => (
            <View key={uri} style={styles.page}>
              <ZoomableImage uri={uri} width={SCREEN_WIDTH} height={SCREEN_HEIGHT} />
            </View>
          ))}
        </ScrollView>

        <Pressable
          onPress={onClose}
          hitSlop={10}
          style={[styles.closeButton, { top: insets.top + 12 }]}
          accessibilityLabel="닫기"
        >
          <MaterialIcons name="close" size={22} color="#FFFFFF" />
        </Pressable>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000000',
  },
  page: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
