import { describe, expect, it } from 'vitest';
import { createCaptureFrames } from '../src/capture/plan';

describe('createCaptureFrames', () => {
  it('crops the overlap from the final viewport instead of duplicating pixels', () => {
    expect(createCaptureFrames(2500, 1000)).toEqual([
      { scrollY: 0, cropTop: 0, captureHeight: 1000 },
      { scrollY: 1000, cropTop: 0, captureHeight: 1000 },
      { scrollY: 1500, cropTop: 500, captureHeight: 500 },
    ]);
  });

  it('uses one cropped frame when the document is shorter than the viewport', () => {
    expect(createCaptureFrames(640, 900)).toEqual([
      { scrollY: 0, cropTop: 0, captureHeight: 640 },
    ]);
  });

  it('rejects invalid dimensions', () => {
    expect(() => createCaptureFrames(0, 800)).toThrow('页面高度必须大于 0');
    expect(() => createCaptureFrames(800, 0)).toThrow('视口高度必须大于 0');
  });
});
