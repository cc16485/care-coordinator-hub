/* =====================================================================================================================
   FROM THEIR STEP 1 APPLICATION (Desktop 458; Samantha, 2026-10-05: "can you pull 'step 1 application' in from their GHL
   account and save it into their profiles"; she approved what to keep). The caregiver page's Hiring & Experience tab.
   Reads public.caregiver_application_facts (office staff may read; only the server's step1-import writes it). That record
   only ever holds the approved details: their own words, experience without employer names, client-matching answers,
   availability and favorites. Never anything private (the import drops it twice). Reads only; changes nothing.
     S1.render(el, { axiscare_id, hub_id })
   ===================================================================================================================== */
(function (root) {
  'use strict';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var client = function () { try { if (typeof sb !== 'undefined' && sb) return sb; } catch (e) { /* not on this page */ } return root.__s1Sb || null; };
  var SERVICE = { companionship: 'Companionship', housekeeping: 'Housekeeping', errands_shopping: 'Errands and shopping', meal_preparation: 'Meal preparation',
    laundry: 'Laundry', transportation: 'Transportation', activities: 'Activities', medication_reminders: 'Medication reminders', dementia_care: "Dementia and Alzheimer's care" };
  var SHIFT = { mornings: 'Mornings', afternoons: 'Afternoons', evenings: 'Evenings', overnights: 'Overnights', live_in: 'Live-in', weekdays: 'Weekdays', weekends: 'Weekends' };
  var DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  var FAV = { candy_bar: 'Candy bar', soft_drink: 'Drink', snack: 'Snack', sandwich: 'Sandwich', food: 'Food', dessert: 'Dessert', restaurant: 'Restaurant', store: 'Store',
    music: 'Music', movies: 'Movies', sports_team: 'Sports team', flower: 'Flower', gift_card_places: 'Gift card ideas' };
  var cap = function (s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); };
  var day = function (iso) { return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Chicago' }) : ''; };

  async function load(w) {
    var c = client(); if (!c) throw new Error('Sign in first.');
    var q = function () { return c.from('caregiver_application_facts').select('facts,extracted_at,pages').order('extracted_at', { ascending: false }).limit(1); };
    var r = w.hub_id ? await q().eq('hub_caregiver_id', String(w.hub_id)) : { data: [] };
    if (r.error) throw r.error;
    if (!(r.data || []).length && w.axiscare_id) { r = await q().eq('axiscare_id', String(w.axiscare_id)); if (r.error) throw r.error; }
    return (r.data || [])[0] || null;
  }
  function html(row) {
    var f = row.facts || {}, w = f.own_words || {}, x = f.experience || {}, m = f.matching || {}, a = f.availability || {}, fav = f.favorites || {};
    var sec = function (title, body, note) { return body ? '<div style="margin:12px 0 4px;font-size:12px;font-weight:800;letter-spacing:.05em;color:var(--navy);">' + title + '</div>'
      + (note ? '<div class="field-note" style="margin:-2px 0 6px;">' + note + '</div>' : '') + body : ''; };
    var qa = function (q, v) { return v ? '<div style="margin-bottom:8px;"><div class="field-note">' + esc(q) + '</div><div style="font-size:13.5px;">' + esc(v) + '</div></div>' : ''; };
    var chip = function (t) { return '<span class="tag-chip" style="background:#E1F1ED;color:#1F7A8C;margin:0 4px 4px 0;display:inline-block;">' + esc(t) + '</span>'; };
    var yn = function (label, v) { return v ? '<div style="font-size:13px;">' + esc(label) + ': <b>' + esc(cap(v)) + '</b></div>' : ''; };
    var words = qa('What interests them in this position and working with the elderly', w.interest) + qa('Qualities that would make them a great Caring Companion', w.qualities)
      + qa('Why they want to work with us', w.why_us) + qa('Comfortable starting and carrying on conversations', w.conversation) + qa('Hobbies, special interests and talents', w.hobbies);
    var jobs = (x.jobs || []).map(function (j) { return '<div style="margin-bottom:6px;font-size:13.5px;"><b>' + esc(j.title || 'Job') + '</b>'
      + ((j.from || j.to) ? ' <span class="field-note">' + esc([j.from, j.to].filter(Boolean).join(' to ')) + '</span>' : '')
      + (j.duties ? '<div class="field-note">' + esc(j.duties) + '</div>' : '') + '</div>'; }).join('');
    var ed = x.education || {};
    var edu = ed.highest ? '<div style="font-size:13px;">Education: <b>' + esc(cap(ed.highest)) + '</b>' + (ed.subject ? ', ' + esc(ed.subject) : '') + (ed.graduated ? ' (graduated: ' + esc(ed.graduated) + ')' : '') + '</div>' : '';
    var match = ((m.services || []).length ? '<div style="margin-bottom:4px;">' + m.services.map(function (s) { return chip(SERVICE[s] || s); }).join('') + '</div>' : '')
      + yn('Clients on hospice', m.hospice) + yn('Homes with cats', m.cats) + yn('Homes with dogs', m.dogs) + yn('Homes with pets', m.pets) + yn('Clients who smoke', m.client_smokes)
      + (m.travel_miles != null ? '<div style="font-size:13px;">Will travel up to <b>' + esc(m.travel_miles) + ' miles</b></div>' : '')
      + yn('Comfortable making a basic meal', m.basic_meal) + yn('Help with daily living (bathing, dressing)', m.daily_living_help) + yn('Can follow driving directions', m.follows_directions)
      + yn('Has a GPS', m.has_gps) + yn('Smokes', m.smoker);
    var dayRows = function (o) { var r = DAYS.filter(function (d) { return o && o[d]; }); return r.length ? '<table style="font-size:12.5px;margin-top:4px;"><tbody>'
      + r.map(function (d) { return '<tr><td style="padding:2px 12px 2px 0;">' + cap(d) + '</td><td>' + esc(o[d]) + '</td></tr>'; }).join('') + '</tbody></table>' : ''; };
    var hours = [a.hours_ideal != null ? 'ideal ' + a.hours_ideal : '', a.hours_min != null ? 'minimum ' + a.hours_min : '', a.hours_max != null ? 'maximum ' + a.hours_max : ''].filter(Boolean).join(', ');
    var avail = (a.start_date ? '<div style="font-size:13px;">Can start: <b>' + esc(a.start_date) + '</b></div>' : '')
      + (a.full_or_part ? '<div style="font-size:13px;">Wants: <b>' + esc(cap(a.full_or_part)) + '</b>' + (hours ? ' · hours a week: ' + esc(hours) : '') + '</div>' : (hours ? '<div style="font-size:13px;">Hours a week: ' + esc(hours) + '</div>' : ''))
      + ((a.shifts || []).length ? '<div style="margin-top:4px;">' + a.shifts.map(function (s) { return chip(SHIFT[s] || s); }).join('') + '</div>' : '')
      + dayRows(a.days) + (Object.keys(a.overnight_days || {}).length ? '<div class="field-note" style="margin-top:4px;">Overnights</div>' + dayRows(a.overnight_days) : '');
    var favs = Object.keys(FAV).filter(function (k) { return fav[k]; }).map(function (k) { return '<div style="font-size:13px;">' + FAV[k] + ': <b>' + esc(fav[k]) + '</b></div>'; }).join('');
    var body = sec('IN THEIR OWN WORDS', words, 'Beef it up (on their Caregiver profile) can use these, their hobbies and their jobs.')
      + sec('EXPERIENCE', jobs + edu) + sec('FOR MATCHING THEM TO CLIENTS', match, 'For the office only.') + sec('AVAILABILITY (WHEN THEY APPLIED)', avail, 'For the office only.')
      + sec('THEIR FAVORITES', favs, 'For thank-yous. For the office only.');
    return (body || '<div class="field-note">Their Step 1 application was read, but nothing on the approved list was filled in.</div>')
      + '<div class="field-note" style="margin-top:10px;">Read from their Step 1 application in GoHighLevel on ' + esc(day(row.extracted_at)) + (row.pages ? ' (' + esc(row.pages) + ' pages)' : '')
      + '. Only the approved details are kept; nothing private (no Social Security or licence numbers, birth date, address, contacts or background answers). The PDF stays in GoHighLevel.</div>';
  }
  async function render(el, w) {
    if (!el) return;
    el.innerHTML = '<div class="field-note">Loading their Step 1 application…</div>';
    try {
      var row = await load(w || {});
      el.innerHTML = row ? html(row) : '<div class="field-note">No Step 1 application has been read for them yet. It comes from the "Upload Step 1 Application Packet" file on their GoHighLevel contact.</div>';
    } catch (e) { el.innerHTML = '<div class="field-note" style="color:var(--red);">Could not load their Step 1 application: ' + esc((e && e.message) || e) + '</div>'; }
  }
  root.S1 = { render: render, html: html };
})(typeof window !== 'undefined' ? window : globalThis);
