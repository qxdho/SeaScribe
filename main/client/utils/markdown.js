/* ============================================================
   SeaScribe — Markdown Renderer (ES Module)
   ============================================================ */

import { SeaScribe } from '../core/state.js';

function renderMarkdown(md) {
  md = md.replace(/<!--[\s\S]*?-->/g, '');
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

    if (/^```/.test(line)) {
      if (inCode) { flushCode(); inCode = false; }
      else { flushTable(); inCode = true; }
      continue;
    }
    if (inCode) { codeBuf.push(line); continue; }

    if (/^\|[-| :]+\|$/.test(line.trim()) && tableBuf.length === 1) { continue; }

    if (/^\|.+\|$/.test(line.trim())) {
      if (!inTable) { flushTable(); inTable = true; }
      tableBuf.push(line.trim().split('|').filter(function(_,j,arr) { return j > 0 && j < arr.length - 1; }));
      continue;
    }
    if (inTable) { inTable = false; flushTable(); }

    var h = line.match(/^(#{1,6})\s+(.+)/);
    if (h) {
      out.push('<h' + h[1].length + '>' + inlineMarkdown(h[2]) + '</h' + h[1].length + '>');
      continue;
    }

    if (/^---+$/.test(line.trim())) { out.push('<hr>'); continue; }

    if (/^>\s?(.*)/.test(line)) {
      out.push('<blockquote>' + inlineMarkdown(line.replace(/^>\s?/, '')) + '</blockquote>');
      continue;
    }

    if (/^[\-\*]\s+(.+)/.test(line)) {
      out.push('<li>' + inlineMarkdown(line.replace(/^[\-\*]\s+/, '')) + '</li>');
      continue;
    }

    if (!line.trim()) { out.push('<br>'); continue; }
    out.push('<p>' + inlineMarkdown(line) + '</p>');
  }

  flushCode();
  flushTable();
  return out.join('\n');
}

function sanitizeUrl(url) {
  var trimmed = (url || '').trim();
  if (!trimmed) return '';
  var lower = trimmed.toLowerCase();
  if (/^(javascript|vbscript):/i.test(lower)) return '';
  if (/^data:/i.test(lower) && !/^data:image\//i.test(lower)) return '';
  return trimmed;
}

function inlineMarkdown(text) {
  var _allowed = /^<\/?(b|i|em|strong|u|s|del|ins|mark|small|sub|sup|br|hr|p|div|span|ul|ol|li|table|thead|tbody|tr|th|td|h[1-6]|blockquote|pre|code|a|img)(\s[^>]*)?\/?>$/i;
  var tags = [];
  text = text.replace(/<[^>]+>/g, function(m) {
    if (_allowed.test(m)) { tags.push(m); return '\x00' + (tags.length - 1) + '\x00'; }
    return '';
  });
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function(_, alt, url) {
    var safeUrl = sanitizeUrl(url);
    tags.push('<img src="' + SeaScribe.esc(safeUrl) + '" alt="' + SeaScribe.esc(alt || '') + '" style="max-width:100%">');
    return '\x00' + (tags.length - 1) + '\x00';
  });
  text = SeaScribe.esc(text);
  text = text.replace(/\x00(\d+)\x00/g, function(_, n) { return tags[+n]; });
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function(_, label, url) {
    var safeUrl = sanitizeUrl(url);
    return '<a href="' + SeaScribe.esc(safeUrl) + '" target="_blank" rel="noopener noreferrer">' + label + '</a>';
  });
  return text;
}

SeaScribe.renderMarkdown = renderMarkdown;
