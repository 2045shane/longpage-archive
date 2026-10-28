import type { ExportFormat, ExportState } from '../shared/messages';

const EMPTY_STATE: ExportState = {
  active: false,
  cancelled: false,
  completed: 0,
  total: 0,
  message: '',
  format: null,
};

export class ExportSession {
  private state: ExportState = { ...EMPTY_STATE };

  begin(format: ExportFormat, total = 0): void {
    if (this.state.active) {
      throw new Error('已有导出任务正在执行');
    }
    this.state = {
      active: true,
      cancelled: false,
      completed: 0,
      total,
      message: '正在准备…',
      format,
    };
  }

  update(completed: number, message: string, total = this.state.total): void {
    if (!this.state.active) {
      return;
    }
    this.state = { ...this.state, completed, total, message };
  }

  cancel(): void {
    if (this.state.active) {
      this.state = { ...this.state, cancelled: true, message: '正在取消…' };
    }
  }

  isCancelled(): boolean {
    return this.state.cancelled;
  }

  snapshot(): ExportState {
    return { ...this.state };
  }

  finish(): void {
    this.state = { ...EMPTY_STATE };
  }
}
