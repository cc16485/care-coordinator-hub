/* node tests/deciding-stays-test.js
   CRM plan step A (Samantha 2026-10-15, yes to all): a family past the assessment who has not said yes stays a lead
   ("Assessment · deciding") instead of becoming 'ready', which took them off the Leads board while Starting care
   waited for the yes. Loads the real client-journey.js with the journey list stubbed. */
const fs = require('fs'), path = require('path'), vm = require('vm');
let pass = 0, fail = 0;
const ck = (name, ok, extra) => { if (ok) pass++; else fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (ok || extra === undefined ? '' : '  ' + JSON.stringify(extra))); };
const win = { JourneyRules:{ STAGES:['intake','prechecks','assessment','signed','axiscare','billing','schedule','team','ready','firstweek','active'], ymd:() => '2026-10-15' } };
const ctx = { window:win, document:{ head:{ appendChild(){} }, createElement:() => ({}) , getElementById:() => null }, console, Date, JSON, String, Object, Array, Promise, setTimeout:(f, ms) => setTimeout(() => { try{ f(); }catch(e){} }, ms), setInterval:() => 0,
  DATA:{ ops_settings:{ client_journey_live:true } }, ccIsOwner:() => true };
ctx.window.window = ctx.window; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'client-journey.js'), 'utf8'), ctx);
const stageFor = win.cjStageFor;
/* stub the list: journeys keyed by lead id */
let rows = [];
const J = (lead_id, stage, extra) => Object.assign({ journey_id:'j' + lead_id, lead_id, stage, status:'open' }, extra || {});
const setRows = r => { rows = r; win.__rows = r; };
/* listRows fills its cache from the client-journey function; answer that call with the rows above */
ctx.sb = { auth:{ getSession:async () => ({ data:{ session:{ access_token:'t' } } }) } };
ctx.CONFIG = { supabase_url:'x', supabase_anon_key:'k' };
ctx.fetch = async () => ({ status:200, json:async () => ({ journeys:rows }) });
(async () => {
  setRows([J('1', 'signed'), J('2', 'signed'), J('3', 'signed'), J('4', 'assessment'), J('5', 'team'), J('6', 'axiscare')]);
  stageFor({ lead:{ id:'1' } });                      /* first read starts the load */
  await new Promise(r => setTimeout(r, 10));
  const s1 = stageFor({ lead:{ id:'1', status:'Assessment Scheduled' } });
  ck('past the assessment, no yes yet: assessment · deciding (stays on the Leads board)', s1 && s1.k === 'assessment' && s1.d === 'deciding', s1);
  const s2 = stageFor({ lead:{ id:'2', status:'Contacted', said_yes_at:'2026-10-14T15:00:00Z' } });
  ck('said yes: ready (Starting care)', s2 && s2.k === 'ready', s2);
  const s3 = stageFor({ lead:{ id:'3', status:'Converted' } });
  ck('Converted without said_yes_at: ready', s3 && s3.k === 'ready', s3);
  const s4 = stageFor({ lead:{ id:'4', status:'Assessment Scheduled' } });
  ck('still at the assessment: assessment, no extra word', s4 && s4.k === 'assessment' && s4.d === '', s4);
  const s5 = stageFor({ lead:{ id:'5', said_yes_at:'2026-10-10' } });
  ck('said yes and at Team: ready · first shift', s5 && s5.k === 'ready' && s5.d === 'first shift', s5);
  const s6 = stageFor({ r:{ axiscare_client_id:'77' }, ax:'77' });
  ck('no lead (AxisCare client): unchanged, ready', s6 === null || s6.k === 'ready' || s6.k === 'new', s6);
  ck('no em dash in the change', !/—/.test(fs.readFileSync(path.join(__dirname, '..', 'client-journey.js'), 'utf8').split('CRM plan step A')[1].slice(0, 400)));
  console.log(`deciding-stays: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
