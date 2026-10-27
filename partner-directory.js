/* =============================================================================
   partner-directory.js · the professional Referral Partner directory (Referrals & Marketing > Referral Partners)
   =============================================================================
   Samantha, 2026-10-26 ("an easy-to-use directory showing all our professional referral partners, their contacts, who is
   responsible for the relationship, the last contact, the next follow-up, and how many clients they've referred").
   It replaces the old card list under "All organizations". It only READS what the Hub already keeps:
     · referral_orgs (the partner, its contacts, owner_email), referral_activities (touches), activities (planned touches),
       leads (referrals and starts), all through PartnerRules.look, the same rules the weekly desk uses
   Professional partners only: anything with a program_track (Community Ambassadors, and later Friends & Family people)
   never shows here. No money of any kind is shown. Every action opens the tool that already does it (the profile, the
   phone-friendly Log a touch, Schedule, Edit), so nothing about how touches are saved changes.
   ============================================================================= */
(function(){
  'use strict';
  const lc = v => String(v == null ? '' : v).trim().toLowerCase();
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const PR = () => window.PartnerRules;
  const DIR = { q:'', type:'', who:'', sort:'name', archived:false };

  /* professional partners only: no program_track at all */
  const isProfessional = o => !!o && !o.program_track;

  /* the main contact: the first saved person (not archived), else the old free-text "people" line */
  function mainContact(o){
    const c = (o.contacts || []).find(x => x && !x.archived && (x.name || x.phone || x.email));
    if(c) return { name:c.name || '', role:c.role || c.title || '', phone:c.phone || '', email:c.email || '' };
    if(o.people) return { name:String(o.people).split(/[,;\n]/)[0].trim(), role:'', phone:o.phone || '', email:o.email || '' };
    return { name:'', role:'', phone:o.phone || '', email:o.email || '' };
  }
  /* pure: one row per professional partner, everything the table shows. nameOf turns an owner email into a name. */
  function rows(orgs, ctx, nameOf){
    nameOf = nameOf || (e => String(e || '').split('@')[0]);
    return (orgs || []).filter(isProfessional).map(o => {
      const x = PR().look(o, ctx), own = PR().ownerOf(o), c = mainContact(o);
      const next = x.planned && x.planned.due ? { on:String(x.planned.due).slice(0, 10), how:'planned' } : { on:x.due, how:'due' };
      return { id:String(o.id), name:o.name || '(no name)', type:o.type || '', archived:!!o.archived, contact:c,
        owner_email:own.email, owner:own.email ? nameOf(own.email) : '', last:x.last_touch, next, overdue:!o.archived && !!next.on && next.on < x_today(ctx),
        referrals:x.sent, starts:x.became, tier:x.tier_label,
        hay:lc([o.name, o.type, o.people, nameOf(own.email)].concat((o.contacts || []).filter(k => k && !k.archived).map(k => [k.name, k.role, k.email, k.phone].join(' '))).join(' ')) };
    });
  }
  const x_today = ctx => String((ctx && ctx.today) || new Date().toISOString()).slice(0, 10);
  /* pure: the search box and the filters */
  function filter(list, f, me){
    f = f || {}; const q = lc(f.q);
    return list.filter(r => (f.archived || !r.archived)
      && (!q || q.split(/\s+/).every(w => r.hay.includes(w)))
      && (!f.type || r.type === f.type)
      && (!f.who || (f.who === 'mine' ? r.owner_email === lc(me) : f.who === 'none' ? !r.owner_email : r.owner_email === lc(f.who))));
  }
  function sortRows(list, by){
    const s = list.slice(), nm = (a, b) => a.name.localeCompare(b.name);
    if(by === 'next') return s.sort((a, b) => String(a.next.on || '9999').localeCompare(String(b.next.on || '9999')) || nm(a, b));
    if(by === 'last') return s.sort((a, b) => String(a.last || '0000').localeCompare(String(b.last || '0000')) || nm(a, b));
    if(by === 'referrals') return s.sort((a, b) => b.referrals - a.referrals || b.starts - a.starts || nm(a, b));
    return s.sort(nm);
  }

  /* ── the page ── */
  const day = d => d ? new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:String(d).slice(0, 4) === String(new Date().getFullYear()) ? undefined : 'numeric' }) : '';
  /* the Hub's DATA is a page-wide variable, not a window property */
  const data = () => (typeof DATA !== 'undefined' && DATA) || {};
  const ctx = () => ({ today:new Date().toISOString().slice(0, 10), leads:(typeof leadsCounted === 'function' ? leadsCounted() : data().leads || []),
    activities:data().referral_activities || [], planned:data().activities || [], settings:data().ops_settings || {} });
  const people = () => (typeof OPS_PEOPLE !== 'undefined' && OPS_PEOPLE || []).filter(x => x && x.primary_email).map(x => ({ email:lc(x.primary_email), name:x.full_name || x.primary_email }));
  const nameOf = e => { const p = people().find(x => x.email === lc(e)); return p ? p.name : String(e || '').split('@')[0]; };
  const me = () => lc((typeof ME !== 'undefined' && ME && ME.email) || '');

  function controls(all){
    const types = [...new Set(all.map(r => r.type).filter(Boolean))].sort();
    const owners = [...new Map(all.filter(r => r.owner_email).map(r => [r.owner_email, r.owner])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
    const opt = (v, t, cur) => '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(t) + '</option>';
    return '<div class="pdir-bar">'
      + '<label class="pdir-search"><span class="sr-only">Search partners</span><input id="pdirQ" type="search" placeholder="Search organizations, people, phone or email" value="' + esc(DIR.q) + '" oninput="PartnerDirectory.set(\'q\', this.value)"></label>'
      + '<label><span class="sr-only">Type</span><select id="pdirType" onchange="PartnerDirectory.set(\'type\', this.value)">' + opt('', 'All types', DIR.type) + types.map(t => opt(t, t, DIR.type)).join('') + '</select></label>'
      + '<label><span class="sr-only">Responsible</span><select id="pdirWho" onchange="PartnerDirectory.set(\'who\', this.value)">' + opt('', 'Everyone responsible', DIR.who) + opt('mine', 'Mine', DIR.who) + opt('none', 'Needs an owner', DIR.who)
        + owners.map(([e, n]) => opt(e, n, DIR.who)).join('') + '</select></label>'
      + '<label><span class="sr-only">Sort</span><select id="pdirSort" onchange="PartnerDirectory.set(\'sort\', this.value)">' + opt('name', 'Sort: name', DIR.sort) + opt('next', 'Sort: next follow-up', DIR.sort)
        + opt('last', 'Sort: longest since contact', DIR.sort) + opt('referrals', 'Sort: most referrals', DIR.sort) + '</select></label>'
      + '<label class="pdir-chk"><input type="checkbox" id="pdirArch"' + (DIR.archived ? ' checked' : '') + ' onchange="PartnerDirectory.set(\'archived\', this.checked)"> Show archived</label>'
      + '</div>';
  }
  function rowHtml(r){
    const c = r.contact, id = esc(r.id);
    const contact = c.name || c.phone || c.email
      ? '<b>' + esc(c.name || c.phone || c.email) + '</b>' + (c.role ? '<span class="pdir-sub">' + esc(c.role) + '</span>' : '') + (c.name && (c.phone || c.email) ? '<span class="pdir-sub">' + esc(c.phone || c.email) + '</span>' : '')
      : '<span class="pdir-none">No contact yet</span>';
    const next = r.archived ? '<span class="pdir-none">Archived</span>' : r.next.on
      ? (r.overdue ? '<span class="pdir-pill pdir-late">Overdue · ' + esc(day(r.next.on)) + '</span>' : esc(day(r.next.on)) + (r.next.how === 'planned' ? '<span class="pdir-sub">planned</span>' : ''))
      : '<span class="pdir-none">Not set</span>';
    return '<tr data-org="' + id + '">'
      + '<td data-l="Organization"><a href="javascript:void(0)" class="pdir-name" onclick="openRefProfile(\'' + id + '\')">' + esc(r.name) + '</a>' + (r.type ? '<span class="pdir-sub">' + esc(r.type) + '</span>' : '') + '</td>'
      + '<td data-l="Main contact"><div class="pdir-v">' + contact + '</div></td>'
      + '<td data-l="Responsible"><div class="pdir-v">' + (r.owner ? esc(r.owner) : '<span class="pdir-pill pdir-own">Needs an owner</span>') + '</div></td>'
      + '<td data-l="Last contact">' + (r.last ? esc(day(r.last)) : '<span class="pdir-none">Never</span>') + '</td>'
      + '<td data-l="Next follow-up"><div class="pdir-v">' + next + '</div></td>'
      + '<td data-l="Referrals" class="pdir-num">' + r.referrals + '</td>'
      + '<td data-l="Client starts" class="pdir-num">' + r.starts + '</td>'
      + '<td data-l="" class="pdir-acts"><button class="fb" onclick="pdLogOpen(\'' + id + '\')">Log a touch</button><button class="linklike" onclick="openActivityModal(null,\'' + id + '\')">Schedule</button><button class="linklike" onclick="openOrgModal(\'' + id + '\')">Edit</button></td>'
      + '</tr>';
  }
  function render(){
    const wrap = document.getElementById('referrersWrap'); if(!wrap) return;
    const src = (typeof ccDeskOrgs === 'function' ? ccDeskOrgs() : data().referral_orgs || []);
    const all = rows(src, ctx(), nameOf);
    if(!all.length){ wrap.innerHTML = '<div class="card"><div class="empty">No referral partners yet. Add the hospitals, rehabs and offices that send (or should send) you clients.</div></div>'; return; }
    const shown = sortRows(filter(all, DIR, me()), DIR.sort), arch = all.filter(r => r.archived).length;
    const focus = document.activeElement && document.activeElement.id, pos = focus === 'pdirQ' ? document.activeElement.selectionStart : null;
    wrap.innerHTML = controls(all)
      + '<div class="pdir-count" id="pdirCount">' + shown.length + ' of ' + all.filter(r => DIR.archived || !r.archived).length + ' partners' + (arch && !DIR.archived ? ' · ' + arch + ' archived not shown' : '') + '</div>'
      + (shown.length
        ? '<div class="pdir-wrap"><table class="pdir" id="pdirTable"><thead><tr><th>Organization</th><th>Main contact</th><th>Responsible</th><th>Last contact</th><th>Next follow-up</th><th class="pdir-num">Referrals</th><th class="pdir-num">Client starts</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>'
          + shown.map(rowHtml).join('') + '</tbody></table></div>'
        : '<div class="card"><div class="empty">No partners match. Clear the search or filters to see them all.</div></div>')
      + '<div class="field-note pdir-foot">Referrals = inquiries linked to the partner. Client starts = those families\' first clock-in in AxisCare (or the day they said yes). Next follow-up = a planned touch, else when the desk says it\'s due.</div>';
    if(focus === 'pdirQ'){ const q = document.getElementById('pdirQ'); if(q){ q.focus(); try{ q.setSelectionRange(pos, pos); }catch(e){} } }
  }
  function set(k, v){ DIR[k] = v; render(); }

  /* the look: a table on a computer, one card per partner on a phone (no sideways scrolling) */
  if(typeof document !== 'undefined' && !document.getElementById('pdirCss')){ const s = document.createElement('style'); s.id = 'pdirCss'; s.textContent = [
    '.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
    '.pdir-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:4px 0 8px}.pdir-bar label{margin:0}.pdir-bar select{width:auto}',
    '.pdir-search{flex:1 1 280px;min-width:0}.pdir-search input{width:100%}.pdir-chk{display:flex;gap:6px;align-items:center;font-size:13px;color:var(--text-muted)}.pdir-chk input{width:auto;margin:0}',
    '.pdir-count{font-size:12.5px;color:var(--text-muted);margin:0 0 6px}',
    '.pdir-wrap{background:#fff;border:1px solid var(--border);border-radius:10px;overflow-x:auto}',
    '.pdir{width:100%;border-collapse:collapse;font-size:13.5px}.pdir th{text-align:left;font-size:11.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--text-muted);background:#F7F8FA;padding:9px 12px;border-bottom:1px solid var(--border);white-space:nowrap}',
    '.pdir td{padding:10px 12px;border-bottom:1px solid var(--border);vertical-align:top}.pdir tr:last-child td{border-bottom:0}.pdir tbody tr:hover{background:#FAFBFC}',
    '.pdir-name{font-weight:800;color:var(--navy);text-decoration:none}.pdir-name:hover{text-decoration:underline}.pdir-sub{display:block;font-size:12px;color:var(--text-muted);margin-top:2px}',
    '.pdir-none{color:var(--text-muted);font-size:12.5px}.pdir-num{text-align:right;font-variant-numeric:tabular-nums;font-weight:700}',
    '.pdir-pill{display:inline-block;font-size:11.5px;font-weight:800;padding:2px 8px;border-radius:999px;white-space:nowrap}.pdir-late{background:#FDECEC;color:#B42318}.pdir-own{background:#FDF1DC;color:#8A5A12}',
    '.pdir-head{margin:4px 0 6px}.ff-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}.ff-tile{border:1px solid var(--border);border-radius:10px;padding:10px 12px;background:#FAFBFC;display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--text-muted)}.ff-tile b{color:var(--navy);font-size:13.5px}',
    '.pdir-acts{white-space:nowrap;text-align:right}.pdir-acts button{margin-left:6px}.pdir-foot{margin:8px 2px 4px;font-size:12px}',
    '@media (max-width:760px){.pdir-wrap{background:transparent;border:0;overflow:visible}.pdir thead{display:none}.pdir,.pdir tbody,.pdir tr,.pdir td{display:block;width:100%}',
    '.pdir tr{background:#fff;border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-bottom:10px}.pdir td{border:0;padding:4px 0;display:flex;gap:10px;justify-content:space-between;text-align:right}',
    '.pdir td::before{content:attr(data-l);font-size:12px;font-weight:700;color:var(--text-muted);text-align:left;flex:0 0 auto}.pdir td[data-l=""]::before{content:none}',
    '.pdir td:first-child{display:block;text-align:left;font-size:15px}.pdir td:first-child::before{content:none}.pdir-v{display:flex;flex-direction:column;align-items:flex-end;min-width:0}.pdir-acts{justify-content:flex-start!important;flex-wrap:wrap;padding-top:8px!important}.pdir-acts button{margin:0 8px 0 0}.pdir-sub{margin-top:0}}'
  ].join(''); document.head.appendChild(s); }

  window.PartnerDirectory = { rows, filter, sortRows, mainContact, isProfessional, render, set, state:DIR };
})();
