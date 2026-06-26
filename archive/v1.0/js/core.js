/* ============================================================
   SeaScribe — Core Engine
   ============================================================ */

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


// ---------- Animation Manager ----------
class AnimationManager {

  /**
   * Switch from one panel to another with a fade transition.
   *
   * @param {HTMLElement} fromPanel
   * @param {HTMLElement} toPanel
   * @param {number} [duration=300] — ms
   * @returns {Promise<void>}
   */
  switchPanel(fromPanel, toPanel, duration = 300) {
    return new Promise((resolve) => {
      if (!fromPanel || !toPanel) {
        resolve();
        return;
      }

      // Animate out current panel
      fromPanel.style.transition = `opacity ${duration}ms var(--ease-out, ease-out), transform ${duration}ms var(--ease-out, ease-out)`;
      fromPanel.style.opacity = '0';
      fromPanel.style.transform = 'translateY(-10px)';

      const onTransitionEnd = () => {
        fromPanel.removeEventListener('transitionend', onTransitionEnd);
        fromPanel.classList.add('hidden');
        fromPanel.style.opacity = '';
        fromPanel.style.transform = '';
        fromPanel.style.transition = '';

        // Show and animate in target panel
        toPanel.classList.remove('hidden');
        toPanel.style.opacity = '0';
        toPanel.style.transform = 'translateY(10px)';
        toPanel.style.transition = `opacity ${duration}ms var(--ease-out, ease-out), transform ${duration}ms var(--ease-out, ease-out)`;

        // Force reflow
        void toPanel.offsetWidth;

        toPanel.style.opacity = '1';
        toPanel.style.transform = 'translateY(0)';

        const onEnterEnd = () => {
          toPanel.removeEventListener('transitionend', onEnterEnd);
          toPanel.style.transition = '';
          resolve();
        };

        toPanel.addEventListener('transitionend', onEnterEnd, { once: true });

        // Fallback timeout
        setTimeout(() => {
          toPanel.style.transition = '';
          resolve();
        }, duration + 100);
      };

      fromPanel.addEventListener('transitionend', onTransitionEnd, { once: true });

      // Fallback timeout
      setTimeout(() => {
        fromPanel.style.transition = '';
      }, duration + 100);
    });
  }
}
