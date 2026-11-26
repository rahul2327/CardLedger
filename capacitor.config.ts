import type {CapacitorConfig} from '@capacitor/cli';
import {KeyboardResize, KeyboardStyle} from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.rahul2327.cardledger',
  appName: 'CardLedger',
  webDir: 'dist',
  server: {
    // Load exclusively from bundled local assets under a stable HTTPS origin
    // so IndexedDB data persists cleanly across all app updates.
    androidScheme: 'https',
    hostname: 'localhost',
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#F7FAF9',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false,
    },
    StatusBar: {
      overlaysWebView: false,
      backgroundColor: '#F7FAF9',
      style: 'LIGHT',
    },
    Keyboard: {
      resize: KeyboardResize.Body,
      style: KeyboardStyle.Default,
      resizeOnFullScreen: true,
    },
  },
};

export default config;
