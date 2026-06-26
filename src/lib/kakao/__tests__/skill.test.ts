import { describe, it, expect } from 'vitest';
import { textResponse, callbackAck, quickReply } from '../skill';

describe('kakao skill builders', () => {
  it('wraps short text in a single simpleText bubble', () => {
    const r = textResponse('안녕 꼬북이야');
    expect(r.version).toBe('2.0');
    expect(r.template?.outputs).toHaveLength(1);
    expect(r.template?.outputs[0].simpleText.text).toBe('안녕 꼬북이야');
    expect(r.template?.quickReplies).toBeUndefined();
  });

  it('attaches quick replies when provided', () => {
    const r = textResponse('운세 볼래?', [quickReply('오늘의 운세', '오늘 운세')]);
    expect(r.template?.quickReplies).toEqual([
      { label: '오늘의 운세', action: 'message', messageText: '오늘 운세' },
    ]);
  });

  it('quickReply defaults messageText to the label', () => {
    expect(quickReply('연애운')).toEqual({
      label: '연애운',
      action: 'message',
      messageText: '연애운',
    });
  });

  it('splits text over 1000 chars into multiple bubbles (max 3)', () => {
    // 문장 경계가 있는 긴 텍스트.
    const sentence = '이건 한 문장이야. ';
    const long = sentence.repeat(400); // ~7200자
    const r = textResponse(long);
    const outputs = r.template?.outputs ?? [];
    expect(outputs.length).toBeGreaterThan(1);
    expect(outputs.length).toBeLessThanOrEqual(3);
    for (const o of outputs) {
      expect(o.simpleText.text.length).toBeLessThanOrEqual(1000);
      expect(o.simpleText.text.length).toBeGreaterThan(0);
    }
  });

  it('builds a useCallback ack with waiting text', () => {
    const r = callbackAck('생각 중...');
    expect(r.useCallback).toBe(true);
    expect(r.data?.text).toBe('생각 중...');
    expect(r.template).toBeUndefined();
  });
});
