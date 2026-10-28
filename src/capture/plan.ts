export interface CaptureFrame {
  scrollY: number;
  cropTop: number;
  captureHeight: number;
}

export function createCaptureFrames(pageHeight: number, viewportHeight: number): CaptureFrame[] {
  if (!Number.isFinite(pageHeight) || pageHeight <= 0) {
    throw new Error('页面高度必须大于 0');
  }
  if (!Number.isFinite(viewportHeight) || viewportHeight <= 0) {
    throw new Error('视口高度必须大于 0');
  }

  const safePageHeight = Math.ceil(pageHeight);
  const safeViewportHeight = Math.ceil(viewportHeight);
  const maxScrollY = Math.max(0, safePageHeight - safeViewportHeight);
  const positions: number[] = [];

  for (let scrollY = 0; scrollY < maxScrollY; scrollY += safeViewportHeight) {
    positions.push(scrollY);
  }
  if (positions.at(-1) !== maxScrollY) {
    positions.push(maxScrollY);
  }

  let capturedBottom = 0;
  return positions.map((scrollY) => {
    const cropTop = Math.max(0, capturedBottom - scrollY);
    const captureHeight = Math.min(
      safeViewportHeight - cropTop,
      safePageHeight - scrollY - cropTop,
    );
    capturedBottom = scrollY + cropTop + captureHeight;
    return { scrollY, cropTop, captureHeight };
  });
}
