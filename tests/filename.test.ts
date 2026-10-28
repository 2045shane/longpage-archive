import { describe, expect, it } from 'vitest';
import { sanitizeFilename } from '../src/shared/filename';

describe('sanitizeFilename', () => {
  it('removes path separators and reserved filename characters', () => {
    expect(sanitizeFilename('  报告: 2026/08/27?  ')).toBe('报告- 2026-08-27-');
  });

  it('uses a Chinese fallback for an empty or dot-only title', () => {
    expect(sanitizeFilename('...')).toBe('未命名网页');
  });

  it('limits very long names without dropping the extension supplied later', () => {
    expect(sanitizeFilename('a'.repeat(180))).toHaveLength(120);
  });
});
