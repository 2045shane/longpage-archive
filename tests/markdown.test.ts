import { describe, expect, it } from 'vitest';
import { convertArticle } from '../src/markdown/convert';

describe('convertArticle', () => {
  it('creates quick and offline Markdown with metadata and GFM structures', () => {
    const result = convertArticle(
      {
        title: 'API "指南"',
        sourceUrl: 'https://example.com/guide',
        contentHtml: `
          <h2>数据表</h2>
          <table><thead><tr><th>名称</th><th>值</th></tr></thead><tbody><tr><td>A</td><td>1</td></tr></tbody></table>
          <pre><code class="language-js">const answer = 42;</code></pre>
          <img src="https://cdn.example.com/diagram.png" alt="流程图">
        `,
      },
      new Date('2026-08-27T09:00:00.000Z'),
    );

    expect(result.quickMarkdown).toContain('title: "API \\"指南\\""');
    expect(result.quickMarkdown).toContain('source: "https://example.com/guide"');
    expect(result.quickMarkdown).toContain('| 名称 | 值 |');
    expect(result.quickMarkdown).toContain('```js');
    expect(result.quickMarkdown).toContain('https://cdn.example.com/diagram.png');
    expect(result.offlineMarkdown).toContain('assets/image-001.png');
    expect(result.assets).toEqual([
      {
        url: 'https://cdn.example.com/diagram.png',
        relativePath: 'assets/image-001.png',
      },
    ]);
  });

  it('does not duplicate a leading article heading that matches the document title', () => {
    const result = convertArticle(
      {
        title: '重复标题',
        sourceUrl: 'https://example.com/post',
        contentHtml: '<h1>重复标题</h1><p>正文内容</p><h2>下一节</h2>',
      },
      new Date('2026-08-27T09:00:00.000Z'),
    );

    expect(result.quickMarkdown.match(/^# 重复标题$/gm)).toHaveLength(1);
    expect(result.quickMarkdown).toContain('## 下一节');
  });
});
