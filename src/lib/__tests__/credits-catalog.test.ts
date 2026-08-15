import { describe, expect, it } from 'vitest';
import { CREDIT_COSTS, CREDIT_PACKAGES, totalCredits } from '@/lib/credits';
import {
  CONSUMABLE,
  EXCHANGE,
  LEAF_TO_CHAT_TURNS,
  POLICY_VERSION,
  SERVICE_CATALOG,
  priceSnapshotOf,
  serviceSpec,
} from '@/domain/policy/catalog';

/**
 * 가격의 단일 진실 검증.
 *
 * 명세 §2.4: "UI·API 검증·약관 표·테스트가 서로 다른 하드코딩을 갖지 않게 한다."
 * 이 테스트가 통과하는 한 카탈로그와 레거시 상수는 갈라질 수 없다.
 */
describe('CREDIT_COSTS 는 카탈로그에서 파생된다', () => {
  it('리포트 가격이 카탈로그와 같다', () => {
    expect(CREDIT_COSTS.reading).toBe(SERVICE_CATALOG.full_saju.price);
    expect(CREDIT_COSTS.monthly).toBe(SERVICE_CATALOG.monthly.price);
    expect(CREDIT_COSTS.compatibility).toBe(
      SERVICE_CATALOG.compatibility.price,
    );
    expect(CREDIT_COSTS.daewoon).toBe(SERVICE_CATALOG.daewoon.price);
    expect(CREDIT_COSTS.yearly).toBe(SERVICE_CATALOG.yearly.price);
    expect(CREDIT_COSTS.luckyDay).toBe(SERVICE_CATALOG.lucky_day.price);
  });

  it('채팅 가격이 소비재 정의와 같다', () => {
    expect(CREDIT_COSTS.chat).toBe(CONSUMABLE.chatTurn.price);
  });

  it('명세 §5.2 가격표와 일치한다', () => {
    expect(SERVICE_CATALOG.full_saju.price).toBe(5);
    expect(SERVICE_CATALOG.compatibility.price).toBe(6);
    expect(SERVICE_CATALOG.daewoon.price).toBe(3);
    expect(SERVICE_CATALOG.yearly.price).toBe(3);
    expect(SERVICE_CATALOG.lucky_day.price).toBe(4);
    expect(SERVICE_CATALOG.jamidusu.price).toBe(10);
  });
});

describe('재화 교환비', () => {
  it('1 꼬북알 = 3 꼬북잎, 양방향 동일', () => {
    expect(EXCHANGE.eggToLeaf).toBe(3);
    expect(EXCHANGE.leafToEgg).toBe(3);
  });

  it('꼬북잎 1개 = 채팅 3회', () => {
    expect(LEAF_TO_CHAT_TURNS).toBe(3);
  });

  it('알↔잎 왕복은 보존 법칙을 지킨다', () => {
    // 1알 → 3잎 → 다시 1알. 손실도 이득도 없어야 한다.
    const eggs = 5;
    const leaves = eggs * EXCHANGE.eggToLeaf;
    expect(leaves / EXCHANGE.leafToEgg).toBe(eggs);
  });
});

describe('가격 스냅샷', () => {
  it('정책 버전을 함께 박는다 (소급 적용 방지)', () => {
    const snap = priceSnapshotOf(SERVICE_CATALOG.full_saju);
    expect(snap).toEqual({
      asset: 'EGG',
      amount: 5,
      policyVersion: POLICY_VERSION,
    });
  });

  it('정책 버전이 비어 있지 않다', () => {
    expect(POLICY_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
  });
});

describe('카탈로그 조회', () => {
  it('알 수 없는 타입은 null 을 준다', () => {
    expect(serviceSpec('nope')).toBeNull();
  });

  it('궁합만 두 번째 프로필을 요구한다', () => {
    const needsTwo = Object.values(SERVICE_CATALOG)
      .filter((s) => s.requiresSecondProfile)
      .map((s) => s.type);
    expect(needsTwo).toEqual(['compatibility']);
  });

  it('미출시 기능에는 전부 flag 가 달려 있다', () => {
    // flag 없는 서비스 = 지금 실제로 제공하는 것
    const live = Object.values(SERVICE_CATALOG)
      .filter((s) => !s.flag)
      .map((s) => s.type)
      .sort();
    expect(live).toEqual(['full_saju', 'monthly']);
  });
});

describe('IAP 패키지 불변식', () => {
  it('심사 제출본과 동일한 5종·가격을 유지한다', () => {
    // ⚠️ 이 값이 바뀌면 스토어 상품과 지급 알 수가 어긋나 실결제 사고가 난다.
    expect(
      CREDIT_PACKAGES.map((p) => [p.id, p.credits, p.bonusCredits, p.priceKrw]),
    ).toEqual([
      ['mini', 2, 0, 900],
      ['entry', 8, 0, 2900],
      ['focus', 36, 6, 12900],
      ['deep', 90, 30, 29900],
      ['master', 180, 80, 59000],
    ]);
  });

  it('보너스 포함 총량이 스토어 표기와 맞는다', () => {
    expect(CREDIT_PACKAGES.map(totalCredits)).toEqual([2, 8, 42, 120, 260]);
  });
});
