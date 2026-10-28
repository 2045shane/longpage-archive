import { describe, expect, it } from 'vitest';
import { ExportSession } from '../src/runtime/export-session';

describe('ExportSession', () => {
  it('prevents a second export while one is active', () => {
    const session = new ExportSession();

    session.begin('png', 8);

    expect(() => session.begin('pdf', 4)).toThrow('已有导出任务正在执行');
  });

  it('tracks progress, cancellation and reset as user-visible state', () => {
    const session = new ExportSession();

    session.begin('png', 5);
    session.update(2, '正在捕获第 2/5 屏');
    expect(session.snapshot()).toMatchObject({
      active: true,
      cancelled: false,
      completed: 2,
      total: 5,
      message: '正在捕获第 2/5 屏',
    });

    session.cancel();
    expect(session.isCancelled()).toBe(true);

    session.finish();
    expect(session.snapshot()).toEqual({
      active: false,
      cancelled: false,
      completed: 0,
      total: 0,
      message: '',
      format: null,
    });
  });
});
