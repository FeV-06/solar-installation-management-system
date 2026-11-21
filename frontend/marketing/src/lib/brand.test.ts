import { describe, expect, it } from 'vitest';
import wordmark from '../../../brand/logo/wordmark.json';

describe('Sol wordmark', () => {
  it('renders the SOL outline and a separate sun dot', () => {
    expect(wordmark.letters).toHaveLength(3);
    expect(wordmark.letters.map((letter) => letter.x)).toEqual([0, 85.5, 187.8]);
    expect(wordmark.dot.cx).toBeGreaterThan(187.8 + 68.5);
    expect(wordmark.viewBox).toBe('-2 26 286 75');
  });
});
