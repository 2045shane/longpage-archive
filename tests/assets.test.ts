import { describe, expect, it } from 'vitest';
import { buildAssetPlan, restoreFailedAssetLinks } from '../src/markdown/assets';

describe('buildAssetPlan', () => {
  it('deduplicates URLs and assigns safe deterministic filenames', () => {
    expect(buildAssetPlan([
      'https://cdn.example.com/a/photo.JPG?size=2',
      'https://cdn.example.com/a/photo.JPG?size=2',
      'https://cdn.example.com/no-extension',
    ])).toEqual([
      {
        url: 'https://cdn.example.com/a/photo.JPG?size=2',
        relativePath: 'assets/image-001.jpg',
      },
      {
        url: 'https://cdn.example.com/no-extension',
        relativePath: 'assets/image-002.jpg',
      },
    ]);
  });
});

describe('restoreFailedAssetLinks', () => {
  it('restores original network URLs only for assets that failed to download', () => {
    const failed = {
      url: 'https://cdn.example.com/missing.png',
      relativePath: 'assets/image-002.png',
    };
    const markdown = '![正常](assets/image-001.png)\n![失败](assets/image-002.png)';

    expect(restoreFailedAssetLinks(markdown, [failed])).toBe(
      '![正常](assets/image-001.png)\n![失败](https://cdn.example.com/missing.png)',
    );
  });
});
