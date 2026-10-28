export interface AssetPlanItem {
  url: string;
  relativePath: string;
}

const SUPPORTED_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'svg',
  'avif',
  'bmp',
  'ico',
]);

function extensionFromUrl(url: string): string {
  try {
    const match = new URL(url).pathname.match(/\.([a-zA-Z0-9]+)$/);
    const extension = match?.[1]?.toLowerCase();
    if (extension && SUPPORTED_EXTENSIONS.has(extension)) {
      return extension === 'jpeg' ? 'jpg' : extension;
    }
  } catch {
    // Invalid URLs keep the conservative JPEG fallback.
  }
  return 'jpg';
}

export function buildAssetPlan(imageUrls: string[]): AssetPlanItem[] {
  const uniqueUrls = [...new Set(imageUrls.filter(Boolean))];
  return uniqueUrls.map((url, index) => ({
    url,
    relativePath: `assets/image-${String(index + 1).padStart(3, '0')}.${extensionFromUrl(url)}`,
  }));
}

export function restoreFailedAssetLinks(
  markdown: string,
  failedAssets: AssetPlanItem[],
): string {
  return failedAssets.reduce(
    (result, asset) => result.split(asset.relativePath).join(asset.url),
    markdown,
  );
}
