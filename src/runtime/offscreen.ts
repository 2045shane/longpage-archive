import { jsPDF } from 'jspdf';
import { assertCanvasSize } from '../capture/canvas-limits';
import { createPdfSlices } from '../capture/pdf-layout';
import { buildOfflinePackage } from '../markdown/offline-package';
import type { CapturedFrame, ExportFormat, RuntimeMessage } from '../shared/messages';

interface RenderRequest extends RuntimeMessage {
  type: 'RENDER_CAPTURE';
  format: ExportFormat;
  frames: CapturedFrame[];
  pageHeight: number;
  viewportHeight: number;
  viewportWidth: number;
}

function blobUrl(blob: Blob): string {
  const url = URL.createObjectURL(blob);
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
  return url;
}

async function decodeImage(dataUrl: string): Promise<ImageBitmap> {
  const response = await fetch(dataUrl);
  return createImageBitmap(await response.blob());
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('浏览器未能编码导出图片'));
    }, type, quality);
  });
}

async function stitchCapture(request: RenderRequest): Promise<HTMLCanvasElement> {
  const firstFrame = request.frames[0];
  if (!firstFrame) throw new Error('没有收到截图帧');
  const firstBitmap = await decodeImage(firstFrame.dataUrl);
  const scaleX = firstBitmap.width / request.viewportWidth;
  const scaleY = firstBitmap.height / request.viewportHeight;
  const outputWidth = Math.round(request.viewportWidth * scaleX);
  const outputHeight = Math.round(request.pageHeight * scaleY);
  assertCanvasSize(outputWidth, outputHeight);

  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('浏览器无法创建图片画布');

  for (let index = 0; index < request.frames.length; index += 1) {
    const frame = request.frames[index]!;
    const bitmap = index === 0 ? firstBitmap : await decodeImage(frame.dataUrl);
    const sourceY = Math.round(frame.cropTop * scaleY);
    const sourceHeight = Math.min(
      bitmap.height - sourceY,
      Math.round(frame.captureHeight * scaleY),
    );
    const destinationY = Math.round((frame.scrollY + frame.cropTop) * scaleY);
    context.drawImage(
      bitmap,
      0,
      sourceY,
      bitmap.width,
      sourceHeight,
      0,
      destinationY,
      outputWidth,
      sourceHeight,
    );
    bitmap.close();
  }
  return canvas;
}

async function renderPdf(canvas: HTMLCanvasElement): Promise<Blob> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const slices = createPdfSlices(canvas.height, canvas.width);

  for (let index = 0; index < slices.length; index += 1) {
    const slice = slices[index]!;
    if (index > 0) pdf.addPage('a4', 'portrait');
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = slice.sourceHeight;
    const pageContext = pageCanvas.getContext('2d');
    if (!pageContext) throw new Error('浏览器无法创建 PDF 分页画布');
    pageContext.drawImage(
      canvas,
      0,
      slice.sourceY,
      canvas.width,
      slice.sourceHeight,
      0,
      0,
      canvas.width,
      slice.sourceHeight,
    );
    const image = pageCanvas.toDataURL('image/jpeg', 0.92);
    const renderedHeight = 210 * (slice.sourceHeight / canvas.width);
    pdf.addImage(image, 'JPEG', 0, 0, 210, renderedHeight, undefined, 'FAST');
  }
  return pdf.output('blob');
}

async function handleOffscreenMessage(message: RuntimeMessage): Promise<unknown> {
  switch (message.type) {
    case 'RENDER_CAPTURE': {
      const request = message as RenderRequest;
      const canvas = await stitchCapture(request);
      const blob = request.format === 'pdf'
        ? await renderPdf(canvas)
        : await canvasToBlob(canvas, 'image/png');
      return { url: blobUrl(blob) };
    }
    case 'CREATE_TEXT_DOWNLOAD': {
      const blob = new Blob([String(message.text ?? '')], {
        type: String(message.mimeType ?? 'text/plain;charset=utf-8'),
      });
      return { url: blobUrl(blob) };
    }
    case 'BUILD_MARKDOWN_ZIP': {
      const result = await buildOfflinePackage(
        String(message.markdown ?? ''),
        String(message.markdownFilename ?? '未命名网页.md'),
        message.assets as never,
      );
      return {
        url: blobUrl(new Blob([result.bytes as BlobPart], { type: 'application/zip' })),
        failedCount: result.failedAssets.length,
      };
    }
    default:
      return undefined;
  }
}

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  const supported = new Set(['RENDER_CAPTURE', 'CREATE_TEXT_DOWNLOAD', 'BUILD_MARKDOWN_ZIP']);
  if (!supported.has(message.type)) return false;
  void handleOffscreenMessage(message).then(
    (result) => sendResponse({ ok: true, result }),
    (error: unknown) => sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  return true;
});
