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
  message?: string;
  /** Rendered above the title, e.g. '⚠️' for destructive/irreversible actions. */
  icon?: string;
  /** A second, bold red paragraph below `message` for irreversible-action warnings. */
  warningMessage?: string;
  buttons?: AlertButton[];
  /** Optional callback when the alert is dismissed via hardware back button or other non-button interactions. */
  onDismiss?: () => void;
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
              {config.icon ? <Text style={styles.icon}>{config.icon}</Text> : null}
              <Text style={styles.title}>{config.title}</Text>
              {config.message ? (
                <Text style={[styles.message, !config.warningMessage && styles.messageLast]}>
                  {config.message}
                </Text>
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
                      button.style === 'cancel' ? styles.buttonOutline : styles.buttonPrimary,
                      button.style === 'destructive' && styles.buttonDestructive,
                      !stacked && styles.buttonFlex,
                    ]}
                    onPress={() => handlePress(button)}
                  >
                    <Text
                      style={
                        button.style === 'cancel' ? styles.buttonTextOutline : styles.buttonTextPrimary
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
      backgroundColor: 'rgba(20, 24, 22, 0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    card: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: colors.cardWhite,
      borderRadius: 28,
      paddingHorizontal: 24,
      paddingVertical: 18,
      ...SHADOW,
    },
    icon: {
      fontSize: 28,
      textAlign: 'center',
      marginBottom: 8,
    },
    title: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 8,
    },
    message: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    messageLast: {
      marginBottom: 14,
    },
    warningMessage: {
      fontSize: 13,
      color: '#DC2626',
      fontWeight: '800',
      textAlign: 'center',
      lineHeight: 19,
      marginBottom: 18,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
    },
    buttonColumn: {
      gap: 10,
      marginTop: 4,
    },
    button: {
      borderRadius: 14,
      paddingVertical: 13,
      alignItems: 'center',
    },
    buttonFlex: {
      flex: 1,
    },
    buttonPrimary: {
      backgroundColor: colors.accent,
    },
    buttonDestructive: {
      backgroundColor: colors.tomorrowRed,
    },
    buttonOutline: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.accent,
    },
    buttonTextPrimary: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
    buttonTextOutline: {
      color: colors.accent,
      fontSize: 15,
      fontWeight: '700',
    },
  });
}
