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

// Shared HTML escape utility
window.SeaScribe.esc = function(s) {
  var d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
};

// Shared delay helper
window.SeaScribe.delay = function(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
};

