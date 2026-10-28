import JSZip from 'jszip';
import type { AssetPlanItem } from './assets';
import { restoreFailedAssetLinks } from './assets';

export type AssetFetcher = (url: string) => Promise<Uint8Array>;

export interface OfflinePackageResult {
  bytes: Uint8Array;
  failedAssets: AssetPlanItem[];
}

async function defaultAssetFetcher(url: string): Promise<Uint8Array> {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType && !contentType.startsWith('image/')) {
    throw new Error(`不是图片资源：${contentType}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

export async function buildOfflinePackage(
  markdown: string,
  markdownFilename: string,
  assets: AssetPlanItem[],
  fetchAsset: AssetFetcher = defaultAssetFetcher,
): Promise<OfflinePackageResult> {
  const zip = new JSZip();
  const failedAssets: AssetPlanItem[] = [];
  const errors: string[] = [];

  for (let start = 0; start < assets.length; start += 4) {
    const batch = assets.slice(start, start + 4);
    await Promise.all(batch.map(async (asset) => {
      try {
        const bytes = await fetchAsset(asset.url);
        zip.file(asset.relativePath, bytes);
      } catch (error) {
        failedAssets.push(asset);
        const reason = error instanceof Error ? error.message : String(error);
        errors.push(`${asset.url}\n  ${reason}`);
      }
    }));
  }

  zip.file(markdownFilename, restoreFailedAssetLinks(markdown, failedAssets));
  if (errors.length > 0) {
    zip.file(
      '图片下载失败.txt',
      `以下图片未能保存，Markdown 已恢复为网络地址：\n\n${errors.join('\n\n')}\n`,
    );
  }

  return {
    bytes: await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }),
    failedAssets,
  };
}
