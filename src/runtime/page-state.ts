export interface ScrollWindow {
  innerHeight: number;
  innerWidth: number;
  scrollX: number;
  scrollY: number;
  getComputedStyle(element: Element): CSSStyleDeclaration;
  scrollTo(x: number, y: number): void;
}

interface ElementStyleSnapshot {
  element: HTMLElement;
  styleAttribute: string | null;
}

function restoreStyle(element: HTMLElement, styleAttribute: string | null): void {
  if (styleAttribute === null) {
    element.removeAttribute('style');
  } else {
    element.setAttribute('style', styleAttribute);
  }
}

export class CapturePageState {
  private active = false;
  private fixedElements: ElementStyleSnapshot[] = [];
  private originalRootStyle: string | null = null;
  private originalScroll = { x: 0, y: 0 };
  private scrollbarStyle: HTMLStyleElement | null = null;

  constructor(
    private readonly document: Document,
    private readonly scrollingWindow: ScrollWindow,
  ) {}

  prepare(): void {
    if (this.active) {
      return;
    }

    this.originalScroll = {
      x: this.scrollingWindow.scrollX,
      y: this.scrollingWindow.scrollY,
    };
    this.originalRootStyle = this.document.documentElement.getAttribute('style');
    this.document.documentElement.style.scrollBehavior = 'auto';
    this.scrollbarStyle = this.document.createElement('style');
    this.scrollbarStyle.dataset.longshotScrollbarStyle = 'true';
    this.scrollbarStyle.textContent = `
      html, body { scrollbar-width: none !important; -ms-overflow-style: none !important; }
      html::-webkit-scrollbar, body::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }
    `;
    (this.document.head ?? this.document.documentElement).append(this.scrollbarStyle);
    this.fixedElements = [...this.document.querySelectorAll<HTMLElement>('body *')]
      .filter((element) => {
        const position = this.scrollingWindow.getComputedStyle(element).position;
        return position === 'fixed' || position === 'sticky';
      })
      .map((element) => ({
        element,
        styleAttribute: element.getAttribute('style'),
      }));
    this.active = true;
  }

  applyFrame(index: number): void {
    if (!this.active) {
      throw new Error('截图状态尚未准备');
    }

    for (const snapshot of this.fixedElements) {
      restoreStyle(snapshot.element, snapshot.styleAttribute);
      if (index > 0) {
        snapshot.element.style.visibility = 'hidden';
      }
    }
  }

  restore(): void {
    if (!this.active) {
      return;
    }

    for (const snapshot of this.fixedElements) {
      restoreStyle(snapshot.element, snapshot.styleAttribute);
    }
    if (this.originalRootStyle === null) {
      this.document.documentElement.removeAttribute('style');
    } else {
      this.document.documentElement.setAttribute('style', this.originalRootStyle);
    }
    this.scrollingWindow.scrollTo(this.originalScroll.x, this.originalScroll.y);
    this.scrollbarStyle?.remove();
    this.scrollbarStyle = null;
    this.fixedElements = [];
    this.active = false;
  }
}
