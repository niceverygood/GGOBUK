import { describe, it, expect } from 'vitest';
import { calculatePalja } from '../palja';

describe('Palja calculation', () => {
  it('Hi reference: 1985-11-14 14:05 male solar', () => {
    const r = calculatePalja({
      birthDate: '1985-11-14',
      birthTime: '14:05',
      isLunar: false,
      gender: 'M',
    });
    expect(r.year.ganHanja).toBe('乙');
    expect(r.year.jiHanja).toBe('丑');
    expect(r.month.ganHanja).toBe('丁');
    expect(r.month.jiHanja).toBe('亥');
    expect(r.day.ganHanja).toBe('丁');
    expect(r.day.jiHanja).toBe('巳');
    expect(r.time?.ganHanja).toBe('丁');
    expect(r.time?.jiHanja).toBe('未');
  });

  it('Time unknown returns null time pillar', () => {
    const r = calculatePalja({
      birthDate: '1985-11-14',
      isLunar: false,
      gender: 'M',
    });
    expect(r.time).toBeNull();
  });

  it('Born just before 입춘: year pillar uses previous year', () => {
    // 2024 입춘 ≈ 02-04 17:21 KST. Birth at 02-03 23:00 → before.
    const r = calculatePalja({
      birthDate: '2024-02-03',
      birthTime: '23:00',
      isLunar: false,
      gender: 'F',
    });
    expect(r.year.ganHanja).toBe('癸');
    expect(r.year.jiHanja).toBe('卯');
  });

  it('Born just after 입춘: year pillar uses current year', () => {
    const r = calculatePalja({
      birthDate: '2024-02-05',
      birthTime: '10:00',
      isLunar: false,
      gender: 'F',
    });
    expect(r.year.ganHanja).toBe('甲');
    expect(r.year.jiHanja).toBe('辰');
  });

  it('야자시 (23:30+) advances day pillar', () => {
    const before = calculatePalja({
      birthDate: '1990-01-01',
      birthTime: '23:00',
      isLunar: false,
      gender: 'M',
    });
    const after = calculatePalja({
      birthDate: '1990-01-01',
      birthTime: '23:45',
      isLunar: false,
      gender: 'M',
    });
    // The two should have different day pillars (advanced by one).
    expect(before.day.ganHanja).not.toBe(after.day.ganHanja);
  });

  it('Lunar input matches solar equivalent (1985-10-03 lunar = 1985-11-14 solar)', () => {
    const lunar = calculatePalja({
      birthDate: '1985-10-03',
      birthTime: '14:05',
      isLunar: true,
      gender: 'M',
    });
    const solar = calculatePalja({
      birthDate: '1985-11-14',
      birthTime: '14:05',
      isLunar: false,
      gender: 'M',
    });
    expect(lunar.day.ganHanja).toBe(solar.day.ganHanja);
    expect(lunar.day.jiHanja).toBe(solar.day.jiHanja);
  });
});
