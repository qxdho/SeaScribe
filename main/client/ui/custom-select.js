/* ============================================================
   SeaScribe 鈥?Custom Select Dropdown (ES Module)
   ============================================================ */

function initAll(container) {
  container = container || document;
  container.querySelectorAll('select').forEach(function(sel) {
    if (sel._customSelect) return;
    sel._customSelect = new _CustomSelect(sel);
  });
}

function initOne(sel) {
  if (sel._customSelect) return sel._customSelect;
  sel._customSelect = new _CustomSelect(sel);
  return sel._customSelect;
}

function _CustomSelect(orig) {
  var self = this;
  this.orig = orig;
  this._isOpen = false;
  this._boundDocClick = this._onDocClick.bind(this);

  this.wrap = document.createElement('div');
  this.wrap.className = 'cs-wrap';
  this.wrap._cs = this;

  this.trigger = document.createElement('button');
  this.trigger.type = 'button';
  this.trigger.className = 'cs-trigger';
  this.trigger.innerHTML = '<span class="cs-label"></span><span class="cs-arrow"></span>';
  this.wrap.appendChild(this.trigger);

  this.drop = document.createElement('div');
  this.drop.className = 'cs-drop';
  this.wrap.appendChild(this.drop);

  orig.parentNode.insertBefore(this.wrap, orig);
  this.wrap.appendChild(orig);
  orig.hidden = true;

  this._buildOptions();
  this._syncTrigger();

  this.trigger.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    self.toggle();
  });
  this.trigger.addEventListener('keydown', function(e) { self._onKey(e); });
  this.drop.addEventListener('click', function(e) {
    var opt = e.target.closest('.cs-option');
    if (!opt) return;
    self.select(parseInt(opt.dataset.idx));
  });
}

_CustomSelect.prototype.refresh = function() {
  this._buildOptions();
  this._syncTrigger();
  this.wrap.hidden = this.orig.hidden;
};

_CustomSelect.prototype._buildOptions = function() {
  this.drop.innerHTML = '';
  var opts = this.orig.options;
  for (var i = 0; i < opts.length; i++) {
    var div = document.createElement('div');
    div.className = 'cs-option';
    div.dataset.idx = i;
    div.textContent = opts[i].text;
    this.drop.appendChild(div);
  }
  this._selectedIdx = this.orig.selectedIndex;
};

_CustomSelect.prototype._syncTrigger = function() {
  var idx = this.orig.selectedIndex;
  this._selectedIdx = idx;
  var label = this.trigger.querySelector('.cs-label');
  if (idx >= 0 && this.orig.options[idx]) {
    label.textContent = this.orig.options[idx].text;
  }
  var opts = this.drop.querySelectorAll('.cs-option');
  opts.forEach(function(o) { o.classList.remove('active'); });
  if (idx >= 0 && opts[idx]) opts[idx].classList.add('active');
};

_CustomSelect.prototype.select = function(idx) {
  this.orig.selectedIndex = idx;
  this._syncTrigger();
  this.close();
  this.orig.dispatchEvent(new Event('change', { bubbles: true }));
};

_CustomSelect.prototype.open = function() {
  if (this._isOpen) return;
  document.querySelectorAll('.cs-wrap.open').forEach(function(w) {
    if (w._cs && w._cs !== this) w._cs.close();
  }, this);
  this._isOpen = true;
  document.addEventListener('click', this._boundDocClick, true);
  this.wrap.classList.add('open');
  var opts = this.drop.querySelectorAll('.cs-option');
  opts.forEach(function(o, i) {
    o.style.animationDelay = (i * 0.03) + 's';
    o.classList.add('stagger-in');
  });
  var active = this.drop.querySelector('.cs-option.active');
  if (active) active.scrollIntoView({ block: 'nearest' });
};

_CustomSelect.prototype.close = function() {
  if (!this._isOpen) return;
  this._isOpen = false;
  this.drop.querySelectorAll('.cs-option').forEach(function(o) {
    o.classList.remove('stagger-in');
    o.style.animationDelay = '';
  });
  this.wrap.classList.remove('open');
  document.removeEventListener('click', this._boundDocClick, true);
};

_CustomSelect.prototype.toggle = function() {
  if (this._isOpen) this.close(); else this.open();
};

_CustomSelect.prototype._onKey = function(e) {
  var idx = this._selectedIdx;
  var max = this.orig.options.length - 1;
  switch (e.key) {
    case 'ArrowDown': e.preventDefault(); if (!this._isOpen) this.open(); idx = Math.min(idx + 1, max); break;
    case 'ArrowUp':   e.preventDefault(); idx = Math.max(idx - 1, 0); break;
    case 'Enter':     e.preventDefault(); if (this._isOpen) { this.select(idx); return; } this.open(); break;
    case 'Escape':    e.preventDefault(); this.close(); return;
    default: return;
  }
  this._highlight(idx);
};

_CustomSelect.prototype._highlight = function(idx) {
  var opts = this.drop.querySelectorAll('.cs-option');
  opts.forEach(function(o) { o.classList.remove('focused'); });
  if (idx >= 0 && opts[idx]) {
    opts[idx].classList.add('focused');
    opts[idx].scrollIntoView({ block: 'nearest' });
  }
  this._selectedIdx = idx;
};

_CustomSelect.prototype._onDocClick = function(e) {
  if (this.wrap.contains(e.target)) return;
  this.close();
};

window.CustomSelect = { initAll: initAll, initOne: initOne };

document.addEventListener('DOMContentLoaded', function() { initAll(); });

if (typeof PageRegistry !== 'undefined') {
  var _origNavigate = PageRegistry.navigate;
  PageRegistry.navigate = function(pageId) {
    _origNavigate.call(this, pageId);
    setTimeout(function() { window.CustomSelect.initAll(document.getElementById('admin-content')); }, 150);
  };
}

