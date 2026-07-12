/* ============================================================
   SeaScribe Admin — Roster Management Page (admin only)
   Inline editing: click edit to transform row into inputs.
   ============================================================ */

(function() {

function render() {
  var content = document.getElementById('admin-content');
  content.innerHTML =
    '<div class="admin-card">' +
      '<h3>📋 姓名池管理</h3>' +
      '<p style="color:var(--muted);margin-bottom:12px">管理各班级的学生姓名和个性签名。学生绑定姓名时从此列表中选择。</p>' +
      '<div id="roster-toolbar" style="display:flex;gap:8px;margin-bottom:12px;align-items:center">' +
        '<select id="roster-class-select" style="padding:7px 10px;border:1px solid var(--border);border-radius:var(--radius);font-size:0.85rem;background:var(--surface);color:var(--text)">' +
          '<option value="">— 选择班级 —</option>' +
        '</select>' +
        '<button id="roster-add-class" class="admin-btn admin-btn-outline admin-btn-sm">+ 新建班级</button>' +
        '<button id="roster-del-class" class="admin-btn admin-btn-danger admin-btn-sm" disabled>删除班级</button>' +
        '<button id="roster-add-student" class="admin-btn admin-btn-primary admin-btn-sm" disabled>+ 添加学生</button>' +
        '<button id="roster-import" class="admin-btn admin-btn-outline admin-btn-sm" disabled>📥 导入 CSV</button>' +
        '<input type="file" id="roster-import-file" accept=".csv" style="display:none">' +
      '</div>' +
      '<div id="roster-table-wrap"><p style="color:var(--muted)">请选择班级</p></div>' +
    '</div>';

  document.getElementById('roster-class-select').addEventListener('change', function() {
    var cls = this.value;
    document.getElementById('roster-del-class').disabled = !cls;
    document.getElementById('roster-add-student').disabled = !cls;
    document.getElementById('roster-import').disabled = !cls;
    if (cls) loadStudents(cls);
    else document.getElementById('roster-table-wrap').innerHTML = '<p style="color:var(--muted)">请选择班级</p>';
  });

  document.getElementById('roster-add-class').addEventListener('click', function() {
    var name = prompt('请输入新班级名称（如：13班）：');
    if (!name || !name.trim()) return;
    name = name.trim();
    var select = document.getElementById('roster-class-select');
    var exists = Array.from(select.options).some(function(o) { return o.value === name; });
    if (exists) { Admin.toast('该班级已存在'); return; }
    select.appendChild(new Option(name, name));
    select.value = name;
    select.dispatchEvent(new Event('change'));
    saveRoster();
  });

  document.getElementById('roster-del-class').addEventListener('click', function() {
    var cls = document.getElementById('roster-class-select').value;
    if (!cls) return;
    if (!confirm('确定删除班级「' + cls + '」及其所有学生吗？')) return;
    var select = document.getElementById('roster-class-select');
    select.querySelector('option[value="' + cls + '"]').remove();
    select.value = '';
    select.dispatchEvent(new Event('change'));
    saveRoster();
  });

  document.getElementById('roster-add-student').addEventListener('click', function() {
    var tbody = document.querySelector('#roster-table-wrap tbody');
    if (!tbody) { loadStudents(document.getElementById('roster-class-select').value); return; }
    // Insert edit row at the top of tbody
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td style="color:var(--muted);font-size:0.78rem">+</td>' +
      '<td><input type="text" class="iedit-name" name="name" placeholder="姓名" autocomplete="name" style="box-sizing:border-box;width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem"></td>' +
      '<td><input type="text" class="iedit-sig" name="signature" placeholder="签名" autocomplete="off" style="box-sizing:border-box;width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem"></td>' +
      '<td style="color:var(--muted);font-size:0.78rem">—</td>' +
      '<td style="white-space:nowrap">' +
        '<button class="admin-btn admin-btn-primary admin-btn-sm iedit-save">保存</button> ' +
        '<button class="admin-btn admin-btn-ghost admin-btn-sm iedit-cancel">取消</button>' +
      '</td>';
    tr._editIdx = -1; // -1 = new
    tbody.insertBefore(tr, tbody.firstChild);
    bindEditRow(tr);
    tr.querySelector('.iedit-name').focus();
  });

  // CSV import
  document.getElementById('roster-import').addEventListener('click', function() {
    document.getElementById('roster-import-file').click();
  });
  document.getElementById('roster-import-file').addEventListener('change', function() {
    var file = this.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      var lines = e.target.result.split(/\r?\n/);
      var imported = [];
      lines.forEach(function(line) {
        var name = line.split(',')[0].trim();
        if (name) {
          var dup = _currentStudents.some(function(s) { return s.name === name; });
          if (!dup) imported.push({ name: name, signature: '' });
        }
      });
      if (!imported.length) { Admin.toast('没有可导入的新姓名'); return; }
      if (!confirm('将从 CSV 导入 ' + imported.length + ' 个新姓名，确认？')) return;
      _currentStudents = _currentStudents.concat(imported);
      renderStudentTable(_currentStudents);
      saveRoster();
    };
    reader.readAsText(file, 'UTF-8');
    this.value = '';
  });

  loadClasses();
}

function bindEditRow(tr) {
  tr.querySelector('.iedit-save').addEventListener('click', function() {
    var name = tr.querySelector('.iedit-name').value.trim();
    if (!name) { Admin.toast('请输入姓名'); return; }
    var sig = tr.querySelector('.iedit-sig').value.trim();
    var idx = tr._editIdx;
    if (idx >= 0) {
      _currentStudents[idx] = { name: name, signature: sig };
    } else {
      var dup = _currentStudents.some(function(s) { return s.name === name; });
      if (dup) { Admin.toast('该姓名已存在'); return; }
      _currentStudents.push({ name: name, signature: sig });
    }
    renderStudentTable(_currentStudents);
    saveRoster();
  });
  tr.querySelector('.iedit-cancel').addEventListener('click', function() {
    if (tr._editIdx >= 0) {
      // Restore original row
      renderStudentTable(_currentStudents);
    } else {
      tr.remove();
    }
  });
}

var _currentStudents = [];
var _bindMap = {};  // displayName -> username (绑定状态)
var _rosterSortKey = '';
var _rosterSortDir = 1;

async function loadBindMap() {
  try {
    var res = await Admin.api('/api/admin/users');
    if (res.ok) {
      _bindMap = {};
      res.data.forEach(function(u) {
        if (u.displayName) _bindMap[u.displayName] = u.username;
      });
    }
  } catch(e) {}
}

async function loadClasses() {
  try {
    var res = await fetch('/api/roster/classes');
    var classes = await res.json();
    var select = document.getElementById('roster-class-select');
    select.innerHTML = '<option value="">— 选择班级 —</option>';
    classes.forEach(function(c) {
      select.appendChild(new Option(c, c));
    });
  } catch(e) {}
}

async function loadStudents(cls) {
  try {
    loadBindMap();  // fire and forget, table renders below already
    var res = await fetch('/api/roster/' + encodeURIComponent(cls));
    var students = await res.json();
    _currentStudents = students;
    // Merge user-custom signatures
    var names = students.map(function(s) { return s.name; }).join(',');
    if (names) {
      fetch('/api/user-signatures?names=' + encodeURIComponent(names))
        .then(function(r) { return r.json(); })
        .then(function(sigs) {
          _currentStudents.forEach(function(s) {
            if (sigs[s.name]) s.signature = sigs[s.name];
          });
          renderStudentTable(_currentStudents);
        })
        .catch(function() {});
    }
    renderStudentTable(students);
  } catch(e) {
    document.getElementById('roster-table-wrap').innerHTML = '<p style="color:#d63031">加载失败</p>';
  }
}

function bindStatusHTML(name) {
  var username = _bindMap[name];
  if (username) {
    return '<span style="color:#27ae60;font-size:0.82rem" title="已绑定用户: ' + Admin.esc(username) + '">✅ 已绑定</span>';
  }
  return '<span style="color:var(--muted);font-size:0.82rem">—</span>';
}

function renderStudentTable(students) {
  var wrap = document.getElementById('roster-table-wrap');
  if (!students.length) {
    wrap.innerHTML = '<p style="color:var(--muted)">暂无学生，点击「+ 添加学生」</p>';
    return;
  }
  var html = '<table class="admin-table" style="table-layout:fixed"><colgroup><col style="width:36px"><col style="width:28%"><col style="width:28%"><col style="width:90px"><col style="width:130px"></colgroup><thead><tr><th>#</th><th>姓名</th><th>个性签名</th><th>绑定状态</th><th>操作</th></tr></thead><tbody>';
  students.forEach(function(s, i) {
    html += '<tr data-idx="' + i + '">' +
      '<td style="color:var(--muted);font-size:0.78rem">' + (i + 1) + '</td>' +
      '<td>' + Admin.esc(s.name) + '</td>' +
      '<td>' + Admin.esc(s.signature || '—') + '</td>' +
      '<td>' + bindStatusHTML(s.name) + '</td>' +
      '<td>' +
        '<button class="admin-btn admin-btn-outline admin-btn-sm iedit-btn">编辑</button> ' +
        '<button class="admin-btn admin-btn-danger admin-btn-sm idel-btn">删除</button>' +
      '</td>' +
    '</tr>';
  });
  html += '</tbody></table>';
  wrap.innerHTML = html;

  // Edit: replace row with inputs
  wrap.querySelectorAll('.iedit-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var tr = this.closest('tr');
      var idx = parseInt(tr.dataset.idx);
      var s = _currentStudents[idx];
      tr.innerHTML =
        '<td style="color:var(--muted);font-size:0.78rem">' + (idx + 1) + '</td>' +
        '<td><input type="text" class="iedit-name" name="name" autocomplete="name" value="' + Admin.esc(s.name) + '" style="box-sizing:border-box;width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem"></td>' +
        '<td><input type="text" class="iedit-sig" name="signature" value="' + Admin.esc(s.signature || '') + '" autocomplete="off" style="box-sizing:border-box;width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem"></td>' +
        '<td>' + bindStatusHTML(s.name) + '</td>' +
        '<td style="white-space:nowrap">' +
          '<button class="admin-btn admin-btn-primary admin-btn-sm iedit-save">保存</button> ' +
          '<button class="admin-btn admin-btn-ghost admin-btn-sm iedit-cancel">取消</button>' +
        '</td>';
      tr._editIdx = idx;
      bindEditRow(tr);
      tr.querySelector('.iedit-name').focus();
    });
  });

  // Delete
  wrap.querySelectorAll('.idel-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var idx = parseInt(this.closest('tr').dataset.idx);
      var s = _currentStudents[idx];
      if (!confirm('确定删除「' + s.name + '」吗？')) return;
      _currentStudents.splice(idx, 1);
      renderStudentTable(_currentStudents);
      saveRoster();
    });
  });
}

async function saveRoster() {
  var select = document.getElementById('roster-class-select');
  var classes = Array.from(select.options).filter(function(o) { return o.value; }).map(function(o) { return o.value; });
  try {
    var res = await Admin.api('/api/admin/roster');
    var data = res.data || {};
  } catch(e) { var data = {}; }
  var newData = {};
  classes.forEach(function(cls) {
    if (cls === document.getElementById('roster-class-select').value) {
      newData[cls] = _currentStudents;
    } else if (data[cls]) {
      newData[cls] = data[cls];
    } else {
      newData[cls] = [];
    }
  });
  var res = await Admin.api('/api/admin/roster', { method: 'POST', body: newData });
  if (res.ok) {
    Admin.toast('姓名池已保存', 'success');
  } else {
    Admin.toast(res.data.error || '保存失败', 'error');
  }
}

PageRegistry.register({
  id: 'roster',
  label: '姓名池',
  icon: '🏫',
  roles: ['admin'],
  render: render,
});

})();
