/* ============================================================
   SeaScribe Admin — English Files Manager
   ============================================================ */

(function() {

  window.AdminFiles = {
    render: render,
  };

  function render() {
    var content = document.getElementById('admin-content');
    content.innerHTML =
      '<div class="admin-card">' +
        '<h3>📂 英语文件管理</h3>' +
        '<div class="admin-upload-zone" id="files-upload-zone">' +
          '📤 点击或拖拽上传 .xlsx / .csv 文件' +
          '<input type="file" id="files-upload-input" accept=".xlsx,.xls,.csv">' +
        '</div>' +
        '<p id="files-msg" class="admin-msg hidden"></p>' +
        '<h4 style="margin-bottom:8px">已有文件</h4>' +
        '<div id="files-table-wrap"></div>' +
      '</div>';

    var zone = document.getElementById('files-upload-zone');
    var input = document.getElementById('files-upload-input');

    zone.addEventListener('click', function() { input.click(); });
    input.addEventListener('change', function() {
      if (input.files.length) handleUpload(input.files[0]);
    });
    zone.addEventListener('dragover', function(e) { e.preventDefault(); zone.style.borderColor = 'var(--admin-accent)'; });
    zone.addEventListener('dragleave', function() { zone.style.borderColor = ''; });
    zone.addEventListener('drop', function(e) {
      e.preventDefault();
      zone.style.borderColor = '';
      if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files[0]);
    });

    loadFiles();
  }

  async function handleUpload(file) {
    var ext = file.name.split('.').pop().toLowerCase();
    if (['xlsx', 'xls', 'csv'].indexOf(ext) < 0) {
      showMsg('error', '仅支持 .xlsx .xls .csv 文件');
      return;
    }
    showMsg('', '上传中…');
    // Read as base64
    var reader = new FileReader();
    reader.onload = async function() {
      var b64 = reader.result.split(',')[1];
      var res = await Admin.api('/api/admin/upload/english', {
        method: 'POST',
        body: { filename: file.name, content: b64 },
      });
      if (res.ok) {
        showMsg('success', '上传成功: ' + file.name);
        loadFiles();
      } else {
        showMsg('error', res.data.error || '上传失败');
      }
    };
    reader.readAsDataURL(file);
  }

  async function loadFiles() {
    var res = await Admin.api('/api/english-files');
    if (!res.ok) return;
    var files = res.data;
    if (!files.length) {
      document.getElementById('files-table-wrap').innerHTML = '<p style="color:var(--admin-muted)">暂无文件</p>';
      return;
    }
    var html = '<table class="admin-table"><thead><tr><th>文件名</th><th>操作</th></tr></thead><tbody>';
    files.forEach(function(f) {
      html += '<tr><td>' + Admin.esc(f.name) + '</td>' +
        '<td><button class="admin-btn admin-btn-danger admin-btn-sm" data-del="' + Admin.esc(f.name) + '">删除</button></td></tr>';
    });
    html += '</tbody></table>';
    document.getElementById('files-table-wrap').innerHTML = html;

    document.querySelectorAll('[data-del]').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        var name = this.dataset.del;
        if (!confirm('确定删除「' + name + '」吗？')) return;
        var r = await Admin.api('/api/admin/delete-file/english', {
          method: 'POST',
          body: { filename: name },
        });
        if (r.ok) loadFiles();
        else alert(r.data.error || '删除失败');
      });
    });
  }

  function showMsg(type, text) {
    var el = document.getElementById('files-msg');
    el.textContent = text;
    el.className = 'admin-msg ' + (type ? 'admin-msg-' + type : '');
    el.classList.remove('hidden');
    if (type === 'success' || type === 'error') {
      setTimeout(function() { el.classList.add('hidden'); }, 4000);
    }
  }
})();
