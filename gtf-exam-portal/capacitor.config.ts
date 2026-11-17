import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.gatewaytofuture.app",
  appName: "Gateway To Future",
  webDir: "out",
  server: {
    url: "https://app.gatewaytofuture.com",
    cleartext: false,
    androidScheme: "https",
    allowNavigation: [
      "app.gatewaytofuture.com",
      "*.gatewaytofuture.com",
      "gatewaytofuture.com",
      "*.firebaseapp.com",
      "*.googleapis.com",
      "accounts.google.com",
      "*.google.com",
    ],
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    backgroundColor: "#0A1628",
  },
  ios: {
    contentInset: "always",
    allowsLinkPreview: false,
    scrollEnabled: true,
    backgroundColor: "#0A1628",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#0A1628",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0A1628",
      overlaysWebView: false,
    },
  },
};

export default config;
