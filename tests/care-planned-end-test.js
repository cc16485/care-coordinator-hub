/* node tests/care-planned-end-test.js
   Planned end of care on the profile (Samantha 2026-10-15: "both new reasons under the 21-day notice rule, plus planned
   future end dates"). Runs the real client-care.js with a stand-in page and the care_state the server returns. */
const fs = require('fs'), path = require('path'), vm = require('vm');
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { if (ok) pass++; else fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || extra === undefined ? '' : '  ' + JSON.stringify(extra).slice(0, 400))); };
const box = { innerHTML:'' };
const doc = { getElementById:id => id === 'ccCare' ? box : null, createElement:() => ({ textContent:'' }), head:{ appendChild(){} }, body:{ appendChild(){} }, querySelector:() => null };
let STATE = null, CALLS = [];
const win = {};
const ctx = { window:win, document:doc, console, Date, Intl, JSON, String, Object, Array, Promise, setTimeout, cjCall:async b => { CALLS.push(b); return b.action === 'care_state' ? STATE : { outcome:'cancelled' }; },
  escapeHtmlComms:s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c])), ccToast:() => {} };
ctx.window = Object.assign(win, ctx); vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'client-care.js'), 'utf8'), ctx);
const base = { axiscare_client_id:'296', client_name:'Edward Anderson', state:'active', pause:null, payer:'private', episodes:[], roles:[{ status:'active' }],
  reasons:{ end:{ moved_cds:'Moved to Caring CDS (we no longer provide IHS or ADW)', program_ended:'We no longer provide this program (IHS or ADW)', other:'Other' }, pause:{} },
  discharge:{ moved_cds:'notice21', program_ended:'notice21' }, always_medicaid:['moved_cds', 'program_ended'] };
(async () => {
  const pe = { change_id:'c1', kind:'end_planned', reason:'moved_cds', effective_date:'2026-11-16', made_by:'samantha@mo-care.com', made_by_name:'Samantha Troutman', made_at:'2026-10-15T18:00:00Z',
    checklist:[{ key:'notice_21', label:'21-day written notice to the participant or family', rule:'19 CSR 15-7.021(16)(D)', when:'', state:'done', on:'2026-10-20', by_name:'Samantha Troutman' }, { key:'continue_21', label:'Keep providing care for the 21 days', rule:'19 CSR 15-7.021(16)(D)', when:'', state:'open' }] };
  STATE = Object.assign({}, base, { planned_end:pe, changes:[pe], can:{ end:true, pause:true, cancel_end:true } });
  await win.ccCareMount({ ax:'296' });
  const h = box.innerHTML;
  ck('a planned end shows on the profile: "Care ends after Nov 16, 2026 (planned)", the reason and who recorded it', /Care ends after Nov 16, 2026<\/b> \(planned\)/.test(h) && /Moved to Caring CDS/.test(h) && /recorded by Samantha Troutman/.test(h), h.slice(0, 600));
  ck('...it says care continues until then and nothing is sent', /Care continues as normal until then/.test(h) && /Nothing is sent to anyone/.test(h));
  ck('...an owner sees Cancel the planned end, and no second End care button', /Cancel the planned end/.test(h) && !/>End care</.test(h));
  ck('...the 21-day steps of the planned end show, one done with its date and one still to do', /Medicaid steps for this planned end of care/.test(h) && /1 still to do/.test(h) && /Nov 16|Oct 20, 2026/.test(h), h.match(/Medicaid steps[^<]*/));
  ck('...the care history names it', /Care end planned \(last day\)/.test(h));
  STATE = Object.assign({}, STATE, { can:{ end:true, pause:true, cancel_end:false } }); await win.ccCareMount({ ax:'296' });
  ck('a Care Coordinator (cancel_end false) sees the plan but no Cancel button', /Care ends after/.test(box.innerHTML) && !/Cancel the planned end/.test(box.innerHTML));
  STATE = Object.assign({}, base, { planned_end:null, changes:[], can:{ end:true, pause:true } }); await win.ccCareMount({ ax:'296' });
  ck('no plan: End care is offered as before', />End care</.test(box.innerHTML) && !/Care ends after/.test(box.innerHTML));
  win.prompt = () => 'They are staying with us after all'; ctx.prompt = win.prompt;
  STATE = Object.assign({}, base, { planned_end:pe, changes:[pe], can:{ end:true, cancel_end:true } }); await win.ccCareMount({ ax:'296' });
  await win.ccCareCancelEnd();
  ck('Cancel the planned end sends the reason to the server', CALLS.some(b => b.action === 'care_end_cancel' && b.axiscare_client_id === '296' && b.explanation === 'They are staying with us after all'), CALLS.slice(-2));
  ck('no em dash in the screen', !/—/.test(fs.readFileSync(path.join(__dirname, '..', 'client-care.js'), 'utf8')));
  console.log(`care-planned-end: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
