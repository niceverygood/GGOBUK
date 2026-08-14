import { describe, expect, it } from 'vitest';
import { safeNext } from '@/lib/auth/safe-next';

/**
 * OAuth open-redirect 회귀 테스트.
 * 접두사 검사만으로는 막히지 않는 페이로드들이 실제로 차단되는지 확인한다.
 */
describe('safeNext — open redirect 방어', () => {
  it('내부 경로는 통과시킨다', () => {
    expect(safeNext('/home')).toBe('/home');
    expect(safeNext('/shell')).toBe('/shell');
    expect(safeNext('/ilju/gapja')).toBe('/ilju/gapja');
  });

  it('쿼리와 해시를 보존한다', () => {
    expect(safeNext('/store?success=1')).toBe('/store?success=1');
    expect(safeNext('/home#top')).toBe('/home#top');
  });

  it('빈 값·없음은 기본 경로로', () => {
    expect(safeNext(null)).toBe('/home');
    expect(safeNext('')).toBe('/home');
  });

  it('프로토콜 상대 경로를 막는다', () => {
    expect(safeNext('//evil.com')).toBe('/home');
    expect(safeNext('///evil.com')).toBe('/home');
  });

  it('백슬래시 우회를 막는다 (URL 파서가 슬래시로 정규화)', () => {
    expect(safeNext('/\\evil.com')).toBe('/home');
    expect(safeNext('\\\\evil.com')).toBe('/home');
    expect(safeNext('/\\\\evil.com')).toBe('/home');
  });

  it('제어문자 우회를 막는다 (파서가 탭·개행을 제거)', () => {
    expect(safeNext('/\t/evil.com')).toBe('/home');
    expect(safeNext('/\n/evil.com')).toBe('/home');
    expect(safeNext('/\r/evil.com')).toBe('/home');
  });

  it('절대 URL 을 막는다', () => {
    expect(safeNext('https://evil.com')).toBe('/home');
    expect(safeNext('http://evil.com/path')).toBe('/home');
    expect(safeNext('javascript:alert(1)')).toBe('/home');
  });
});
