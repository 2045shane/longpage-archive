import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { extractArticle } from '../src/markdown/article';

describe('extractArticle', () => {
  it('extracts the article and excludes surrounding navigation without mutating the page', () => {
    const paragraph = '这是用于验证正文识别的长段落。'.repeat(50);
    const dom = new JSDOM(`<!doctype html><html><head><title>示例文章</title></head><body>
      <nav>不应进入正文的导航</nav>
      <article><h1>示例文章</h1><p>${paragraph}</p><img src="/cover.png" alt="封面"></article>
      <footer>不应进入正文的页脚</footer>
    </body></html>`, { url: 'https://example.com/posts/1' });

    const result = extractArticle(dom.window.document, dom.window.location.href);

    expect(result.title).toBe('示例文章');
    expect(result.contentHtml).toContain('这是用于验证正文识别');
    expect(result.contentHtml).not.toContain('不应进入正文的导航');
    expect(result.contentHtml).toContain('https://example.com/cover.png');
    expect(dom.window.document.querySelector('img')?.getAttribute('src')).toBe('/cover.png');
  });

  it('falls back to the main element when a short page is not reader-shaped', () => {
    const dom = new JSDOM('<main><h1>短公告</h1><p>今天暂停营业。</p></main>', {
      url: 'https://example.com/notice',
    });

    const result = extractArticle(dom.window.document, dom.window.location.href);

    expect(result.contentHtml).toContain('今天暂停营业');
    expect(result.title).toBe('短公告');
  });
});
