export interface HistoryState {
  code: string;
  selectedTemplateId: string;
  timestamp: number;
  description: string;
}

export class LatexHistoryManager {
  private stack: HistoryState[] = [];
  private index: number = -1;
  private maxHistory: number = 50;

  constructor(initialCode: string = '', initialTemplateId: string = '') {
    this.push(initialCode, initialTemplateId, 'Initial state');
  }

  public push(code: string, selectedTemplateId: string, description: string = 'Edit'): void {
    // Don't push identical states consecutively
    if (this.index >= 0 && this.stack[this.index].code === code && this.stack[this.index].selectedTemplateId === selectedTemplateId) {
      return;
    }

    // Trim redo stack if we edit after undoing
    if (this.index < this.stack.length - 1) {
      this.stack = this.stack.slice(0, this.index + 1);
    }

    this.stack.push({
      code,
      selectedTemplateId,
      timestamp: Date.now(),
      description,
    });

    if (this.stack.length > this.maxHistory) {
      this.stack.shift();
    } else {
      this.index++;
    }
  }

  public canUndo(): boolean {
    return this.index > 0;
  }

  public canRedo(): boolean {
    return this.index < this.stack.length - 1;
  }

  public undo(): HistoryState | null {
    if (!this.canUndo()) return null;
    this.index--;
    return this.stack[this.index];
  }

  public redo(): HistoryState | null {
    if (!this.canRedo()) return null;
    this.index++;
    return this.stack[this.index];
  }

  public getCurrent(): HistoryState | null {
    if (this.index >= 0 && this.index < this.stack.length) {
      return this.stack[this.index];
    }
    return null;
  }
}
