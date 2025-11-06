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
  },
};

export default config;
