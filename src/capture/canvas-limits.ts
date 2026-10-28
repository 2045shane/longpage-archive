export const MAX_CANVAS_DIMENSION = 32_767;
export const MAX_CANVAS_PIXELS = 120_000_000;

export class CanvasLimitError extends Error {
  constructor(width: number, height: number) {
    super(`网页过长，生成画布 ${width}×${height} 超出浏览器安全限制`);
    this.name = 'CanvasLimitError';
  }
}

export function assertCanvasSize(width: number, height: number): void {
  const invalidDimension =
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0 ||
    width > MAX_CANVAS_DIMENSION ||
    height > MAX_CANVAS_DIMENSION;

  if (invalidDimension || width * height > MAX_CANVAS_PIXELS) {
    throw new CanvasLimitError(width, height);
  }
}
