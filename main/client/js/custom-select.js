/* ============================================================
   SeaScribe — Custom Select Dropdown
   替代所有原生 select，支持键盘+动画+深色模式+动态刷新
   ============================================================ */

(function() {

  function initAll(container) {
    container = container || document;
    container.querySelectorAll('select').forEach(function(sel) {
      if (sel._customSelect) return;
      sel._customSelect = new CustomSelect(sel);
    });
  }

  function initOne(sel) {
    if (sel._customSelect) return sel._customSelect;
    sel._customSelect = new CustomSelect(sel);
    return sel._customSelect;
  }

  function CustomSelect(orig) {
    var self = this;
    this.orig = orig;
    this._isOpen = false;
    this._boundDocClick = this._onDocClick.bind(this);

    // 创建容器
    this.wrap = document.createElement('div');
    this.wrap.className = 'cs-wrap';
    this.wrap._cs = this;

    // 触发器
    this.trigger = document.createElement('button');
    this.trigger.type = 'button';
    this.trigger.className = 'cs-trigger';
    this.trigger.innerHTML = '<span class="cs-label"></span><span class="cs-arrow"></span>';
    this.wrap.appendChild(this.trigger);

    // 下拉列表
    this.drop = document.createElement('div');
    this.drop.className = 'cs-drop';
    this.wrap.appendChild(this.drop);

    // 插入 DOM
    orig.parentNode.insertBefore(this.wrap, orig);
    this.wrap.appendChild(orig);
    orig.hidden = true;

    // 构建选项
    this._buildOptions();
    this._syncTrigger();

    // 事件
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

  CustomSelect.prototype.refresh = function() {
    this._buildOptions();
    this._syncTrigger();
    this.wrap.hidden = this.orig.hidden;
  };

  CustomSelect.prototype._buildOptions = function() {
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

  CustomSelect.prototype._syncTrigger = function() {
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

  CustomSelect.prototype.select = function(idx) {
    this.orig.selectedIndex = idx;
    this._syncTrigger();
    this.close();
    this.orig.dispatchEvent(new Event('change', { bubbles: true }));
  };

  CustomSelect.prototype.open = function() {
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

  CustomSelect.prototype.close = function() {
    if (!this._isOpen) return;
    this._isOpen = false;
    this.drop.querySelectorAll('.cs-option').forEach(function(o) {
      o.classList.remove('stagger-in');
      o.style.animationDelay = '';
    });
    this.wrap.classList.remove('open');
    document.removeEventListener('click', this._boundDocClick, true);
  };

  CustomSelect.prototype.toggle = function() {
    if (this._isOpen) this.close(); else this.open();
  };

  CustomSelect.prototype.destroy = function() {
    this.close();
    this.orig.removeEventListener('keydown', this._boundKey);
    this.wrap.removeEventListener('click', this._boundWrapClick);
    if (this.orig._customSelect === this) {
      delete this.orig._customSelect;
    }
    if (this.wrap.parentNode) {
      this.wrap.parentNode.replaceChild(this.orig, this.wrap);
    }
  };

  CustomSelect.prototype._onKey = function(e) {
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

  CustomSelect.prototype._highlight = function(idx) {
    var opts = this.drop.querySelectorAll('.cs-option');
    opts.forEach(function(o) { o.classList.remove('focused'); });
    if (idx >= 0 && opts[idx]) {
      opts[idx].classList.add('focused');
      opts[idx].scrollIntoView({ block: 'nearest' });
    }
    this._selectedIdx = idx;
  };

  CustomSelect.prototype._onDocClick = function(e) {
    if (this.wrap.contains(e.target)) return;
    this.close();
  };

  window.CustomSelect = { initAll: initAll, initOne: initOne };

  document.addEventListener('DOMContentLoaded', function() { initAll(); });

  // Admin: 动态页面渲染后重新初始化 CustomSelect
  if (typeof PageRegistry !== 'undefined') {
    var _origNavigate = PageRegistry.navigate;
    PageRegistry.navigate = function(pageId) {
      _origNavigate.call(this, pageId);
      setTimeout(function() { window.CustomSelect.initAll(document.getElementById('admin-content')); }, 150);
    };
  }
})();
