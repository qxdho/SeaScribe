/* ============================================================
   SeaScribe — Core Engine
   ============================================================ */

// Global namespace
window.SeaScribe = window.SeaScribe || {};

// ---------- Subject Registry ----------
const SubjectRegistry = {
  _plugins: new Map(),

  /**
   * Register a subject plugin.
   *
   * @param {Object} plugin — must conform to ISubjectPlugin:
   *   - meta: { id: string, name: string, description: string }
   *   - defaultCount: number
   *   - loadData(): Promise<Array<{ prompt, answer, ... }>>
   *   - renderPrompt(item, index): string  (returns HTML)
   *   - renderAnswer(item): string         (returns HTML)
   *
   * Optional:
   *   - configUI(containerElement): void   — render custom config controls
   *   - getMode(): string                  — return current sub-mode
   */
  register(plugin) {
    if (!plugin || !plugin.meta || !plugin.meta.id) {
      console.error('[SeaScribe] Invalid plugin:', plugin);
      return;
    }
    this._plugins.set(plugin.meta.id, plugin);
    console.log(`[SeaScribe] Registered: ${plugin.meta.name} (${plugin.meta.id})`);
  },

  /** Get a plugin by id */
  get(id) {
    return this._plugins.get(id) || null;
  },

  /** List all registered plugins */
  list() {
    return Array.from(this._plugins.values());
  },
};


// ---------- Dictation Engine ----------
class DictationEngine {

  constructor() {
    this.currentItems = null;
    this.currentMode  = null;
    this.state = 'idle'; // idle | questioning | answering
  }

  /**
   * Fisher-Yates shuffle + pick `count` items.
   * Returns a NEW array; does not mutate the original.
   *
   * @param {Array} items
   * @param {number} count
   * @returns {Array}
   */
  shuffleAndPick(items, count) {
    const arr = [...items];
    const n = arr.length;
    const limit = Math.min(count, n);

    // Fisher-Yates shuffle
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    return arr.slice(0, limit);
  }

  setState(state) {
    this.state = state;
  }
}

