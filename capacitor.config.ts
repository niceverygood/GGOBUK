import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.niceverygood.ggobuk',
  appName: '꼬북점',
  webDir: 'app-shell',
  server: {
    url: 'https://ggobuk.vercel.app',
    cleartext: false,
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
