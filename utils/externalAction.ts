/**
 * Module-level (not React state) flag read by every AppState listener that
 * would otherwise re-trigger the lock screen, boot splash, or ad popup —
 * gallery/camera/file pickers, the contacts picker, GPS location lookups,
 * and external links (Coupang) all briefly take the app to 'background' on
 * some platforms while their native UI is on screen. Plain module state
 * (rather than context) is intentional: AppState listeners are plain
 * callbacks outside React's render cycle, so they just need to read the
 * current value synchronously — no re-render should ever depend on this.
 */
let active = false;

export function setExternalActionActive(value: boolean): void {
  active = value;
}

export function isExternalActionActive(): boolean {
  return active;
}

/** Wraps an async external action, setting the flag for its duration. */
export async function withExternalAction<T>(action: () => Promise<T>): Promise<T> {
  setExternalActionActive(true);
  try {
    return await action();
  } finally {
    // Add a 1s grace period before clearing the flag — this ensures that
    // if the app switches back to 'active' right as the action finishes
    // (common when a Google Sign-In popup closes), the AppState listener
    // still sees the flag as true and suppresses the boot splash/lock.
    setTimeout(() => {
      setExternalActionActive(false);
    }, 1000);
  }
}

/**
 * For fire-and-forget external navigations (e.g. Linking.openURL to a store
 * app) where there's no promise that resolves when the user comes back —
 * holds the flag for a fixed window covering the app-switch transition.
 */
export function markExternalActionBriefly(durationMs = 4000): void {
  setExternalActionActive(true);
  setTimeout(() => setExternalActionActive(false), durationMs);
}
