import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl =
  process.env.CAPACITOR_SERVER_URL ?? 'https://ggobuk.vercel.app/splash';

const config: CapacitorConfig = {
  appId: 'com.niceverygood.ggobuk',
  appName: '꼬북점',
  webDir: 'app-shell',
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith('http://'),
    allowNavigation: [
      'ggobuk.vercel.app',
      '*.supabase.co',
      'kauth.kakao.com',
      'kapi.kakao.com',
      '*.kakao.com',
      '*.kakaopay.com',
    ],
  },
};

export default config;
