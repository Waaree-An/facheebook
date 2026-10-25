import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.facheebook.app',
  appName: 'FacheeBook',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
