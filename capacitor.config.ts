import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.thenewbie.app',
  appName: 'TheNewbie',
  webDir: 'out',
  server: {
    url: 'https://thenewbie.org',
    cleartext: false,
  },
  ios: {
    contentInset: 'always',
  },
};

export default config;
