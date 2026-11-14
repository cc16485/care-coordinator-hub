/* =============================================================================
   partner-email-list.js · the partner EMAIL LIST (Referrals & Marketing > Referral Partners)
   =============================================================================
   Samantha, 2026-11-13: "i have very little interest in building relationships by brining cookies and begging for
   referrals, I want them to see us as a superior choice for home care." and, asked how to add the organizations found
   for her: "Yes, email-only".
   An organization on the email list is a referral_orgs item with program_track 'email_list'. Like every other
   program_track it is kept off the visit desk: no owner to assign, no follow-up dates, nothing on Today or My Work
   (ccDeskOrgs, partner-rules, the directory all skip it). It can receive the partner emails. "Make a full partner"
   takes the track off, and from then on it is an ordinary partner with an owner and visit timing.
   It only reads and saves what the Hub already keeps (referral_orgs through persist); no new storage.
   ============================================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PartnerEmailList = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const TRACK = 'email_list';
  const lc = v => String(v == null ? '' : v).trim().toLowerCase();
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const isEmailList = o => !!o && o.program_track === TRACK;
  const safeUrl = u => /^https?:\/\//i.test(String(u || '')) ? String(u) : '';
  const VIEW = { q:'' };

  /* pure: one row per organization on the list (not archived), by name */
  function rows(orgs){
    return (orgs || []).filter(o => isEmailList(o) && !o.archived).map(o => {
      const c = (o.contacts || []).find(x => x && !x.archived && (x.name || x.email)) || {};
      return { id:String(o.id), name:o.name || '(no name)', type:o.type || '', email:o.email || c.email || '',
        contact:c.name || '', role:c.role || '', phone:o.phone || '', source:safeUrl(o.email_source_url), city:o.city || '',
        hay:lc([o.name, o.type, o.email, c.name, c.role, c.email, o.city].join(' ')) };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }
  const filter = (list, q) => { q = lc(q); return q ? list.filter(r => r.hay.includes(q)) : list; };
  /* pure: what "Make a full partner" saves. The track comes off; who did it and when stays on the record. */
  function promoted(o, by, at){
    const n = Object.assign({}, o); delete n.program_track;
    n.email_list_promoted = { by:by || '', at:at || new Date().toISOString() };
    return n;
  }

  const data = () => (typeof DATA !== 'undefined' ? DATA : {});
  const actor = () => (typeof ccActor === 'function' ? ccActor() : { email:'', name:'' });
  const org = id => (data().referral_orgs || []).find(o => String(o.id) === String(id)) || null;
  const ask = async m => (typeof ccConfirm === 'function' ? await ccConfirm(m) : confirm(m));
  const refresh = () => { if(typeof renderReferrers === 'function') renderReferrers(); else render(); };

  async function promote(id){
    const o = org(id); if(!o || !isEmailList(o)) return;
    if(!(await ask('Make ' + o.name + ' a full partner?\n\nIt moves to the Directory. It will need an owner, and it will start getting follow-up dates on the visit desk.'))) return;
    const n = promoted(o, actor().email);
    const i = data().referral_orgs.findIndex(x => String(x.id) === String(id)); if(i >= 0) data().referral_orgs[i] = n;
    await persist('referral_orgs', n); refresh();
  }
  async function remove(id){
    const o = org(id); if(!o || !isEmailList(o)) return;
    if(!(await ask('Take ' + o.name + ' off the email list?\n\nThey will get no more partner emails. The record is kept, not deleted.'))) return;
    o.archived = true; o.archived_at = new Date().toISOString(); o.archived_by = actor().email;
    await persist('referral_orgs', o); refresh();
  }
  function rowHtml(r){
    const id = esc(r.id);
    return '<tr><td data-l="Organization"><b class="pdir-name">' + esc(r.name) + '</b><span class="pdir-sub">' + esc([r.type, r.city].filter(Boolean).join(' · ')) + '</span></td>'
      + '<td data-l="Email">' + (r.email ? esc(r.email) : '<span class="pdir-none">none yet</span>')
        + (r.source ? '<span class="pdir-sub"><a href="' + esc(r.source) + '" target="_blank" rel="noopener">where it was found</a></span>' : '') + '</td>'
      + '<td data-l="Contact">' + (r.contact ? esc(r.contact) + (r.role ? '<span class="pdir-sub">' + esc(r.role) + '</span>' : '') : '<span class="pdir-none">general address</span>') + '</td>'
      + '<td data-l="Phone">' + (r.phone ? esc(r.phone) : '<span class="pdir-none">none</span>') + '</td>'
      + '<td data-l="" class="pdir-acts"><button class="linklike" onclick="openOrgModal(\'' + id + '\')">Edit</button>'
        + '<button class="linklike" onclick="PartnerEmailList.promote(\'' + id + '\')">Make a full partner</button>'
        + '<button class="linklike" onclick="PartnerEmailList.remove(\'' + id + '\')">Take off the list</button></td></tr>';
  }
  function render(){
    const wrap = document.getElementById('refEmailList'); if(!wrap) return;
    const all = rows(data().referral_orgs), shown = filter(all, VIEW.q);
    if(!all.length){ wrap.innerHTML = ''; return; }
    const withEmail = all.filter(r => r.email).length;
    const focus = document.activeElement && document.activeElement.id === 'pelQ', pos = focus ? document.activeElement.selectionStart : null;
    wrap.innerHTML = '<div class="pdir-head" style="margin-top:18px;"><b style="font-size:15.5px;font-weight:800;color:var(--navy);">Email list</b></div>'
      + '<div class="field-note" style="margin:0 0 8px;">Organizations that get our partner emails and nothing else. They have no owner, no follow-up dates and no visit to plan, and they are not on Today or My Work. If one starts referring, make it a full partner.</div>'
      + '<div class="pdir-bar"><div class="pdir-search"><label class="sr-only" for="pelQ">Search the email list</label><input id="pelQ" class="search" placeholder="Search the email list" value="' + esc(VIEW.q) + '" oninput="PartnerEmailList.set(this.value)"></div></div>'
      + '<div class="pdir-count">' + shown.length + ' of ' + all.length + ' organizations · ' + withEmail + ' with an email address</div>'
      + (shown.length
        ? '<div class="pdir-wrap"><table class="pdir" id="pelTable"><thead><tr><th>Organization</th><th>Email</th><th>Contact</th><th>Phone</th><th></th></tr></thead><tbody>' + shown.map(rowHtml).join('') + '</tbody></table></div>'
        : '<div class="card"><div class="empty">Nothing on the email list matches. Clear the search to see them all.</div></div>');
    if(focus){ const q = document.getElementById('pelQ'); if(q){ q.focus(); try{ q.setSelectionRange(pos, pos); }catch(e){} } }
  }
  function set(v){ VIEW.q = v; render(); }
  return { TRACK, isEmailList, rows, filter, promoted, render, set, promote, remove };
});
