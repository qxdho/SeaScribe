/* ============================================================
   SeaScribe Admin — Config Editor
   ============================================================ */

(function() {

  var CONFIG_LIST = [
    { name: 'main',      label: '主配置',       file: 'config/config.js' },
    { name: 'chemistry', label: '化学学科配置',  file: 'config/chemistry/config.js' },
    { name: 'english',   label: '英语学科配置',  file: 'config/english/config.js' },
    { name: 'picker',    label: '点名配置',      file: 'config/picker/config.js' },
  ];

  window.AdminConfig = {
    render: render,
  };

  function render() {
    var content = document.getElementById('admin-content');
    content.innerHTML = '<div class="admin-card"><h3>⚙️ 配置管理</h3><p style="color:var(--admin-muted);margin-bottom:12px">选择一个配置文件进行编辑，修改后点击保存即可生效（刷新页面后应用）。</p>' +
      '<div id="config-list">' +
        CONFIG_LIST.map(function(c) {
          return '<button class="admin-btn admin-btn-outline admin-btn-sm" style="margin:0 6px 6px 0" data-cfg="' + c.name + '">' + Admin.esc(c.label) + '</button>';
        }).join('') +
      '</div>' +
      '<div id="config-editor" class="hidden" style="margin-top:16px"></div>' +
    '</div>';

    // bind config buttons
    document.querySelectorAll('#config-list button').forEach(function(btn) {
      btn.addEventListener('click', function() { loadConfig(this.dataset.cfg); });
    });
  }

  async function loadConfig(name) {
    var res = await Admin.api('/api/admin/config/' + name);
    if (!res.ok) { alert('加载失败: ' + (res.data.error || '')); return; }

    var raw = res.data.content;
    var cfg = parseConfig(raw);
    var editor = document.getElementById('config-editor');
    editor.classList.remove('hidden');
    editor.innerHTML = renderForm(name, cfg, raw);
    bindForm(name);
  }

  /* ====== Parse JS config → object ====== */
  function parseConfig(raw) {
    // Extract the object literal after the assignment
    var idx = raw.indexOf('=');
    if (idx < 0) return {};
    var after = raw.substring(idx + 1).trim();
    // Remove trailing semicolon
    after = after.replace(/;\s*$/, '');
    // Remove // comments (single line only, simple)
    after = after.replace(/\/\/.*$/gm, '');
    // Remove /* */ comments
    after = after.replace(/\/\*[\s\S]*?\*\//g, '');
    try {
      return (new Function('return (' + after + ')'))();
    } catch(e) {
      console.warn('Config parse fallback for', raw.substring(0, 50), e);
      return {};
    }
  }

  /* ====== Rebuild JS file from form values ====== */
  function rebuildJS(originalRaw, formData) {
    // Extract the variable name and the rest
    var m = originalRaw.match(/^(.*?=\s*)\{[\s\S]*\}(\s*;?\s*)$/);
    if (!m) return JSON.stringify(formData, null, 2); // fallback
    // Build the config object as formatted JS
    var lines = [];
    var cfg = parseConfig(originalRaw); // get original for structure hints

    function formatVal(v, indent) {
      if (v === null || v === undefined) return 'null';
      if (typeof v === 'boolean') return v ? 'true' : 'false';
      if (typeof v === 'number') return String(v);
      if (typeof v === 'string') return JSON.stringify(v);
      if (Array.isArray(v)) {
        if (!v.length) return '[]';
        // for methods/decorativeAnimations/processModes arrays, use the original text
        // For simple arrays, format inline
        return JSON.stringify(v);
      }
      if (typeof v === 'object') {
        var props = Object.keys(v);
        if (!props.length) return '{}';
        var inner = props.map(function(k) {
          return indent + '  ' + k + ': ' + formatVal(v[k], indent + '  ');
        }).join(',\n');
        return '{\n' + inner + '\n' + indent + '}';
      }
      return String(v);
    }

    // Keep arrays from original if they exist
    var originalCfg = parseConfig(originalRaw);

    // Merge formData into originalCfg for scalar values, keep original arrays
    Object.keys(originalCfg).forEach(function(k) {
      if (typeof originalCfg[k] === 'object' && !Array.isArray(originalCfg[k])) {
        // nested object, apply formData
        if (formData[k] && typeof formData[k] === 'object') {
          Object.keys(formData[k]).forEach(function(sk) {
            originalCfg[k][sk] = formData[k][sk];
          });
        }
      } else if (Array.isArray(originalCfg[k])) {
        // Keep arrays from original — handled separately via textarea
        if (k in formData._arrays) {
          try {
            originalCfg[k] = JSON.parse(formData._arrays[k]);
          } catch(e) {}
        }
      } else {
        originalCfg[k] = formData[k];
      }
    });

    // Delete _arrays key before serializing
    delete originalCfg._arrays;

    var prefix = m[1];
    var suffix = m[2] || ';';
    var body = formatVal(originalCfg, '');
    return prefix + body + suffix;
  }

  /* ====== Render form ====== */
  function renderForm(name, cfg, raw) {
    var info = CONFIG_LIST.find(function(c) { return c.name === name; });
    var html = '<h4>' + Admin.esc(info.label) + '</h4>';

    // Scalar/string/number fields
    Object.keys(cfg).forEach(function(key) {
      var val = cfg[key];
      if (key === 'methods' || key === 'decorativeAnimations' || key === 'processModes' || key === 'scanURLs') {
        // Arrays of objects — handled as JSON textarea
        html += '<div class="admin-config-field">' +
          '<div class="admin-config-label">' + Admin.esc(key) +
            '<small>数组（JSON 格式，可增删条目）</small></div>' +
          '<textarea data-key="' + key + '" data-array="1" rows="4" style="width:100%;font-size:0.78rem;font-family:monospace">' +
            Admin.esc(JSON.stringify(val, null, 2)) +
          '</textarea>' +
        '</div>';
        return;
      }
      if (typeof val === 'boolean') {
        html += '<div class="admin-config-field">' +
          '<div class="admin-config-label">' + Admin.esc(key) + '</div>' +
          '<select data-key="' + key + '" style="width:100px">' +
            '<option value="true"' + (val ? ' selected' : '') + '>true</option>' +
            '<option value="false"' + (val ? '' : ' selected') + '>false</option>' +
          '</select>' +
        '</div>';
      } else if (typeof val === 'number') {
        html += '<div class="admin-config-field">' +
          '<div class="admin-config-label">' + Admin.esc(key) + '</div>' +
          '<input type="number" data-key="' + key + '" value="' + val + '" style="width:120px">' +
        '</div>';
      } else if (typeof val === 'string') {
        html += '<div class="admin-config-field">' +
          '<div class="admin-config-label">' + Admin.esc(key) + '</div>' +
          '<input type="text" data-key="' + key + '" value="' + Admin.esc(val) + '" style="width:200px">' +
        '</div>';
      }
    });

    html += '<div style="margin-top:16px;display:flex;gap:8px">' +
      '<button id="cfg-save" class="admin-btn admin-btn-primary admin-btn-sm">保存</button>' +
      '<button id="cfg-cancel" class="admin-btn admin-btn-ghost admin-btn-sm">取消</button>' +
    '</div>' +
    '<p id="cfg-msg" class="admin-msg hidden" style="margin-top:8px"></p>';

    return html;
  }

  function bindForm(name) {
    document.getElementById('cfg-cancel').addEventListener('click', function() {
      document.getElementById('config-editor').classList.add('hidden');
    });

    document.getElementById('cfg-save').addEventListener('click', async function() {
      var formData = { _arrays: {} };
      var editor = document.getElementById('config-editor');
      editor.querySelectorAll('[data-key]').forEach(function(el) {
        var key = el.dataset.key;
        if (el.dataset.array === '1') {
          formData._arrays[key] = el.value;
        } else if (el.tagName === 'SELECT') {
          formData[key] = el.value === 'true' ? true : el.value === 'false' ? false : isNaN(el.value) ? el.value : Number(el.value);
        } else if (el.type === 'number') {
          formData[key] = Number(el.value) || 0;
        } else {
          formData[key] = el.value;
        }
      });

      // Load original raw content
      var res = await Admin.api('/api/admin/config/' + name);
      if (!res.ok) { showCfgMsg('error', '获取原始配置失败'); return; }
      var newContent = rebuildJS(res.data.content, formData);

      var saveRes = await Admin.api('/api/admin/config/' + name, {
        method: 'POST',
        body: { content: newContent },
      });
      if (saveRes.ok) {
        showCfgMsg('success', '保存成功，刷新页面后生效');
      } else {
        showCfgMsg('error', saveRes.data.error || '保存失败');
      }
    });
  }

  function showCfgMsg(type, text) {
    var el = document.getElementById('cfg-msg');
    el.textContent = text;
    el.className = 'admin-msg admin-msg-' + type;
    el.classList.remove('hidden');
    setTimeout(function() { el.classList.add('hidden'); }, 4000);
  }
})();
