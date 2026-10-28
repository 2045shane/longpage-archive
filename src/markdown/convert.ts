import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import type { ExtractedArticle } from './article';
import { buildAssetPlan, type AssetPlanItem } from './assets';

export interface MarkdownExport {
  quickMarkdown: string;
  offlineMarkdown: string;
  assets: AssetPlanItem[];
}

function createTurndownService(): TurndownService {
  const service = new TurndownService({
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    fence: '```',
    headingStyle: 'atx',
    strongDelimiter: '**',
  });
  service.use(gfm);
  service.remove(['script', 'style', 'noscript', 'template']);
  return service;
}

function metadata(article: ExtractedArticle, capturedAt: Date): string {
  return [
    '---',
    `title: ${JSON.stringify(article.title)}`,
    `source: ${JSON.stringify(article.sourceUrl)}`,
    `captured_at: ${JSON.stringify(capturedAt.toISOString())}`,
    '---',
  ].join('\n');
}

function convertHtml(contentHtml: string): string {
  return createTurndownService().turndown(contentHtml).trim();
}

function removeDuplicateLeadingTitle(root: HTMLElement, title: string): void {
  let candidate: Element | null = root.firstElementChild;
  while (candidate && ['DIV', 'ARTICLE', 'MAIN', 'SECTION'].includes(candidate.tagName)) {
    const firstChild = candidate.firstElementChild;
    if (!firstChild) break;
    const hasTextBeforeFirstChild = [...candidate.childNodes]
      .slice(0, [...candidate.childNodes].indexOf(firstChild))
      .some((node) => node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim()));
    if (hasTextBeforeFirstChild) break;
    candidate = firstChild;
  }

  const normalizedTitle = title.replace(/\s+/g, ' ').trim();
  if (
    candidate?.matches('h1, h2') &&
    candidate.textContent?.replace(/\s+/g, ' ').trim() === normalizedTitle
  ) {
    candidate.remove();
  }
}

export function convertArticle(article: ExtractedArticle, capturedAt: Date): MarkdownExport {
  const parsed = new DOMParser().parseFromString(article.contentHtml, 'text/html');
  removeDuplicateLeadingTitle(parsed.body, article.title);
  const imageUrls = [...parsed.querySelectorAll<HTMLImageElement>('img[src]')]
    .map((image) => image.getAttribute('src') ?? '')
    .filter(Boolean);
  const assets = buildAssetPlan(imageUrls);
  const localPathByUrl = new Map(assets.map((asset) => [asset.url, asset.relativePath]));

  const quickHtml = parsed.body.innerHTML;
  for (const image of parsed.querySelectorAll<HTMLImageElement>('img[src]')) {
    const source = image.getAttribute('src') ?? '';
    const localPath = localPathByUrl.get(source);
    if (localPath) {
      image.setAttribute('src', localPath);
    }
  }

  const header = `${metadata(article, capturedAt)}\n\n# ${article.title}`;
  return {
    quickMarkdown: `${header}\n\n${convertHtml(quickHtml)}\n`,
    offlineMarkdown: `${header}\n\n${convertHtml(parsed.body.innerHTML)}\n`,
    assets,
  };
}
