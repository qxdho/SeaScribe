/* ============================================================
   SeaScribe — Dictation Engine
   shuffleAndPick: Fisher-Yates shuffle + pick `count` items.
   ============================================================ */

(function() {
  window.SeaScribe.shuffleAndPick = function(items, count) {
    var arr = items.slice();
    var n = arr.length;
    var limit = Math.min(count, n);
    for (var i = n - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr.slice(0, limit);
  };
})();
