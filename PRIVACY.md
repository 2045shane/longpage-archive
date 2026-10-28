# 隐私与 API 政策 / Privacy & API Policy

## 中文

“长页存档”采用本地优先设计。

- 当前版本不使用任何 AI API、云端转换 API 或分析服务。
- 当前版本不需要 API Key，也不会内置、上传或共享开发者个人 API Key。
- 网页正文提取、截图拼接、PDF 生成、Markdown 转换和 ZIP 打包均在用户浏览器本地完成。
- 插件不运营数据接收服务器，不会主动上传用户访问的网页内容或导出文件。
- 快速 Markdown 保留原网页图片地址；打开导出的 Markdown 时，阅读软件可能自行加载这些远程图片。
- 离线 Markdown 会在用户授权后直接从原网页图片地址下载资源。请求可能携带该网站现有的浏览器登录状态，具体取决于网站设置。
- 如果未来增加需要外部 API 的可选功能，将采用用户自带密钥（BYOK）：由用户自行申请、填写和承担用量；不会使用开发者个人 API Key。

## English

LongPage Archive follows a local-first design.

- The current version uses no AI API, cloud conversion API, or analytics service.
- The current version requires no API key and does not embed, upload, or share a developer's personal API key.
- Article extraction, screenshot stitching, PDF generation, Markdown conversion, and ZIP packaging run locally in the user's browser.
- The extension operates no data collection server and does not intentionally upload visited page content or exported files.
- Quick Markdown preserves the source page's remote image URLs. A Markdown reader may load those images when the exported file is opened.
- With user permission, offline Markdown downloads resources directly from the source page's image URLs. Depending on the website, requests may use the browser's existing authenticated session.
- If an optional external-API feature is added in the future, it will use a bring-your-own-key (BYOK) model. Users will obtain, enter, and pay for their own key; no developer personal API key will be used.
