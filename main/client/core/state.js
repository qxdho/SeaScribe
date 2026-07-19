/* ============================================================
   SeaScribe — Core State (ES Module)
   ============================================================ */

export const SeaScribe = window.SeaScribe || {};
window.SeaScribe = SeaScribe;

// ---------- Subject Registry ----------
export const SubjectRegistry = window.SubjectRegistry || {
  _plugins: new Map(),

  register(plugin) {
    if (!plugin || !plugin.meta || !plugin.meta.id) {
      console.error('[SeaScribe] Invalid plugin:', plugin);
      return;
    }
    this._plugins.set(plugin.meta.id, plugin);
    console.log(`[SeaScribe] Registered: ${plugin.meta.name} (${plugin.meta.id})`);
  },

  get(id) {
    return this._plugins.get(id) || null;
  },

  list() {
    return Array.from(this._plugins.values());
  },
};
window.SubjectRegistry = SubjectRegistry;

// Shared HTML escape utility
SeaScribe.esc = function(s) {
  var d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
};

// Shared delay helper
SeaScribe.delay = function(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
};
