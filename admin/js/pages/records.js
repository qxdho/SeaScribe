/* ============================================================
   SeaScribe Admin — Picker Records Page (admin only)
   View and clear picker timestamps by class.
   ============================================================ */

(function() {

var _currentFileName = '';

function render() {
  var content = document.getElementById('admin-content');
  content.innerHTML =
    '<div class="admin-card">' +
      '<h3>📋 点名记录管理</h3>' +
      '<p style="color:var(--muted);margin-bottom:12px">选择班级查看点名记录，可逐条删除或一键清空。</p>' +
      '<div class="admin-form-group">' +
        '<label for="records-class">班级</label>' +
        '<select id="records-class">' +
          '<option value="">扫描中…</option>' +
        '</select>' +
      '</div>' +
      '<div id="records-table-wrap"></div>' +
      '<div id="records-actions" class="hidden" style="margin-top:12px">' +
        '<button id="records-clear" class="admin-btn admin-btn-danger admin-btn-sm">🗑 清空该班记录</button>' +
      '</div>' +
    '</div>';

  document.getElementById('records-class').addEventListener('change', function() {
    var opt = this.selectedOptions[0];
    if (!opt || !opt.value) {
      document.getElementById('records-table-wrap').innerHTML = '';
      document.getElementById('records-actions').classList.add('hidden');
      _currentFileName = '';
      return;
    }
    _currentFileName = opt.getAttribute('data-filename') || '';
    loadRecords(opt.value);
  });

  document.getElementById('records-clear').addEventListener('click', function() {
    if (!_currentFileName) return;
    var label = _currentFileName.replace(/\.csv$/i, '');
    if (!confirm('确定清空「' + label + '」的全部点名记录吗？此操作不可撤销。')) return;
    Admin.api('/api/admin/picker-timestamps/clear', {
      method: 'POST',
      body: { list: _currentFileName },
    }).then(function(res) {
      if (res.ok) {
        loadRecordsFromFile(_currentFileName);
      } else {
        Admin.toast(res.data.error || '清空失败');
      }
    });
  });

  loadClassList();
}

async function loadClassList() {
  var select = document.getElementById('records-class');
  try {
    var res = await fetch('/api/roster/classes');
    var classes = await res.json();
    if (!classes.length) {
      select.innerHTML = '<option value="">无班级数据</option>';
      return;
    }
    select.innerHTML = '<option value="">— 选择班级 —</option>' +
      classes.map(function(c) {
        return '<option value="' + Admin.esc(c) + '" data-filename="' + Admin.esc(c) + '">' + Admin.esc(c) + '</option>';
      }).join('');
  } catch(e) {
    select.innerHTML = '<option value="">加载失败</option>';
  }
}

async function loadRecords(url) {
  var wrap = document.getElementById('records-table-wrap');
  wrap.innerHTML = '<p style="color:var(--muted)">加载中…</p>';
  document.getElementById('records-actions').classList.add('hidden');

  try {
    var res = await fetch('/api/picker-timestamps?list=' + encodeURIComponent(_currentFileName));
    var ts = await res.json();
    renderTable(ts);
  } catch(e) {
    wrap.innerHTML = '<p style="color:#d63031">加载失败</p>';
  }
}

async function loadRecordsFromFile(fileName) {
  try {
    var res = await fetch('/api/picker-timestamps?list=' + encodeURIComponent(fileName));
    var ts = await res.json();
    renderTable(ts);
  } catch(e) {}
}

function renderTable(ts) {
  var wrap = document.getElementById('records-table-wrap');
  var names = Object.keys(ts);
  if (!names.length) {
    wrap.innerHTML = '<p style="color:var(--muted)">暂无点名记录</p>';
    document.getElementById('records-actions').classList.add('hidden');
    return;
  }
  names.sort(function(a, b) { return (ts[b] || '').localeCompare(ts[a] || ''); });
  var html = '<table class="admin-table"><thead><tr><th>姓名</th><th>最近点名时间</th><th>操作</th></tr></thead><tbody>';
  names.forEach(function(n) {
    html += '<tr><td>' + Admin.esc(n) + '</td><td>' + formatTime(ts[n]) + '</td>' +
      '<td><button class="admin-btn admin-btn-danger admin-btn-sm" data-del-name="' + Admin.esc(n) + '">删除</button></td></tr>';
  });
  html += '</tbody></table>';
  wrap.innerHTML = html;

  // 绑定逐条删除
  wrap.querySelectorAll('[data-del-name]').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      var name = this.dataset.delName;
      if (!confirm('确定删除「' + name + '」的点名记录吗？')) return;
      var res = await Admin.api('/api/admin/picker-timestamps/delete', {
        method: 'POST',
        body: { list: _currentFileName, name: name },
      });
      if (res.ok) {
        Admin.toast('已删除「' + name + '」的记录', 'success');
        loadRecordsFromFile(_currentFileName);
      } else {
        Admin.toast(res.data.error || '删除失败', 'error');
      }
    });
  });
  document.getElementById('records-actions').classList.remove('hidden');
}

function formatTime(isoStr) {
  if (!isoStr) return '—';
  var d = new Date(isoStr);
  if (isNaN(d.getTime())) return '—';
  var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
  return d.getFullYear() + '-' +
    pad(d.getMonth() + 1) + '-' +
    pad(d.getDate()) + ' ' +
    pad(d.getHours()) + ':' +
    pad(d.getMinutes());
}

PageRegistry.register({
  id: 'records',
  label: '点名记录',
  icon: '📋',
  roles: ['admin'],
  render: render,
});

})();
