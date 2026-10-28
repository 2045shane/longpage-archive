# 长页存档 / LongPage Archive

一款本地运行的 Chrome 扩展，可把完整网页导出为 PNG 长图、A4 分页 PDF、可编辑 Markdown，或带本地图片的离线 Markdown ZIP。

A local-first Chrome extension that exports a full webpage as a PNG, paginated A4 PDF, editable Markdown, or an offline Markdown ZIP with local images.

[中文使用说明](docs/USER_GUIDE.zh-CN.md) · [English User Guide](docs/USER_GUIDE.en.md) · [隐私与 API 政策 / Privacy & API Policy](PRIVACY.md)

## 主要功能 / Features

- PNG 完整长图 / Full-page PNG screenshot
- A4 分页 PDF / Paginated A4 PDF
- 快速 Markdown（保留网络图片地址）/ Quick Markdown with remote image URLs
- 离线 Markdown ZIP（`.md` + `assets/`）/ Offline Markdown ZIP (`.md` + `assets/`)
- 智能识别正文，失败时自动回退 / Smart article extraction with fallback
- 截图后恢复滚动位置、固定元素和滚动条 / Restores page state after capture

## 快速安装 / Quick Install

### 普通用户 / For users

1. 下载 [longpage-archive-v0.1.0.zip](https://github.com/2045shane/longpage-archive/raw/refs/heads/main/release/longpage-archive-v0.1.0.zip) 并解压。
2. 在 Chrome 地址栏打开 `chrome://extensions/`。
3. 开启右上角“开发者模式”。
4. 点击“加载已解压的扩展程序”，选择刚解压的文件夹。

1. Download [longpage-archive-v0.1.0.zip](https://github.com/2045shane/longpage-archive/raw/refs/heads/main/release/longpage-archive-v0.1.0.zip) and unzip it.
2. Open `chrome://extensions/` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the extracted folder.

### 开发者 / For developers

需要 Node.js 20+ 和 Chrome 116+。

Requires Node.js 20+ and Chrome 116+.

```bash
npm install
npm run build
```

然后在 `chrome://extensions/` 中加载本项目的 `dist` 文件夹。

Then load the project's `dist` folder from `chrome://extensions/`.

## 使用 / Usage

打开普通 HTTP/HTTPS 网页，点击工具栏中的“长页存档”，再选择所需格式。长截图过程中，页面右下角会显示进度和取消按钮。

Open a regular HTTP/HTTPS webpage, click **长页存档** in the Chrome toolbar, and choose an export format. A progress panel with a cancel button appears during long captures.

## API 与隐私 / API & Privacy

当前版本**不使用任何 AI 或第三方 API，也不需要 API Key**。网页处理、截图拼接、PDF 和 Markdown 生成均在用户浏览器本地完成，不会上传到开发者服务器。

This version **uses no AI or third-party API and requires no API key**. Page processing, image stitching, PDF generation, and Markdown conversion all run locally in the user's browser. Nothing is uploaded to a developer-operated server.

如未来加入需要 API 的可选功能，将采用用户自带密钥（BYOK），不会内置或使用开发者个人 API Key。

If an optional API-powered feature is added in the future, it will use a bring-your-own-key (BYOK) model. No developer personal API key will be embedded or used.

## 权限 / Permissions

- `activeTab` / `scripting`：仅在用户点击扩展后处理当前页面。
- `downloads`：保存导出文件。
- `offscreen`：在不可见页面中拼接图片、生成 PDF 和 ZIP。
- `storage`：保存扩展运行所需的本地状态。
- 可选 HTTP/HTTPS 站点权限：仅在首次使用离线 Markdown ZIP 时申请，用于下载正文图片。

The extension uses `activeTab`, `scripting`, `downloads`, `offscreen`, and `storage`. Optional HTTP/HTTPS site access is requested only when the user first exports an offline Markdown ZIP, so article images can be downloaded.

## 已知限制 / Known Limitations

- 不支持 `chrome://`、浏览器设置页、扩展页和 Chrome 应用商店页面。
- Markdown 不提取跨域 iframe 内的可编辑正文，但 iframe 的可见画面可进入截图。
- PNG 上限为单边 32,767 像素且总计 120,000,000 像素。
- 登录态、防盗链或失效资源可能导致部分离线图片下载失败；失败项会保留网络地址并写入清单。
- PDF 由长图分页生成，文字不可选择。

- Chrome internal pages, extension pages, settings pages, and the Chrome Web Store are not supported.
- Editable Markdown content inside cross-origin iframes cannot be extracted, although visible iframe content may appear in screenshots.
- PNG output is limited to 32,767 pixels per side and 120,000,000 total pixels.
- Authentication, hotlink protection, or expired resources may prevent some offline images from downloading; failed items keep their original URL and are listed in the ZIP.
- PDF pages are image-based, so text is not selectable.

## 开发与验证 / Development & Verification

```bash
npm test
npm run typecheck
npm run build
```

设计与实施记录 / Design and implementation records:

- `docs/superpowers/specs/2026-08-27-longshot-extension-design.md`
- `docs/superpowers/plans/2026-08-27-longshot-extension.md`
