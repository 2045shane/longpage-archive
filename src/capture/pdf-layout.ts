export interface PdfSlice {
  sourceY: number;
  sourceHeight: number;
}

const A4_PORTRAIT_RATIO = 297 / 210;

export function createPdfSlices(
  totalHeight: number,
  width: number,
  pageRatio = A4_PORTRAIT_RATIO,
): PdfSlice[] {
  if (totalHeight <= 0 || width <= 0 || pageRatio <= 0) {
    throw new Error('PDF 分页尺寸必须大于 0');
  }

  const pageHeight = Math.max(1, Math.floor(width * pageRatio));
  const slices: PdfSlice[] = [];
  for (let sourceY = 0; sourceY < totalHeight; sourceY += pageHeight) {
    slices.push({
      sourceY,
      sourceHeight: Math.min(pageHeight, totalHeight - sourceY),
    });
  }
  return slices;
}
