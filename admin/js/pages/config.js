/* ============================================================
   SeaScribe Admin — Config Editor Page
   ============================================================ */

(function() {

var CONFIG_LIST = [
  { name: 'main',      label: '主配置',       file: 'config/config.js' },
  { name: 'chemistry', label: '化学学科配置',  file: 'config/chemistry/config.js' },
  { name: 'english',   label: '英语学科配置',  file: 'config/english/config.js' },
  { name: 'picker',    label: '点名配置',      file: 'config/picker/config.js' },
];

function render() {
  var content = document.getElementById('admin-content');
  content.innerHTML = '<div class="admin-card"><h3>⚙️ 配置管理</h3><p style="color:var(--muted);margin-bottom:12px">选择一个配置文件进行编辑，修改后点击保存即可生效（刷新页面后应用）。</p>' +
    '<div id="config-list">' +
      CONFIG_LIST.map(function(c) {
        return '<button class="admin-btn admin-btn-outline admin-btn-sm" style="margin:0 6px 6px 0" data-cfg="' + c.name + '">' + Admin.esc(c.label) + '</button>';
      }).join('') +
    '</div>' +
    '<div id="config-editor" class="hidden" style="margin-top:16px"></div>' +
  '</div>';

  document.querySelectorAll('#config-list button').forEach(function(btn) {
    btn.addEventListener('click', function() { loadConfig(this.dataset.cfg); });
  });
}

async function loadConfig(name) {
  var res = await Admin.api('/api/admin/config/' + name);
  if (!res.ok) { Admin.toast('加载失败: ' + (res.data.error || '')); return; }

  var raw = res.data.content;
  var cfg = parseConfig(raw);
  var editor = document.getElementById('config-editor');
  editor.classList.remove('hidden');
  editor.innerHTML = renderForm(name, cfg, raw);
  bindForm(name);
}

function parseConfig(raw) {
  var m = raw.match(/window\.__\w+_CONFIG__\s*=\s*/);
  if (!m) return {};
  var after = raw.substring(raw.indexOf(m[0]) + m[0].length).trim();
  after = after.replace(/;\s*$/, '');

  // 提取配置项上方连续 // 注释块
  var comments = {};
  var pending = [];
  var lines = after.split('\n');
  lines.forEach(function(line) {
    var cm = line.match(/^\s*\/\/\s*(.+)$/);
    if (cm) {
      var t = cm[1].trim();
      // 忽略分隔线（全等号/全横线）
      if (!/^[=\uff0d\u2500-]+$/.test(t.replace(/\s/g, ''))) {
        pending.push(t);
      }
    } else {
      var km = line.match(/^\s*(\w+)\s*:/);
      if (km) {
        if (pending.length) comments[km[1]] = pending.join(' · ');
        pending = [];
      }
    }
  });

  after = after.replace(/\/\/.*$/gm, '');
  after = after.replace(/\/\*[\s\S]*?\*\//g, '');
  try {
    var values = (new Function('return (' + after + ')'))();
    values._comments = comments;
    return values;
  } catch(e) {
    console.warn('Config parse error:', e);
    return {};
  }
}

function rebuildJS(originalRaw, formData) {
  var m = originalRaw.match(/^(.*?=\s*)\{[\s\S]*\}(\s*;?\s*)$/);
  if (!m) return JSON.stringify(formData, null, 2);

  function formatVal(v, indent) {
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (typeof v === 'number') return String(v);
    if (typeof v === 'string') return JSON.stringify(v);
    if (Array.isArray(v)) {
      if (!v.length) return '[]';
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

  var originalCfg = parseConfig(originalRaw);

  Object.keys(originalCfg).forEach(function(k) {
    if (k === '_comments') return;
    if (typeof originalCfg[k] === 'object' && !Array.isArray(originalCfg[k])) {
      if (formData[k] && typeof formData[k] === 'object') {
        Object.keys(formData[k]).forEach(function(sk) {
          originalCfg[k][sk] = formData[k][sk];
        });
      }
    } else if (Array.isArray(originalCfg[k])) {
      if (k in formData._arrays) {
        try {
          originalCfg[k] = JSON.parse(formData._arrays[k]);
        } catch(e) {}
      }
    } else {
      originalCfg[k] = formData[k];
    }
  });

  delete originalCfg._comments;
  delete originalCfg._arrays;

  var prefix = m[1];
  var suffix = m[2] || ';';
  var body = formatVal(originalCfg, '');
  return prefix + body + suffix;
}

function renderForm(name, cfg, raw) {
  var info = CONFIG_LIST.find(function(c) { return c.name === name; });
  var html = '<h4>' + Admin.esc(info.label) + '</h4>';

  Object.keys(cfg).forEach(function(key) {
    if (key === '_comments') return;
    var val = cfg[key];
    var comment = cfg._comments ? cfg._comments[key] : '';
    if (key === 'methods' || key === 'decorativeAnimations' || key === 'processModes' || key === 'scanURLs') {
      html += '<div class="admin-config-field">' +
        '<div class="admin-config-label">' + Admin.esc(key) +
          '<small>' + (comment ? Admin.esc(comment) : '数组（JSON 格式，可增删条目）') + '</small></div>' +
        '<textarea name="cfg-' + key + '" data-key="' + key + '" data-array="1" rows="4" style="width:100%;font-size:0.78rem;font-family:monospace">' +
          Admin.esc(JSON.stringify(val, null, 2)) +
        '</textarea>' +
      '</div>';
      return;
    }
    if (typeof val === 'boolean') {
      html += '<div class="admin-config-field">' +
        '<div class="admin-config-label">' + Admin.esc(key) + (comment ? '<small>' + Admin.esc(comment) + '</small>' : '') + '</div>' +
        '<select name="cfg-' + key + '" data-key="' + key + '" style="width:100px">' +
          '<option value="true"' + (val ? ' selected' : '') + '>true</option>' +
          '<option value="false"' + (val ? '' : ' selected') + '>false</option>' +
        '</select>' +
      '</div>';
    } else if (typeof val === 'number') {
      html += '<div class="admin-config-field">' +
        '<div class="admin-config-label">' + Admin.esc(key) + (comment ? '<small>' + Admin.esc(comment) + '</small>' : '') + '</div>' +
        '<input type="number" name="cfg-' + key + '" data-key="' + key + '" value="' + val + '" style="width:120px">' +
      '</div>';
    } else if (typeof val === 'string') {
      html += '<div class="admin-config-field">' +
        '<div class="admin-config-label">' + Admin.esc(key) + (comment ? '<small>' + Admin.esc(comment) + '</small>' : '') + '</div>' +
        '<input type="text" name="cfg-' + key + '" data-key="' + key + '" value="' + Admin.esc(val) + '" style="width:200px">' +
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

    var res = await Admin.api('/api/admin/config/' + name);
    if (!res.ok) { Admin.toast('获取原始配置失败', "error"); return; }
    var newContent = rebuildJS(res.data.content, formData);

    var saveRes = await Admin.api('/api/admin/config/' + name, {
      method: 'POST',
      body: { content: newContent },
    });
    if (saveRes.ok) {
      Admin.toast('保存成功，刷新页面后生效', "success");
    } else {
      Admin.toast(saveRes.data.error || '保存失败', "error");
    }
  });
}


PageRegistry.register({
  id: 'config',
  label: '配置管理',
  icon: '⚙️',
  roles: ['admin'],
  render: render,
});

})();
