export interface FocusModeState {
  isRunning: boolean;
  remaining: number;
  size: { width: number; height: number };
  position: { x: number; y: number };
  session: { id: string; name: string; total: number } | null;
}

const STORAGE_KEY = 'focus_mode_state';

const DEFAULT_STATE: FocusModeState = {
  isRunning: false,
  remaining: 1800,
  size: { width: 360, height: 220 },
  position: { x: 100, y: 100 },
  session: null,
};

export const focusModeStorage = {
  get(): FocusModeState {
    if (typeof window === 'undefined') return DEFAULT_STATE;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // Compute default bottom-right position based on viewport
        const defaultX = window.innerWidth - 380;
        const defaultY = window.innerHeight - 240;
        return {
          ...DEFAULT_STATE,
          position: { x: Math.max(20, defaultX), y: Math.max(20, defaultY) },
        };
      }
      const parsed = JSON.parse(stored);
      // Validate structure
      return {
        isRunning: !!parsed.isRunning,
        remaining: typeof parsed.remaining === 'number' ? parsed.remaining : 1800,
        size: parsed.size && typeof parsed.size.width === 'number' ? parsed.size : DEFAULT_STATE.size,
        position: parsed.position && typeof parsed.position.x === 'number' ? parsed.position : DEFAULT_STATE.position,
        session: parsed.session || null,
      };
    } catch (e) {
      return DEFAULT_STATE;
    }
  },

  set(state: Partial<FocusModeState>): void {
    if (typeof window === 'undefined') return;
    try {
      const current = this.get();
      const updated = { ...current, ...state };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
  },

  clear(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }
};
