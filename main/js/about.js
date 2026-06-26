/* ============================================================
   SeaScribe — About Overlay
   从 README.md 加载内容并渲染为 HTML
   ============================================================ */

(function() {
  var overlay = document.getElementById('about-overlay');
  var body = document.getElementById('about-body');

  document.getElementById('btn-about').addEventListener('click', function() {
    overlay.classList.remove('hidden');
    fetch('README.md')
      .then(function(r) { return r.text(); })
      .then(function(md) {
        body.innerHTML = renderMarkdown(md);
      })
      .catch(function() { body.innerHTML = '<p>无法加载关于页面</p>'; });
  });

  document.getElementById('btn-about-close').addEventListener('click', function() {
    overlay.classList.add('hidden');
  });

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.classList.add('hidden');
  });

  /** 简单的 Markdown → HTML 渲染 */
  function renderMarkdown(md) {
    // 去掉 HTML 注释
    md = md.replace(/<!--[\s\S]*?-->/g, '');
    // 去掉 <p align=...> 包装
    md = md.replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, '');

    var lines = md.split('\n');
    var out = [];
    var inCode = false, codeBuf = [], codeLang = '';
    var inTable = false, tableBuf = [];

    function flushCode() {
      if (!codeBuf.length) return;
      out.push('<pre><code>' + esc(codeBuf.join('\n')) + '</code></pre>');
      codeBuf = [];
    }

    function flushTable() {
      if (!tableBuf.length) return;
      var html = '<table>';
      tableBuf.forEach(function(row, i) {
        var tag = i === 0 ? 'th' : 'td';
        html += '<tr>' + row.map(function(c) { return '<' + tag + '>' + c.trim() + '</' + tag + '>'; }).join('') + '</tr>';
      });
      html += '</table>';
      out.push(html);
      tableBuf = [];
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];

      // Code block
      if (/^```/.test(line)) {
        if (inCode) { flushCode(); inCode = false; }
        else { flushTable(); inCode = true; codeLang = line.slice(3).trim(); }
        continue;
      }
      if (inCode) { codeBuf.push(line); continue; }

      // Table separator line
      if (/^\|[-| :]+\|$/.test(line.trim()) && tableBuf.length === 1) { continue; }

      // Table row
      if (/^\|.+\|$/.test(line.trim())) {
        if (!inTable) { flushTable(); inTable = true; }
        tableBuf.push(line.trim().split('|').filter(function(_,j,arr) { return j > 0 && j < arr.length - 1; }));
        continue;
      }
      if (inTable && line.trim()) { inTable = false; flushTable(); }
      if (inTable) { inTable = false; flushTable(); }

      // Headers
      var h = line.match(/^(#{1,6})\s+(.+)/);
      if (h) {
        var lvl = h[1].length;
        out.push('<h' + lvl + '>' + inlineMarkdown(h[2]) + '</h' + lvl + '>');
        continue;
      }

      // HR
      if (/^---+$/.test(line.trim())) { out.push('<hr>'); continue; }

      // Blockquote
      if (/^>\s?(.*)/.test(line)) {
        out.push('<blockquote>' + inlineMarkdown(line.replace(/^>\s?/, '')) + '</blockquote>');
        continue;
      }

      // List item
      if (/^[\-\*]\s+(.+)/.test(line)) {
        out.push('<li>' + inlineMarkdown(line.replace(/^[\-\*]\s+/, '')) + '</li>');
        continue;
      }

      // Image
      line = line.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%">');

      // Empty line
      if (!line.trim()) { out.push('<br>'); continue; }

      // Ordinary paragraph
      out.push('<p>' + inlineMarkdown(line) + '</p>');
    }

    flushCode();
    flushTable();

    return out.join('\n');
  }

  /** 行内 Markdown：粗体、斜体、代码、链接 */
  function inlineMarkdown(text) {
    return esc(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  }

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }
})();
