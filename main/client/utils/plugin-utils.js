/* ============================================================
   SeaScribe — Plugin Utilities (ES Module)
   ============================================================ */

export const PluginUtils = {
  loadConfig: function(plugin, config, extraMap) {
    if (!config) return;
    var std = ['defaultCount','defaultColumns','defaultFontSize','defaultLayout',
               'gridColumns','listColumns','gridFontSize','listFontSize','scanURLs'];
    for (var i = 0; i < std.length; i++) {
      var k = std[i];
      if (config[k] != null) plugin[k] = config[k];
    }
    if (extraMap) {
      Object.keys(extraMap).forEach(function(ck) {
        if (config[ck] != null) plugin[extraMap[ck]] = config[ck];
      });
    }
    if (plugin._rangeEnd === 0 && plugin._data && plugin._data.length) {
      plugin._rangeEnd = plugin._data.length;
    }
  },

  scanDir: async function(url, extRegex) {
    var base = new URL(url, location.origin).href;
    var resp;
    try { resp = await fetch(base); }
    catch (e) { throw new Error('请求被阻止（CORS 或网络问题），请确保通过 HTTP 服务器访问'); }
    if (!resp.ok) throw new Error('目录不可达 (' + resp.status + ')');
    var ct = resp.headers.get('content-type') || '';
    if (ct.indexOf('application/json') >= 0) {
      var json = await resp.json();
      return json.filter(function(f) { return extRegex.test(f.name); }).map(function(f) {
        return { url: new URL(f.url, base).href, name: f.name };
      });
    }
    var html = await resp.text();
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, 'text/html');
    var links = [];
    doc.querySelectorAll('a[href]').forEach(function(a) {
      var href = a.getAttribute('href');
      var name = a.textContent.trim() || href;
      if (extRegex.test(href)) {
        links.push({ url: new URL(href, base).href, name: name });
      }
    });
    return links;
  },

  refreshCount: function(plugin) {
    setTimeout(function() {
      var cnt = document.getElementById('count-input');
      if (!cnt) return;
      var len = plugin._data ? plugin._data.length : 0;
      cnt.min = len ? 1 : 0;
      cnt.max = len || 1;
      if (parseInt(cnt.value) > len) cnt.value = len;
      if (!len) cnt.value = 0;
      else if (parseInt(cnt.value) === 0) cnt.value = Math.min(plugin.defaultCount, len);
    }, 50);
  },

  parseCSV: function(text) {
    var lines = text.split(/\r?\n/);
    var start = (lines[0] && /^\w+,/.test(lines[0])) ? 1 : 0;
    return lines.slice(start).filter(function(l) { return l.trim(); }).map(function(l) {
      var c = l.split(',');
      return { prompt: (c[0]||'').trim(), answer: (c[1]||'').trim() };
    });
  }
};

window.PluginUtils = PluginUtils;
