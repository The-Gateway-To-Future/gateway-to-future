import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.gatewaytofuture.app",
  appName: "Gateway To Future",
  webDir: "out",
  server: {
    url: "https://app.gatewaytofuture.com",
    cleartext: false,
    androidScheme: "https",
    errorPath: "index.html",
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
    backgroundColor: "#f8fafc",
  },
  ios: {
    contentInset: "always",
    allowsLinkPreview: false,
    scrollEnabled: true,
    backgroundColor: "#f8fafc",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#f8fafc",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#f8fafc",
      overlaysWebView: false,
    },
  },
};

export default config;
