import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export type LockMethod = 'none' | 'password' | 'pattern';

interface StoredLockConfig {
  method: LockMethod;
  secret: string | null;
  biometricEnabled: boolean;
  showPatternEnabled: boolean;
}

const STORAGE_KEY = 'kindercare_app_lock';

const DEFAULT_CONFIG: StoredLockConfig = {
  method: 'none',
  secret: null,
  biometricEnabled: false,
  showPatternEnabled: true,
};

interface AppLockContextValue {
  loaded: boolean;
  method: LockMethod;
  hasSecret: boolean;
  biometricEnabled: boolean;
  showPatternEnabled: boolean;
  biometricAvailable: boolean;
  isLocked: boolean;
  setLockMethod: (method: LockMethod, secret?: string | null) => Promise<void>;
  changeSecret: (secret: string) => Promise<void>;
  verifySecret: (input: string) => boolean;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  setShowPatternEnabled: (enabled: boolean) => Promise<void>;
  unlock: () => void;
  authenticateWithBiometric: () => Promise<boolean>;
  setPickerActive: (active: boolean) => void;
}

const AppLockContext = createContext<AppLockContextValue | undefined>(undefined);

async function loadConfig(): Promise<StoredLockConfig> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return DEFAULT_CONFIG;
  }
}

async function persistConfig(config: StoredLockConfig) {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    // SecureStore has no backing on some platforms (e.g. web) — the in-memory
    // state above already reflects the change, so just avoid an unhandled rejection.
    console.warn('Failed to persist app lock settings', err);
  }
}

export function AppLockProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [config, setConfig] = useState<StoredLockConfig>(DEFAULT_CONFIG);
  const [isLocked, setIsLocked] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const backgroundedRef = useRef(false);
  const authInProgressRef = useRef(false);
  const pickerActiveRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const setPickerActive = (active: boolean) => {
    pickerActiveRef.current = active;
  };

  useEffect(() => {
    loadConfig().then((loadedConfig) => {
      setConfig(loadedConfig);
      setIsLocked(loadedConfig.method !== 'none');
      setLoaded(true);
    });
    LocalAuthentication.hasHardwareAsync()
      .then(async (hasHardware) => {
        if (!hasHardware) return false;
        return LocalAuthentication.isEnrolledAsync();
      })
      .then((enrolled) => setBiometricAvailable(!!enrolled))
      .catch(() => setBiometricAvailable(false));
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      if (nextState === 'background') {
        backgroundedRef.current = true;
      } else if (nextState === 'active' && prevState !== 'active') {
        if (backgroundedRef.current) {
          backgroundedRef.current = false;
          // A gallery/camera/document picker takes the app to 'background' too
          // (the OS picker UI takes over), so skip the re-lock in that case —
          // only a genuine app-switch/home-button exit should trigger it.
          if (config.method !== 'none' && !authInProgressRef.current && !pickerActiveRef.current) {
            setIsLocked(true);
          }
        }
      }
    });
    return () => subscription.remove();
  }, [config.method]);

  const setLockMethod = async (method: LockMethod, secret?: string | null) => {
    const next: StoredLockConfig = {
      ...config,
      method,
      secret: method === 'none' ? null : secret ?? config.secret,
      biometricEnabled: method === 'none' ? false : config.biometricEnabled,
    };
    setConfig(next);
    await persistConfig(next);
  };

  const changeSecret = async (secret: string) => {
    const next: StoredLockConfig = { ...config, secret };
    setConfig(next);
    await persistConfig(next);
  };

  const verifySecret = (input: string) => !!config.secret && input === config.secret;

  const setBiometricEnabled = async (enabled: boolean) => {
    const next: StoredLockConfig = { ...config, biometricEnabled: enabled };
    setConfig(next);
    await persistConfig(next);
  };

  const setShowPatternEnabled = async (enabled: boolean) => {
    const next: StoredLockConfig = { ...config, showPatternEnabled: enabled };
    setConfig(next);
    await persistConfig(next);
  };

  const unlock = () => setIsLocked(false);

  const authenticateWithBiometric = async (): Promise<boolean> => {
    authInProgressRef.current = true;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: '지문으로 잠금 해제',
        cancelLabel: '취소',
        disableDeviceFallback: true,
      });
      if (result.success) {
        unlock();
      }
      return result.success;
    } catch {
      return false;
    } finally {
      setTimeout(() => {
        authInProgressRef.current = false;
      }, 500);
    }
  };

  const value = useMemo<AppLockContextValue>(
    () => ({
      loaded,
      method: config.method,
      hasSecret: !!config.secret,
      biometricEnabled: config.biometricEnabled,
      showPatternEnabled: config.showPatternEnabled,
      biometricAvailable,
      isLocked,
      setLockMethod,
      changeSecret,
      verifySecret,
      setBiometricEnabled,
      setShowPatternEnabled,
      unlock,
      authenticateWithBiometric,
      setPickerActive,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loaded, config, isLocked, biometricAvailable]
  );

  return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>;
}

export function useAppLock(): AppLockContextValue {
  const ctx = useContext(AppLockContext);
  if (!ctx) throw new Error('useAppLock must be used within an AppLockProvider');
  return ctx;
}

/** Serializes a pattern-grid path (dot indices 0-8) into the string format used for storage/comparison. */
export function serializePattern(path: number[]): string {
  return path.join('-');
}
