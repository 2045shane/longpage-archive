import type { ExportFormat, ExportState, RuntimeMessage } from '../shared/messages';

const titleElement = document.querySelector<HTMLElement>('#page-title')!;
const statusPanel = document.querySelector<HTMLElement>('#status-panel')!;
const statusText = document.querySelector<HTMLElement>('#status-text')!;
const statusPercent = document.querySelector<HTMLElement>('#status-percent')!;
const progressBar = document.querySelector<HTMLElement>('#progress-bar')!;
const cancelButton = document.querySelector<HTMLButtonElement>('#cancel-button')!;
const notice = document.querySelector<HTMLElement>('#notice')!;
const actionButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-format]')];

function isSupportedUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) &&
    !/^https:\/\/(chromewebstore\.google\.com|chrome\.google\.com\/webstore)/i.test(url);
}

function setNotice(message: string, kind: 'normal' | 'error' | 'success' = 'normal'): void {
  notice.textContent = message;
  notice.className = `notice${kind === 'normal' ? '' : ` notice--${kind}`}`;
}

function renderState(state: ExportState): void {
  actionButtons.forEach((button) => { button.disabled = state.active; });
  statusPanel.hidden = !state.active && !state.message;
  statusText.textContent = state.message || '等待任务';
  const percent = state.total > 0 ? Math.round((state.completed / state.total) * 100) : 0;
  statusPercent.textContent = state.total > 0 ? `${percent}%` : '';
  progressBar.style.width = `${percent}%`;
  cancelButton.hidden = !state.active;
  if (!state.active && state.message) {
    setNotice(state.message, state.message.startsWith('导出失败') ? 'error' : 'success');
  }
}

async function requestOfflinePermission(): Promise<boolean> {
  return chrome.permissions.request({ origins: ['http://*/*', 'https://*/*'] });
}

async function startExport(format: ExportFormat): Promise<void> {
  if (format === 'markdown-zip') {
    const granted = await requestOfflinePermission();
    if (!granted) {
      setNotice('未获得图片访问权限，可改用“快速 Markdown”。', 'error');
      return;
    }
  }

  const response = await chrome.runtime.sendMessage({ type: 'START_EXPORT', format }) as {
    ok: boolean;
    error?: string;
  };
  if (!response?.ok) {
    setNotice(response?.error || '无法启动导出任务', 'error');
  }
}

for (const button of actionButtons) {
  button.addEventListener('click', () => {
    const format = button.dataset.format as ExportFormat;
    void startExport(format).catch((error: unknown) => {
      setNotice(error instanceof Error ? error.message : String(error), 'error');
    });
  });
}

cancelButton.addEventListener('click', () => {
  void chrome.runtime.sendMessage({ type: 'CANCEL_EXPORT' });
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage) => {
  if (message.type === 'EXPORT_STATUS') {
    renderState(message.state as ExportState);
  }
  return false;
});

void (async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  titleElement.textContent = tab?.title || '未命名网页';
  if (!tab?.url || !isSupportedUrl(tab.url)) {
    actionButtons.forEach((button) => { button.disabled = true; });
    setNotice('当前页面受 Chrome 限制，无法导出。', 'error');
    return;
  }
  const response = await chrome.runtime.sendMessage({ type: 'GET_EXPORT_STATE' }) as {
    ok: boolean;
    result?: ExportState;
  };
  if (response?.result) renderState(response.result);
})().catch((error: unknown) => {
  setNotice(error instanceof Error ? error.message : String(error), 'error');
});
