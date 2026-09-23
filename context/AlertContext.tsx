import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Text from '../components/common/AppText';
import { SHADOW, ThemeColors } from '../constants/theme';
import { useThemeColors } from './ThemeContext';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface AlertConfig {
  title: string;
  message?: string | React.ReactNode;
  /** Rendered above the title, e.g. '⚠️' for destructive/irreversible actions. */
  icon?: string;
  /** A second, bold red paragraph below `message` for irreversible-action warnings. */
  warningMessage?: string;
  buttons?: AlertButton[];
  /** Optional callback when the alert is dismissed via hardware back button or other non-button interactions. */
  onDismiss?: () => void;
  /** true면 우측 상단에 ✕ 버튼을 보여 주고, 그걸 누르면 아무것도 고르지 않고 닫힌다(onDismiss 호출).
   *  바깥 영역을 눌러서는 닫히지 않는다 — 실수로 닫히는 걸 막기 위해서다. 기본은 꺼져 있어서 기존
   *  알림창 모양은 그대로다. */
  dismissible?: boolean;
}

interface AlertContextValue {
  showAlert: (config: AlertConfig) => void;
}

const AlertContext = createContext<AlertContextValue | undefined>(undefined);

/**
 * Rounded, theme-colored replacement for `Alert.alert` — same {title, message,
 * buttons} shape so call sites read almost identically to the RN original.
 */
export function AlertProvider({ children }: { children: React.ReactNode }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [config, setConfig] = useState<AlertConfig | null>(null);

  const showAlert = useCallback((cfg: AlertConfig) => setConfig(cfg), []);

  const buttons: AlertButton[] = config?.buttons?.length ? config.buttons : [{ text: '확인' }];
  const stacked = buttons.length > 2;
  const isDanger = buttons.some((b) => b.style === 'destructive') || !!config?.warningMessage;

  const handlePress = (button: AlertButton) => {
    setConfig(null);
    button.onPress?.();
  };

  const handleDismiss = () => {
    const onDismiss = config?.onDismiss;
    setConfig(null);
    onDismiss?.();
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <Modal visible={!!config} transparent animationType="fade" onRequestClose={handleDismiss}>
        <View style={styles.overlay}>
          {config ? (
            <View style={styles.card}>
              {config.dismissible ? (
                <Pressable style={styles.closeButton} onPress={handleDismiss} hitSlop={10} accessibilityLabel="닫기">
                  <Text style={styles.closeText}>✕</Text>
                </Pressable>
              ) : null}
              {config.icon ? (
                <View style={[styles.iconBadge, isDanger ? styles.iconBadgeDanger : styles.iconBadgeNeutral]}>
                  <Text style={styles.icon}>{config.icon}</Text>
                </View>
              ) : null}
              <Text style={styles.title}>{config.title}</Text>
              {config.message ? (
                typeof config.message === 'string' ? (
                  <Text style={[styles.message, !config.warningMessage && styles.messageLast]}>
                    {config.message}
                  </Text>
                ) : (
                  <View style={[styles.message, !config.warningMessage && styles.messageLast]}>
                    {config.message}
                  </View>
                )
              ) : null}
              {config.warningMessage ? (
                <Text style={styles.warningMessage}>{config.warningMessage}</Text>
              ) : null}
              <View style={stacked ? styles.buttonColumn : styles.buttonRow}>
                {buttons.map((button, i) => (
                  <Pressable
                    key={i}
                    style={[
                      styles.button,
                      button.style === 'cancel' ? styles.buttonNeutral : styles.buttonPrimary,
                      button.style === 'destructive' && styles.buttonDestructive,
                      !stacked && styles.buttonFlex,
                    ]}
                    onPress={() => handlePress(button)}
                  >
                    <Text
                      style={
                        button.style === 'cancel' ? styles.buttonTextNeutral : styles.buttonTextPrimary
                      }
                    >
                      {button.text}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </AlertContext.Provider>
  );
}

export function useAlert(): AlertContextValue {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAlert must be used within an AlertProvider');
  return ctx;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 18, 17, 0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    card: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: colors.cardWhite,
      borderRadius: 30,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 26,
      paddingTop: 26,
      paddingBottom: 22,
      ...SHADOW,
      shadowOpacity: 0.18,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 10,
    },
    closeButton: {
      position: 'absolute',
      top: 14,
      right: 18,
      zIndex: 1,
    },
    closeText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    iconBadge: {
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
      alignSelf: 'center',
    },
    iconBadgeNeutral: {
      backgroundColor: colors.gray100,
    },
    iconBadgeDanger: {
      backgroundColor: 'rgba(220, 38, 38, 0.12)',
    },
    icon: {
      fontSize: 26,
      textAlign: 'center',
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 8,
      letterSpacing: -0.2,
    },
    message: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 21,
      marginBottom: 8,
    },
    messageLast: {
      marginBottom: 18,
    },
    warningMessage: {
      fontSize: 13,
      color: '#DC2626',
      fontWeight: '800',
      textAlign: 'center',
      lineHeight: 19,
      marginBottom: 20,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
      width: '100%',
    },
    buttonColumn: {
      gap: 10,
      marginTop: 4,
      width: '100%',
    },
    button: {
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
    },
    buttonFlex: {
      flex: 1,
    },
    buttonPrimary: {
      backgroundColor: colors.accent,
      ...SHADOW,
      shadowOpacity: 0.22,
      shadowColor: colors.accent,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    buttonDestructive: {
      backgroundColor: colors.tomorrowRed,
      shadowColor: colors.tomorrowRed,
    },
    buttonNeutral: {
      backgroundColor: colors.gray100,
    },
    buttonTextPrimary: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
    buttonTextNeutral: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: '700',
    },
  });
}
