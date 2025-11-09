import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.iris.distributor',
  appName: 'IRIS Portal',
  webDir: 'build',
  server: {
    // For development
    // url: 'http://192.168.1.100:5173', // Your local IP
    // cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#00a8b5',
      showSpinner: false,
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  android: {
    allowMixedContent: true,
  },
  ios: {
    contentInset: 'automatic',
    // Minimum iOS version supported
    minVersion: '13.0',
    // Use WKWebView configuration
    scheme: 'capacitor',
    // Limit file access
    limitsNavigationsToAppBoundDomains: false,
    // Allow inline media playback
    allowsInlineMediaPlayback: true,
    // Suppress incremental rendering
    suppressesIncrementalRendering: false,
    // Scroll bounce
    scrollEnabled: true,
  },
};

export default config;
