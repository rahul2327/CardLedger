import {Capacitor} from '@capacitor/core';
import {Keyboard} from '@capacitor/keyboard';
import {SplashScreen} from '@capacitor/splash-screen';
import {StatusBar, Style} from '@capacitor/status-bar';

const LIGHT_BAR_COLOR = '#F7FAF9';
const DARK_BAR_COLOR = '#0F1514';

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export function isNativeAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

/**
 * Synchronizes Android native StatusBar color and icon contrast with the active theme.
 * In @capacitor/status-bar:
 * - Style.Dark renders light icons/text for dark backgrounds.
 * - Style.Light renders dark icons/text for light backgrounds.
 */
declare global {
  interface Window {
    CardLedgerNative?: {
      setSystemBarTheme?: (isDark: boolean) => void;
    };
  }
}

export async function syncNativeSystemBars(isDark: boolean): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    window.CardLedgerNative?.setSystemBarTheme?.(isDark);
  } catch {
    // Ignore if bridge is unavailable
  }
  try {
    await StatusBar.setOverlaysWebView({overlay: false});
    await StatusBar.setBackgroundColor({
      color: isDark ? DARK_BAR_COLOR : LIGHT_BAR_COLOR,
    });
    await StatusBar.setStyle({
      style: isDark ? Style.Dark : Style.Light,
    });
  } catch {
    // Ignore if plugin is unavailable in browser preview
  }
}

export async function hideNativeSplash(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    await SplashScreen.hide({fadeOutDuration: 180});
  } catch {
    // Ignore if splash screen is already hidden
  }
}

/**
 * Ensures focused form fields inside dialogs scroll cleanly above the Android soft keyboard.
 */
export function initNativeKeyboardHandling(): () => void {
  if (!isNativeAndroid()) {
    return () => {};
  }

  let removed = false;
  let listenerHandle: {remove: () => Promise<void>} | null = null;

  Keyboard.addListener('keyboardDidShow', () => {
    const active = document.activeElement as HTMLElement | null;
    if (
      active &&
      (active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.tagName === 'SELECT')
    ) {
      window.setTimeout(() => {
        active.scrollIntoView({behavior: 'smooth', block: 'center'});
      }, 60);
    }
  })
    .then((handle) => {
      if (removed) {
        void handle.remove();
      } else {
        listenerHandle = handle;
      }
    })
    .catch(() => {});

  return () => {
    removed = true;
    if (listenerHandle) {
      void listenerHandle.remove();
    }
  };
}
