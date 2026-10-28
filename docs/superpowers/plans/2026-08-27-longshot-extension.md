# 网页长截图与 Markdown 导出扩展 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个本地可安装的 Chrome Manifest V3 扩展，导出 PNG 长图、截图式分页 PDF、快速 Markdown 和离线 Markdown ZIP。

**Architecture:** 内容脚本负责页面状态与正文，后台 Service Worker 串联任务，离屏文档负责 Canvas、PDF 和 ZIP 等需要 DOM/Blob 的处理。可测试的规划、限制、命名和转换逻辑放在独立纯函数模块中，Chrome API 只存在于运行时入口。

**Tech Stack:** TypeScript、Chrome Extensions Manifest V3、esbuild、Vitest、JSDOM、Mozilla Readability、Turndown、JSZip、jsPDF

**Spec:** `docs/superpowers/specs/2026-08-27-longshot-extension-design.md`

## Global Constraints

- 支持 Chrome 116 及以上版本。
- 页面内容只在本机处理，不使用服务端接口。
- 仅在用户点击离线包时申请可选的 HTTP/HTTPS 全站图片读取权限。
- PNG 画布边长不超过 32,767 像素且总像素不超过 120,000,000。
- 用户可见界面、状态与错误使用中文。
- `dist/` 为构建产物，不提交到源码结构设计中。

## File Map

- `package.json`, `tsconfig.json`, `vitest.config.ts`, `scripts/build.mjs`: 依赖、类型检查、测试与多入口构建。
- `public/manifest.json`, `public/popup.html`, `public/offscreen.html`: Manifest V3 和静态入口。
- `src/shared/messages.ts`, `src/shared/filename.ts`: 消息契约与安全文件名。
- `src/capture/plan.ts`, `src/capture/pdf-layout.ts`, `src/capture/canvas-limits.ts`: 截图计算纯函数。
- `src/markdown/article.ts`, `src/markdown/convert.ts`, `src/markdown/assets.ts`: 正文与 Markdown 处理。
- `src/runtime/content.ts`, `src/runtime/background.ts`, `src/runtime/offscreen.ts`: 三个扩展运行时。
- `src/ui/popup.ts`, `src/ui/popup.css`: 中文弹窗。
- `tests/*.test.ts`: 纯函数和 JSDOM 行为测试。
- `README.md`, `.gitignore`: 安装、使用、限制和仓库忽略项。

---

### Task 1: 工程基础与截图规划

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `scripts/build.mjs`
- Create: `public/manifest.json`, `public/popup.html`, `public/offscreen.html`
- Create: `src/capture/plan.ts`, `src/capture/pdf-layout.ts`, `src/capture/canvas-limits.ts`
- Test: `tests/capture-plan.test.ts`, `tests/pdf-layout.test.ts`, `tests/canvas-limits.test.ts`

**Interfaces:**
- Produces: `createCaptureFrames(pageHeight, viewportHeight): CaptureFrame[]`
- Produces: `createPdfSlices(totalHeight, width, pageRatio): PdfSlice[]`
- Produces: `assertCanvasSize(width, height): void`

- [ ] 先写测试：页面高度 2,500、视口 1,000 时帧应为 `0/1000/1500`，最后一帧裁掉顶部 500；PDF 切片覆盖全部像素且无重叠；越过任一画布限制时抛出 `CanvasLimitError`。
- [ ] 运行 `npm test -- tests/capture-plan.test.ts tests/pdf-layout.test.ts tests/canvas-limits.test.ts`，确认因模块缺失而失败。
- [ ] 写最小实现，让帧、分页和限制测试通过。
- [ ] 运行同一测试命令确认通过，再运行 `npm run typecheck`。

### Task 2: 正文识别与 Markdown 转换

**Files:**
- Create: `src/shared/filename.ts`
- Create: `src/markdown/article.ts`, `src/markdown/convert.ts`, `src/markdown/assets.ts`
- Test: `tests/filename.test.ts`, `tests/article.test.ts`, `tests/markdown.test.ts`, `tests/assets.test.ts`

**Interfaces:**
- Produces: `extractArticle(document, sourceUrl): ExtractedArticle`
- Produces: `convertArticle(article, capturedAt): MarkdownExport`
- Produces: `buildAssetPlan(imageUrls): AssetPlanItem[]`
- Produces: `restoreFailedAssetLinks(markdown, failedAssets): string`

- [ ] 先写测试：Readability 提取 `article` 而排除 `nav`；回退正文仍可转换；Markdown 含 YAML、表格、代码块和绝对 URL；重复图片只生成一个安全资源名；失败资源恢复原 URL。
- [ ] 运行 `npm test -- tests/filename.test.ts tests/article.test.ts tests/markdown.test.ts tests/assets.test.ts`，确认因模块缺失而失败。
- [ ] 写最小实现并保持 HTML 克隆、不修改输入文档。
- [ ] 运行同一测试命令确认通过，再运行全部 `npm test`。

### Task 3: 页面运行时与可恢复捕获状态

**Files:**
- Create: `src/shared/messages.ts`
- Create: `src/runtime/content.ts`
- Test: `tests/content-state.test.ts`

**Interfaces:**
- Consumes: `extractArticle`, `convertArticle`, `buildAssetPlan`
- Produces message handlers: `PING`, `PREPARE_CAPTURE`, `SCROLL_CAPTURE`, `SHOW_CAPTURE_PROGRESS`, `RESTORE_CAPTURE`, `EXTRACT_MARKDOWN`

- [ ] 先写测试工具化页面状态对象，验证固定元素从第二帧隐藏、恢复后内联样式和滚动位置与开始前一致、重复恢复无副作用。
- [ ] 运行 `npm test -- tests/content-state.test.ts`，确认缺少实现导致失败。
- [ ] 实现页面状态控制、预滚动、覆盖层、取消消息和正文提取消息。
- [ ] 运行内容状态测试和全部 `npm test`。

### Task 4: 离屏导出与后台协调

**Files:**
- Create: `src/runtime/offscreen.ts`
- Create: `src/runtime/background.ts`
- Test: `tests/offline-package.test.ts`

**Interfaces:**
- Consumes: `CaptureFrame[]`, `PdfSlice[]`, `assertCanvasSize`, `AssetPlanItem[]`
- Produces offscreen handlers: `RENDER_CAPTURE`, `CREATE_TEXT_DOWNLOAD`, `BUILD_MARKDOWN_ZIP`
- Produces background handlers: `START_EXPORT`, `CANCEL_EXPORT`, `GET_EXPORT_STATE`

- [ ] 先写离线包测试：两张成功图片进入 `assets/`，失败图片写入失败清单且 Markdown 恢复原 URL。
- [ ] 运行 `npm test -- tests/offline-package.test.ts`，确认缺少实现导致失败。
- [ ] 实现离屏 Canvas 拼接、PNG Blob、A4 PDF、Markdown Blob 和 ZIP；所有 Blob URL 延迟回收。
- [ ] 实现后台单任务互斥、内容脚本注入、逐帧截图、状态广播、下载与 `finally` 恢复。
- [ ] 运行全部测试、`npm run typecheck` 和 `npm run build`。

### Task 5: 中文弹窗与本地交付说明

**Files:**
- Create: `src/ui/popup.ts`, `src/ui/popup.css`
- Create: `README.md`, `.gitignore`
- Modify: `public/popup.html`

**Interfaces:**
- Consumes messages: `START_EXPORT`, `CANCEL_EXPORT`, `GET_EXPORT_STATE`, `EXPORT_STATUS`
- Requests optional origins: `http://*/*`, `https://*/*`

- [ ] 实现当前页面状态、四个导出入口、进度、错误、取消和离线权限申请。
- [ ] 在 README 写明 `npm install`、`npm run build`、加载 `dist/`、四种导出方式和已知限制。
- [ ] 运行 `npm test`、`npm run typecheck`、`npm run build` 并检查 `dist/manifest.json` 与全部入口文件存在。

### Task 6: 浏览器烟测与交付核验

**Files:**
- Verify: `dist/`
- Verify: `README.md`

**Interfaces:**
- Consumes: 构建后的 Chrome 扩展目录和本地长页面夹具。

- [ ] 使用真实 Chrome 加载 `dist/`，确认 Manifest 无错误且弹窗四个按钮可见。
- [ ] 对本地长页面执行 PNG 与快速 Markdown 导出，核对文件存在、PNG 可解码、Markdown 含正文和来源。
- [ ] 重新运行 `npm test && npm run typecheck && npm run build`，以最新输出作为交付证据。
- [ ] 对照规格逐项检查，明确报告任何未验证的浏览器边界。
