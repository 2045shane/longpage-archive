import { describe, expect, it } from 'vitest';
import { createPdfSlices } from '../src/capture/pdf-layout';

describe('createPdfSlices', () => {
  it('covers the whole image with consecutive A4-ratio slices', () => {
    const slices = createPdfSlices(3000, 1000);

    expect(slices).toEqual([
      { sourceY: 0, sourceHeight: 1414 },
      { sourceY: 1414, sourceHeight: 1414 },
      { sourceY: 2828, sourceHeight: 172 },
    ]);
    expect(slices.reduce((sum, slice) => sum + slice.sourceHeight, 0)).toBe(3000);
  });

  it('returns a single slice for a short image', () => {
    expect(createPdfSlices(700, 1000)).toEqual([{ sourceY: 0, sourceHeight: 700 }]);
  });
});
