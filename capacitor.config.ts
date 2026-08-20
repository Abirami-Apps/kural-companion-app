/// <reference types="@capacitor/app" />
/// <reference types="@capacitor/keyboard" />
/// <reference types="@capacitor/local-notifications" />
/// <reference types="@capacitor/splash-screen" />
/// <reference types="@capacitor/status-bar" />

import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.abiramiaudio.kuralcompanion",
  appName: "Kural Companion",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    App: {
      disableBackButtonHandler: true,
    },
    Keyboard: {
      resize: "native",
      style: "dark",
      resizeOnFullScreen: true,
    },
    LocalNotifications: {
      presentationOptions: ["badge", "sound", "banner", "list"],
    },
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#ff7a00",
      androidScaleType: "CENTER_INSIDE",
      showSpinner: false,
    },
    StatusBar: {
      style: "light",
      backgroundColor: "#0b1020",
      overlaysWebView: false,
    },
  },
};

export default config;
