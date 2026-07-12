/* ============================================================
   SeaScribe — Markdown Renderer
   Shared by about.js and changelog.js.
   ============================================================ */

(function() {

  /** Render Markdown string to HTML */
  function renderMarkdown(md) {
    // Strip HTML comments
    md = md.replace(/<!--[\s\S]*?-->/g, '');
    // Strip <p align=...> wrappers
    md = md.replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, '');

    var lines = md.split('\n');
    var out = [];
    var inCode = false, codeBuf = [];
    var inTable = false, tableBuf = [];

    function flushCode() {
      if (!codeBuf.length) return;
      out.push('<pre><code>' + SeaScribe.esc(codeBuf.join('\n')) + '</code></pre>');
      codeBuf = [];
    }

    function flushTable() {
      if (!tableBuf.length) return;
      var html = '<table>';
      tableBuf.forEach(function(row, i) {
        var tag = i === 0 ? 'th' : 'td';
        html += '<tr>' + row.map(function(c) { return '<' + tag + '>' + inlineMarkdown(c.trim()) + '</' + tag + '>'; }).join('') + '</tr>';
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
        else { flushTable(); inCode = true; }
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

      // Empty line
      if (!line.trim()) { out.push('<br>'); continue; }

      // Ordinary paragraph
      out.push('<p>' + inlineMarkdown(line) + '</p>');
    }

    flushCode();
    flushTable();

    return out.join('\n');
  }

  /** Inline Markdown: protect existing HTML, then handle bold/code/links */
  function inlineMarkdown(text) {
    // 1. Protect existing HTML tags from escaping
    var tags = [];
    text = text.replace(/<[^>]+>/g, function(m) {
      tags.push(m);
      return '\x00' + (tags.length - 1) + '\x00';
    });
    // 2. Handle image syntax ![alt](url)
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function(_, alt, url) {
      tags.push('<img src="' + url + '" alt="' + alt + '" style="max-width:100%">');
      return '\x00' + (tags.length - 1) + '\x00';
    });
    // 3. Escape remaining plain text
    text = SeaScribe.esc(text);
    // 4. Restore HTML tags
    text = text.replace(/\x00(\d+)\x00/g, function(_, n) { return tags[+n]; });
    // 5. Markdown syntax
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    return text;
  }

  window.SeaScribe.renderMarkdown = renderMarkdown;
})();
