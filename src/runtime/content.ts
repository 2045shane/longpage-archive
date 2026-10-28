import { extractArticle } from '../markdown/article';
import { convertArticle } from '../markdown/convert';
import type { PageMetrics, RuntimeMessage } from '../shared/messages';
import { CapturePageState, type ScrollWindow } from './page-state';

interface ContentScope extends Window {
  __LONGSHOT_CONTENT_INSTALLED__?: boolean;
}

const contentScope = window as ContentScope;

if (!contentScope.__LONGSHOT_CONTENT_INSTALLED__) {
  contentScope.__LONGSHOT_CONTENT_INSTALLED__ = true;
  installContentRuntime();
}

function installContentRuntime(): void {
  let pageState: CapturePageState | null = null;
  let overlayHost: HTMLDivElement | null = null;
  let cancelledLocally = false;

  function wait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  async function waitForPaint(milliseconds = 0): Promise<void> {
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    if (milliseconds > 0) {
      await wait(milliseconds);
    }
  }

  function documentHeight(): number {
    const body = document.body;
    const root = document.documentElement;
    return Math.max(
      body?.scrollHeight ?? 0,
      body?.offsetHeight ?? 0,
      root.scrollHeight,
      root.offsetHeight,
      root.clientHeight,
    );
  }

  function ensureOverlay(): ShadowRoot {
    if (overlayHost?.isConnected && overlayHost.shadowRoot) {
      return overlayHost.shadowRoot;
    }

    overlayHost = document.createElement('div');
    overlayHost.dataset.longshotOverlay = 'true';
    overlayHost.style.cssText = 'all:initial;position:fixed;z-index:2147483647;right:18px;bottom:18px;';
    const shadow = overlayHost.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        .box{width:244px;padding:13px 14px;border-radius:14px;background:#163d2d;color:#fff;
          box-shadow:0 12px 34px rgba(0,0,0,.25);font:12px/1.4 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}
        .row{display:flex;justify-content:space-between;gap:10px}.track{height:5px;margin-top:9px;border-radius:9px;background:#537565;overflow:hidden}
        .bar{display:block;width:0;height:100%;background:#b7efd2;transition:width .2s}button{margin-top:9px;padding:0;border:0;background:transparent;
          color:#ffd1d1;font:11px inherit;cursor:pointer}
      </style>
      <div class="box"><div class="row"><span class="message">正在准备…</span><span class="percent"></span></div>
      <div class="track"><span class="bar"></span></div><button type="button">取消截图</button></div>`;
    shadow.querySelector('button')?.addEventListener('click', () => {
      cancelledLocally = true;
      void chrome.runtime.sendMessage({ type: 'CANCEL_EXPORT' });
      showOverlay('正在取消…', 0, 0);
    });
    document.documentElement.append(overlayHost);
    return shadow;
  }

  function showOverlay(message: string, completed: number, total: number): void {
    const shadow = ensureOverlay();
    if (overlayHost) overlayHost.style.display = 'block';
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const messageNode = shadow.querySelector<HTMLElement>('.message');
    const percentNode = shadow.querySelector<HTMLElement>('.percent');
    const bar = shadow.querySelector<HTMLElement>('.bar');
    if (messageNode) messageNode.textContent = message;
    if (percentNode) percentNode.textContent = total > 0 ? `${percent}%` : '';
    if (bar) bar.style.width = `${percent}%`;
  }

  function hideOverlay(): void {
    if (overlayHost) overlayHost.style.display = 'none';
  }

  async function preScroll(): Promise<void> {
    showOverlay('正在加载页面内容…', 0, 0);
    let position = 0;
    let iterations = 0;
    while (position < documentHeight() - window.innerHeight && iterations < 200) {
      if (cancelledLocally) throw new Error('EXPORT_CANCELLED');
      position = Math.min(position + Math.max(300, Math.floor(window.innerHeight * 0.85)), documentHeight());
      window.scrollTo(0, position);
      iterations += 1;
      await waitForPaint(140);
    }
    window.scrollTo(0, Math.max(0, documentHeight() - window.innerHeight));
    await waitForPaint(350);
    window.scrollTo(0, 0);
    await waitForPaint(250);
  }

  async function handleMessage(message: RuntimeMessage): Promise<unknown> {
    switch (message.type) {
      case 'PING':
        return { ok: true };
      case 'PREPARE_CAPTURE': {
        pageState?.restore();
        cancelledLocally = false;
        pageState = new CapturePageState(document, window as unknown as ScrollWindow);
        pageState.prepare();
        await preScroll();
        const metrics: PageMetrics = {
          pageHeight: documentHeight(),
          viewportHeight: window.innerHeight,
          viewportWidth: window.innerWidth,
          title: document.title || '未命名网页',
        };
        return metrics;
      }
      case 'SCROLL_CAPTURE': {
        if (!pageState) throw new Error('截图状态尚未准备');
        if (cancelledLocally) throw new Error('EXPORT_CANCELLED');
        const index = Number(message.index);
        const scrollY = Number(message.scrollY);
        pageState.applyFrame(index);
        hideOverlay();
        window.scrollTo(0, scrollY);
        await waitForPaint(560);
        return { actualScrollY: window.scrollY };
      }
      case 'SHOW_CAPTURE_PROGRESS':
        showOverlay(
          String(message.message ?? '正在截图…'),
          Number(message.completed ?? 0),
          Number(message.total ?? 0),
        );
        return { ok: true };
      case 'RESTORE_CAPTURE':
        pageState?.restore();
        pageState = null;
        overlayHost?.remove();
        overlayHost = null;
        cancelledLocally = false;
        return { ok: true };
      case 'EXTRACT_MARKDOWN': {
        const article = extractArticle(document, window.location.href);
        return { title: article.title, ...convertArticle(article, new Date()) };
      }
      default:
        return undefined;
    }
  }

  chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
    const supported = new Set([
      'PING',
      'PREPARE_CAPTURE',
      'SCROLL_CAPTURE',
      'SHOW_CAPTURE_PROGRESS',
      'RESTORE_CAPTURE',
      'EXTRACT_MARKDOWN',
    ]);
    if (!supported.has(message.type)) return false;

    void handleMessage(message).then(
      (result) => sendResponse({ ok: true, result }),
      (error: unknown) => sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return true;
  });
}
