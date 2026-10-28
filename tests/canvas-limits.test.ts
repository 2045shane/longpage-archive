import { describe, expect, it } from 'vitest';
import { assertCanvasSize, CanvasLimitError } from '../src/capture/canvas-limits';

describe('assertCanvasSize', () => {
  it('accepts a canvas within both dimension and area limits', () => {
    expect(() => assertCanvasSize(1920, 20000)).not.toThrow();
  });

  it('rejects a canvas wider or taller than Chrome can safely encode', () => {
    expect(() => assertCanvasSize(32768, 100)).toThrow(CanvasLimitError);
    expect(() => assertCanvasSize(100, 32768)).toThrow(CanvasLimitError);
  });

  it('rejects a canvas whose total pixel area is too large', () => {
    expect(() => assertCanvasSize(10000, 12001)).toThrow('网页过长');
  });
});
