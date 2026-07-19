/* ============================================================
   SeaScribe Admin 鈥?Roster Management Page (admin only)
   Inline editing: click edit to transform row into inputs.
   ============================================================ */

(function() {

function render() {
  var content = document.getElementById('admin-content');
  content.innerHTML =
    '<div class="admin-card">' +
      '<h3>馃搵 濮撳悕姹犵鐞?/h3>' +
      '<p style="color:var(--muted);margin-bottom:12px">绠＄悊鍚勭彮绾х殑瀛︾敓濮撳悕鍜屼釜鎬х鍚嶃€傚鐢熺粦瀹氬鍚嶆椂浠庢鍒楄〃涓€夋嫨銆?/p>' +
      '<div id="roster-toolbar" style="display:flex;gap:8px;margin-bottom:12px;align-items:center">' +
        '<select id="roster-class-select" style="padding:7px 10px;border:1px solid var(--border);border-radius:var(--radius);font-size:0.85rem;background:var(--surface);color:var(--text)">' +
          '<option value="">鈥?閫夋嫨鐝骇 鈥?/option>' +
        '</select>' +
        '<button id="roster-add-class" class="admin-btn admin-btn-outline admin-btn-sm">+ 鏂板缓鐝骇</button>' +
        '<button id="roster-del-class" class="admin-btn admin-btn-danger admin-btn-sm" disabled>鍒犻櫎鐝骇</button>' +
        '<button id="roster-add-student" class="admin-btn admin-btn-primary admin-btn-sm" disabled>+ 娣诲姞瀛︾敓</button>' +
        '<button id="roster-import" class="admin-btn admin-btn-outline admin-btn-sm" disabled>馃摜 瀵煎叆 CSV</button>' +
        '<input type="file" id="roster-import-file" accept=".csv" style="display:none">' +
      '</div>' +
      '<div id="roster-table-wrap"><p style="color:var(--muted)">璇烽€夋嫨鐝骇</p></div>' +
    '</div>';

  document.getElementById('roster-class-select').addEventListener('change', function() {
    var cls = this.value;
    document.getElementById('roster-del-class').disabled = !cls;
    document.getElementById('roster-add-student').disabled = !cls;
    document.getElementById('roster-import').disabled = !cls;
    if (cls) loadStudents(cls);
    else document.getElementById('roster-table-wrap').innerHTML = '<p style="color:var(--muted)">璇烽€夋嫨鐝骇</p>';
  });

  document.getElementById('roster-add-class').addEventListener('click', function() {
    var name = prompt('璇疯緭鍏ユ柊鐝骇鍚嶇О锛堝锛?3鐝級锛?);
    if (!name || !name.trim()) return;
    name = name.trim();
    var select = document.getElementById('roster-class-select');
    var exists = Array.from(select.options).some(function(o) { return o.value === name; });
    if (exists) { Admin.toast('璇ョ彮绾у凡瀛樺湪'); return; }
    select.appendChild(new Option(name, name));
    if (select._customSelect) select._customSelect.refresh();
    select.value = name;
    select.dispatchEvent(new Event('change'));
    saveRoster();
  });

  document.getElementById('roster-del-class').addEventListener('click', function() {
    var cls = document.getElementById('roster-class-select').value;
    if (!cls) return;
    if (!confirm('纭畾鍒犻櫎鐝骇銆? + cls + '銆嶅強鍏舵墍鏈夊鐢熷悧锛?)) return;
    var select = document.getElementById('roster-class-select');
    select.querySelector('option[value="' + cls + '"]').remove();
    if (select._customSelect) select._customSelect.refresh();
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
      '<td><input type="text" class="iedit-name" name="name" placeholder="濮撳悕" autocomplete="name" style="box-sizing:border-box;width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem"></td>' +
      '<td><input type="text" class="iedit-sig" name="signature" placeholder="绛惧悕" autocomplete="off" style="box-sizing:border-box;width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem"></td>' +
      '<td style="color:var(--muted);font-size:0.78rem">鈥?/td>' +
      '<td style="white-space:nowrap">' +
        '<button class="admin-btn admin-btn-primary admin-btn-sm iedit-save">淇濆瓨</button> ' +
        '<button class="admin-btn admin-btn-ghost admin-btn-sm iedit-cancel">鍙栨秷</button>' +
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
      if (!imported.length) { Admin.toast('娌℃湁鍙鍏ョ殑鏂板鍚?); return; }
      if (!confirm('灏嗕粠 CSV 瀵煎叆 ' + imported.length + ' 涓柊濮撳悕锛岀‘璁わ紵')) return;
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
    if (!name) { Admin.toast('璇疯緭鍏ュ鍚?); return; }
    var sig = tr.querySelector('.iedit-sig').value.trim();
    var idx = tr._editIdx;
    if (idx >= 0) {
      _currentStudents[idx] = { name: name, signature: sig };
    } else {
      var dup = _currentStudents.some(function(s) { return s.name === name; });
      if (dup) { Admin.toast('璇ュ鍚嶅凡瀛樺湪'); return; }
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
var _bindMap = {};  // displayName -> username (缁戝畾鐘舵€?
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
    select.innerHTML = '<option value="">鈥?閫夋嫨鐝骇 鈥?/option>';
    classes.forEach(function(c) {
      select.appendChild(new Option(c, c));
    });
    if (select._customSelect) select._customSelect.refresh();
  } catch(e) {}
}

async function loadStudents(cls) {
  try {
    await loadBindMap();
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
    document.getElementById('roster-table-wrap').innerHTML = '<p style="color:#d63031">鍔犺浇澶辫触</p>';
  }
}

function bindStatusHTML(name) {
  var username = _bindMap[name];
  if (username) {
    return '<span style="color:#27ae60;font-size:0.82rem" title="宸茬粦瀹氱敤鎴? ' + Admin.esc(username) + '">鉁?宸茬粦瀹?/span>';
  }
  return '<span style="color:var(--muted);font-size:0.82rem">鈥?/span>';
}

function renderStudentTable(students) {
  var wrap = document.getElementById('roster-table-wrap');
  if (!students.length) {
    wrap.innerHTML = '<p style="color:var(--muted)">鏆傛棤瀛︾敓锛岀偣鍑汇€? 娣诲姞瀛︾敓銆?/p>';
    return;
  }
  var html = '<table class="admin-table" style="table-layout:fixed"><colgroup><col style="width:36px"><col style="width:28%"><col style="width:28%"><col style="width:90px"><col style="width:130px"></colgroup><thead><tr><th>#</th><th>濮撳悕</th><th>涓€х鍚?/th><th>缁戝畾鐘舵€?/th><th>鎿嶄綔</th></tr></thead><tbody>';
  students.forEach(function(s, i) {
    html += '<tr data-idx="' + i + '">' +
      '<td style="color:var(--muted);font-size:0.78rem">' + (i + 1) + '</td>' +
      '<td>' + Admin.esc(s.name) + '</td>' +
      '<td>' + Admin.esc(s.signature || '鈥?) + '</td>' +
      '<td>' + bindStatusHTML(s.name) + '</td>' +
      '<td>' +
        '<button class="admin-btn admin-btn-outline admin-btn-sm iedit-btn">缂栬緫</button> ' +
        '<button class="admin-btn admin-btn-danger admin-btn-sm idel-btn">鍒犻櫎</button>' +
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
          '<button class="admin-btn admin-btn-primary admin-btn-sm iedit-save">淇濆瓨</button> ' +
          '<button class="admin-btn admin-btn-ghost admin-btn-sm iedit-cancel">鍙栨秷</button>' +
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
      if (!confirm('纭畾鍒犻櫎銆? + s.name + '銆嶅悧锛?)) return;
      _currentStudents.splice(idx, 1);
      renderStudentTable(_currentStudents);
      saveRoster();
    });
  });
}

async function saveRoster() {
  var select = document.getElementById('roster-class-select');
  var classes = Array.from(select.options).filter(function(o) { return o.value; }).map(function(o) { return o.value; });
  var res = await Admin.api('/api/admin/roster');
  if (!res.ok) { Admin.toast('鏃犳硶鑾峰彇鏈嶅姟鍣ㄥ悕鍗曪紝璇锋鏌ョ綉缁滃悗閲嶈瘯', 'error'); return; }
  var data = res.data || {};

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
  res = await Admin.api('/api/admin/roster', { method: 'POST', body: newData });
  if (res.ok) {
    Admin.toast('濮撳悕姹犲凡淇濆瓨', 'success');
  } else {
    Admin.toast(res.data.error || '淇濆瓨澶辫触', 'error');
  }
}

PageRegistry.register({
  id: 'roster',
  label: '濮撳悕姹?,
  icon: '馃彨',
  roles: ['admin'],
  render: render,
});

})();
