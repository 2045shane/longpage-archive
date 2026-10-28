import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { CapturePageState, type ScrollWindow } from '../src/runtime/page-state';

function createScrollWindow(dom: JSDOM, x = 12, y = 640): ScrollWindow {
  return {
    innerHeight: 800,
    innerWidth: 1200,
    scrollX: x,
    scrollY: y,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
    scrollTo(nextX, nextY) {
      this.scrollX = nextX;
      this.scrollY = nextY;
    },
  };
}

describe('CapturePageState', () => {
  it('hides fixed and sticky elements after the first frame', () => {
    const dom = new JSDOM(`
      <body>
        <header id="fixed" style="position: fixed; color: red">导航</header>
        <aside id="sticky" style="position: sticky; top: 0">目录</aside>
        <main id="normal">正文</main>
      </body>
    `);
    const state = new CapturePageState(dom.window.document, createScrollWindow(dom));

    state.prepare();
    state.applyFrame(0);
    expect(dom.window.document.querySelector<HTMLElement>('#fixed')?.style.visibility).toBe('');

    state.applyFrame(1);
    expect(dom.window.document.querySelector<HTMLElement>('#fixed')?.style.visibility).toBe('hidden');
    expect(dom.window.document.querySelector<HTMLElement>('#sticky')?.style.visibility).toBe('hidden');
    expect(dom.window.document.querySelector<HTMLElement>('#normal')?.style.visibility).toBe('');
  });

  it('restores inline styles and the original scroll position exactly once', () => {
    const dom = new JSDOM(`
      <html style="scroll-behavior: smooth"><body>
        <header id="fixed" style="position: fixed; color: red">导航</header>
      </body></html>
    `);
    const scrollingWindow = createScrollWindow(dom);
    const state = new CapturePageState(dom.window.document, scrollingWindow);
    const originalStyle = dom.window.document.querySelector<HTMLElement>('#fixed')?.getAttribute('style');

    state.prepare();
    state.applyFrame(2);
    scrollingWindow.scrollTo(0, 2000);
    state.restore();
    state.restore();

    expect(dom.window.document.querySelector<HTMLElement>('#fixed')?.getAttribute('style')).toBe(originalStyle);
    expect(dom.window.document.documentElement.style.scrollBehavior).toBe('smooth');
    expect({ x: scrollingWindow.scrollX, y: scrollingWindow.scrollY }).toEqual({ x: 12, y: 640 });
  });

  it('hides Chromium scrollbars only while capture is active', () => {
    const dom = new JSDOM('<html><head></head><body><main>正文</main></body></html>');
    const state = new CapturePageState(dom.window.document, createScrollWindow(dom));

    state.prepare();
    const captureStyle = dom.window.document.querySelector<HTMLStyleElement>(
      'style[data-longshot-scrollbar-style]',
    );
    expect(captureStyle).not.toBeNull();
    expect(captureStyle!.textContent).toContain('::-webkit-scrollbar');

    state.restore();
    expect(dom.window.document.querySelector('style[data-longshot-scrollbar-style]')).toBeNull();
  });
});
