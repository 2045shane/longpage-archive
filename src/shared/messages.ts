import type { CaptureFrame } from '../capture/plan';
import type { AssetPlanItem } from '../markdown/assets';

export type ExportFormat = 'png' | 'pdf' | 'markdown' | 'markdown-zip';

export interface ExportState {
  active: boolean;
  cancelled: boolean;
  completed: number;
  total: number;
  message: string;
  format: ExportFormat | null;
}

export interface PageMetrics {
  pageHeight: number;
  viewportHeight: number;
  viewportWidth: number;
  title: string;
}

export interface CapturedFrame extends CaptureFrame {
  dataUrl: string;
}

export interface MarkdownPayload {
  title: string;
  quickMarkdown: string;
  offlineMarkdown: string;
  assets: AssetPlanItem[];
}

export interface RuntimeMessage {
  type: string;
  [key: string]: unknown;
}
