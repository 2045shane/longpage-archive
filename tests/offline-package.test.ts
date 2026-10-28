import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { buildOfflinePackage } from '../src/markdown/offline-package';

describe('buildOfflinePackage', () => {
  it('stores successful images and restores failed image links in Markdown', async () => {
    const assets = [
      { url: 'https://cdn.example.com/ok.png', relativePath: 'assets/image-001.png' },
      { url: 'https://cdn.example.com/missing.png', relativePath: 'assets/image-002.png' },
    ];
    const markdown = '![正常](assets/image-001.png)\n![失败](assets/image-002.png)\n';

    const result = await buildOfflinePackage(
      markdown,
      '示例文章.md',
      assets,
      async (url) => {
        if (url.endsWith('/ok.png')) {
          return new Uint8Array([137, 80, 78, 71]);
        }
        throw new Error('404');
      },
    );
    const zip = await JSZip.loadAsync(result.bytes);

    expect(Object.keys(zip.files).sort()).toEqual([
      'assets/',
      'assets/image-001.png',
      '图片下载失败.txt',
      '示例文章.md',
    ]);
    expect(await zip.file('示例文章.md')?.async('string')).toContain(
      '![失败](https://cdn.example.com/missing.png)',
    );
    expect(await zip.file('assets/image-001.png')?.async('uint8array')).toEqual(
      new Uint8Array([137, 80, 78, 71]),
    );
    expect(await zip.file('图片下载失败.txt')?.async('string')).toContain(
      'https://cdn.example.com/missing.png',
    );
    expect(result.failedAssets).toEqual([assets[1]!]);
  });
});
