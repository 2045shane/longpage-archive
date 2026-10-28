import { createCaptureFrames } from '../capture/plan';
import { sanitizeFilename } from '../shared/filename';
import type {
  CapturedFrame,
  ExportFormat,
  ExportState,
  MarkdownPayload,
  PageMetrics,
  RuntimeMessage,
} from '../shared/messages';
import { ExportSession } from './export-session';

interface MessageResponse<T> {
  ok: boolean;
  result?: T;
  error?: string;
}

class ExportCancelledError extends Error {
  constructor() {
    super('任务已取消');
  }
}

const session = new ExportSession();

function broadcastState(state = session.snapshot()): void {
  void chrome.runtime.sendMessage({ type: 'EXPORT_STATUS', state }).catch(() => undefined);
}

function updateState(completed: number, message: string, total?: number): void {
  session.update(completed, message, total);
  broadcastState();
}

async function sendTab<T>(tabId: number, message: RuntimeMessage): Promise<T> {
  const response = await chrome.tabs.sendMessage(tabId, message) as MessageResponse<T>;
  if (!response?.ok) throw new Error(response?.error || '页面脚本没有响应');
  return response.result as T;
}

async function sendOffscreen<T>(message: RuntimeMessage): Promise<T> {
  const response = await chrome.runtime.sendMessage(message) as MessageResponse<T>;
  if (!response?.ok) throw new Error(response?.error || '离屏处理器没有响应');
  return response.result as T;
}

async function ensureContentScript(tabId: number): Promise<void> {
  try {
    await sendTab(tabId, { type: 'PING' });
  } catch {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
    await sendTab(tabId, { type: 'PING' });
  }
}

async function ensureOffscreenDocument(): Promise<void> {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: [chrome.offscreen.Reason.BLOBS],
    justification: '拼接网页截图并生成本地 PNG、PDF 和 ZIP 文件',
  });
}

function assertSupportedTab(tab: chrome.tabs.Tab): asserts tab is chrome.tabs.Tab & { id: number; url: string } {
  const url = tab.url ?? '';
  const isWebPage = /^https?:\/\//i.test(url);
  const isChromeStore = /^https:\/\/(chromewebstore\.google\.com|chrome\.google\.com\/webstore)/i.test(url);
  if (!tab.id || !isWebPage || isChromeStore) {
    throw new Error('当前页面受 Chrome 限制，无法截图或提取正文');
  }
}

function checkCancelled(): void {
  if (session.isCancelled()) throw new ExportCancelledError();
}

async function handleCapture(tab: chrome.tabs.Tab & { id: number; url: string }, format: 'png' | 'pdf'): Promise<void> {
  let contentReady = false;
  try {
    await ensureContentScript(tab.id);
    contentReady = true;
    updateState(0, '正在预加载页面…');
    const metrics = await sendTab<PageMetrics>(tab.id, { type: 'PREPARE_CAPTURE' });
    checkCancelled();
    const frames = createCaptureFrames(metrics.pageHeight, metrics.viewportHeight);
    updateState(0, `准备捕获 ${frames.length} 屏`, frames.length);
    const capturedFrames: CapturedFrame[] = [];

    for (let index = 0; index < frames.length; index += 1) {
      checkCancelled();
      const frame = frames[index]!;
      await sendTab(tab.id, { type: 'SCROLL_CAPTURE', index, scrollY: frame.scrollY });
      checkCancelled();
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
      capturedFrames.push({ ...frame, dataUrl });
      const completed = index + 1;
      const message = `正在捕获第 ${completed}/${frames.length} 屏`;
      updateState(completed, message, frames.length);
      await sendTab(tab.id, {
        type: 'SHOW_CAPTURE_PROGRESS',
        completed,
        total: frames.length,
        message,
      });
    }

    checkCancelled();
    updateState(frames.length, format === 'pdf' ? '正在生成 PDF…' : '正在拼接长图…');
    await ensureOffscreenDocument();
    const rendered = await sendOffscreen<{ url: string }>({
      type: 'RENDER_CAPTURE',
      format,
      frames: capturedFrames,
      pageHeight: metrics.pageHeight,
      viewportHeight: metrics.viewportHeight,
      viewportWidth: metrics.viewportWidth,
    });
    checkCancelled();
    await chrome.downloads.download({
      url: rendered.url,
      filename: `${sanitizeFilename(metrics.title)}.${format}`,
      saveAs: true,
    });
  } finally {
    if (contentReady) {
      await sendTab(tab.id, { type: 'RESTORE_CAPTURE' }).catch(() => undefined);
    }
  }
}

async function handleMarkdown(
  tab: chrome.tabs.Tab & { id: number; url: string },
  format: 'markdown' | 'markdown-zip',
): Promise<void> {
  await ensureContentScript(tab.id);
  updateState(0, '正在识别网页正文…');
  const payload = await sendTab<MarkdownPayload>(tab.id, { type: 'EXTRACT_MARKDOWN' });
  checkCancelled();
  await ensureOffscreenDocument();
  const safeTitle = sanitizeFilename(payload.title);

  if (format === 'markdown') {
    const result = await sendOffscreen<{ url: string }>({
      type: 'CREATE_TEXT_DOWNLOAD',
      text: payload.quickMarkdown,
      mimeType: 'text/markdown;charset=utf-8',
    });
    checkCancelled();
    await chrome.downloads.download({ url: result.url, filename: `${safeTitle}.md`, saveAs: true });
    return;
  }

  updateState(0, `正在保存 ${payload.assets.length} 张正文图片…`);
  const result = await sendOffscreen<{ url: string; failedCount: number }>({
    type: 'BUILD_MARKDOWN_ZIP',
    markdown: payload.offlineMarkdown,
    markdownFilename: `${safeTitle}.md`,
    assets: payload.assets,
  });
  checkCancelled();
  await chrome.downloads.download({ url: result.url, filename: `${safeTitle}-Markdown.zip`, saveAs: true });
}

async function runExport(format: ExportFormat): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) throw new Error('没有找到当前网页');
    assertSupportedTab(tab);
    if (format === 'png' || format === 'pdf') {
      await handleCapture(tab, format);
    } else {
      await handleMarkdown(tab, format);
    }
    const finalState: ExportState = {
      ...session.snapshot(),
      active: false,
      completed: session.snapshot().total,
      message: '导出文件已交给 Chrome 下载',
    };
    broadcastState(finalState);
  } catch (error) {
    const message = error instanceof ExportCancelledError || (error instanceof Error && error.message === 'EXPORT_CANCELLED')
      ? '任务已取消，页面已恢复'
      : `导出失败：${error instanceof Error ? error.message : String(error)}`;
    broadcastState({ ...session.snapshot(), active: false, message });
  } finally {
    session.finish();
  }
}

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  switch (message.type) {
    case 'START_EXPORT': {
      try {
        const format = message.format as ExportFormat;
        if (!['png', 'pdf', 'markdown', 'markdown-zip'].includes(format)) {
          throw new Error('未知导出格式');
        }
        session.begin(format);
        broadcastState();
        void runExport(format);
        sendResponse({ ok: true });
      } catch (error) {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
      }
      return false;
    }
    case 'CANCEL_EXPORT':
      session.cancel();
      broadcastState();
      sendResponse({ ok: true });
      return false;
    case 'GET_EXPORT_STATE':
      sendResponse({ ok: true, result: session.snapshot() });
      return false;
    default:
      return false;
  }
});
