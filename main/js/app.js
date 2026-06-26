/* ============================================================
   SeaScribe — Application Entry Point
   Loaded last; ties everything together.
   ============================================================ */

(function() {
  // Register plugins
  SubjectRegistry.register(EnglishPlugin);
  SubjectRegistry.register(ChemistryPlugin);

  // Render subject page
  window.SeaScribe.renderSubjectPage();

  // Hash routing: if URL has #/chemistry or #/english, open directly
  (function() {
    var h = location.hash;
    if (h && h.indexOf('#/') === 0) {
      var id = h.slice(2);
      var p = SubjectRegistry.get(id);
      if (p) window.SeaScribe.openSubject(p);
    }
  })();
})();
