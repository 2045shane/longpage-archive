import { Readability } from '@mozilla/readability';

export interface ExtractedArticle {
  title: string;
  sourceUrl: string;
  contentHtml: string;
}

function makeAbsolute(value: string, sourceUrl: string): string {
  try {
    return new URL(value, sourceUrl).href;
  } catch {
    return value;
  }
}

function normalizeResourceUrls(contentHtml: string, document: Document, sourceUrl: string): string {
  const container = document.implementation.createHTMLDocument('');
  container.body.innerHTML = contentHtml;

  for (const anchor of container.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    anchor.href = makeAbsolute(anchor.getAttribute('href') ?? '', sourceUrl);
  }
  for (const image of container.querySelectorAll<HTMLImageElement>('img[src]')) {
    image.src = makeAbsolute(image.getAttribute('src') ?? '', sourceUrl);
  }
  for (const source of container.querySelectorAll<HTMLSourceElement>('source[src]')) {
    source.src = makeAbsolute(source.getAttribute('src') ?? '', sourceUrl);
  }

  return container.body.innerHTML;
}

function fallbackContent(document: Document): { title: string; content: string } {
  const root = document.querySelector('main, article, [role="main"]') ?? document.body;
  const title =
    root?.querySelector('h1')?.textContent?.trim() ||
    document.querySelector('h1')?.textContent?.trim() ||
    document.title.trim() ||
    '未命名网页';

  return {
    title,
    content: root?.innerHTML ?? '',
  };
}

export function extractArticle(document: Document, sourceUrl: string): ExtractedArticle {
  const clonedDocument = document.cloneNode(true) as Document;
  clonedDocument.querySelectorAll('[data-longshot-overlay]').forEach((node) => node.remove());

  const parsed = new Readability(clonedDocument, { charThreshold: 140 }).parse();
  const fallback = fallbackContent(document);
  const title = parsed?.title?.trim() || fallback.title;
  const content = parsed?.content?.trim() || fallback.content;

  return {
    title,
    sourceUrl,
    contentHtml: normalizeResourceUrls(content, document, sourceUrl),
  };
}
