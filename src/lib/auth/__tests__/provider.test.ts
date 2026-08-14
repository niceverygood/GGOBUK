import { describe, expect, it } from 'vitest';
import { isKakaoUser } from '../provider';

describe('isKakaoUser', () => {
  it('accepts Kakao as the primary provider', () => {
    expect(
      isKakaoUser({
        app_metadata: { provider: 'kakao' },
        identities: [],
      }),
    ).toBe(true);
  });

  it('accepts a linked Kakao identity', () => {
    expect(
      isKakaoUser({
        app_metadata: { provider: 'apple', providers: ['apple', 'kakao'] },
        identities: [],
      }),
    ).toBe(true);
  });

  it('rejects non-Kakao and missing users', () => {
    expect(
      isKakaoUser({
        app_metadata: { provider: 'apple' },
        identities: [],
      }),
    ).toBe(false);
    expect(isKakaoUser(null)).toBe(false);
  });
});
