/* How did they hear about us? (2026-11-09, her monthly content scorecard on the Owners Hub Cockpit)
   One list for the Add lead form here and the Owners Hub scorecard (loaded from cc.mo-care.com/heard-about.js), so the
   choices and their names never differ between the two. Stored on the lead as heard_about (one key below, or '' = not
   asked yet). This is what BROUGHT them (a video, a search, a friend); "How did they reach us?" is the door they used. */
(function (root) {
  var OPTIONS = [
    ['google', 'Google search'],
    ['facebook', 'Facebook'],
    ['youtube', 'YouTube'],
    ['friend', 'A friend or family member'],
    ['professional', 'Hospital, doctor or case manager'],
    ['print', 'A flyer, sign or event'],
    ['other', 'Something else'],
  ];
  var NAMES = {};
  OPTIONS.forEach(function (o) { NAMES[o[0]] = o[1]; });
  function label(k) { return NAMES[k] || ''; }
  function optionsHtml(sel) {
    return '<option value="">Not asked yet</option>' + OPTIONS.map(function (o) {
      return '<option value="' + o[0] + '"' + (o[0] === sel ? ' selected' : '') + '>' + o[1] + '</option>';
    }).join('');
  }
  /* Counts per choice for a set of leads, with not-asked kept visible (no silent gaps). */
  function count(leads) {
    var out = { total: 0, not_asked: 0, by: {} };
    OPTIONS.forEach(function (o) { out.by[o[0]] = 0; });
    (leads || []).forEach(function (l) {
      out.total++;
      var k = l && l.heard_about;
      if (k && NAMES[k]) out.by[k]++; else out.not_asked++;
    });
    return out;
  }
  var api = { OPTIONS: OPTIONS, label: label, optionsHtml: optionsHtml, count: count };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.HeardAbout = api;
})(typeof window !== 'undefined' ? window : globalThis);
