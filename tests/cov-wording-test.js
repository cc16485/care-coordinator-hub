// node tests/cov-wording-test.js
// Change the wording on an OPEN coverage case (her ask 2026-10-09: sweep-opened cases had no edit box).
// Pulls covPatLine / covComposeMsgs / covWordingRaw / covWordingPreview / covSaveWording / covResetWording
// out of index.html and runs them against stubs. Exits 1 on any failure.
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const fn=(name)=>{ const i=html.indexOf('function '+name+'('); if(i<0) throw new Error('missing '+name);
  let d=0,j=html.indexOf('{',i),k=j; for(;k<html.length;k++){ if(html[k]==='{')d++; else if(html[k]==='}'){d--; if(!d)break;} }
  return html.slice(html.lastIndexOf('\n',i)+1,k+1); };
const src=['covPatLine','covComposeMsgs','covWordingRaw','covWordingPreview','covEditWording','covSaveWording','covResetWording','covCancelWording'].map(fn).join('\n');
const log=[]; let fails=0; const ck=(n,ok,note)=>{ log.push((ok?'ok   ':'FAIL ')+n+(ok?'':'  <- '+note)); if(!ok) fails++; };
function world(cases){
  const persisted=[], events=[]; let alerted=null, rendered=0;
  const els={};
  const ctx={ DATA:{ ops_settings:{}, coverage_cases:cases, client_care_blurbs:[] },
    document:{ getElementById:id=>els[id]||null },
    persist:async(k,i)=>{ persisted.push([k,JSON.parse(JSON.stringify(i))]); },
    opEvent:(v,o)=>events.push([v,o]), renderCoverage:()=>{rendered++;}, ccActor:()=>({name:'Samantha'}),
    esc:x=>String(x==null?'':x), covIsOngoing:c=>!!(c.shift_pattern&&c.shift_pattern.kind==='open_ongoing'),
    alert:m=>{alerted=m;}, Date, String, Object, Array, JSON, console };
  const vm=require('vm'); vm.createContext(ctx);
  vm.runInContext('const COV_WORD_OPEN={};\n'+src+'\nthis.X={covPatLine,covComposeMsgs,covWordingRaw,covWordingPreview,covSaveWording,covResetWording,COV_WORD_OPEN};',ctx);
  return { X:ctx.X, DATA:ctx.DATA, els, persisted, events, get alerted(){return alerted}, get rendered(){return rendered} };
}
const tomorrow=(()=>{ const t=new Date(new Date().toLocaleString('sv-SE',{timeZone:'America/Chicago'}).slice(0,10)+'T12:00:00'); t.setDate(t.getDate()+1); return t.toISOString().slice(0,10); })();
const sweepCase=()=>({ id:'cwo_s1', client:'Dan Probstfield', client_axiscare_id:'777', shift_date:tomorrow, shift_time:'08:00-12:00',
  shift_pattern:{v:2,kind:'open_ongoing',weekday:'Saturday'}, opened_by:'coverage-watch', asked:[] });

(async()=>{
  // 1. a sweep case with no edits: preview shows the pattern line, editor has it baked, placeholders kept
  let w=world([sweepCase()]); let r=w.X.covWordingRaw(w.DATA.coverage_cases[0]);
  ck('editor text keeps {first_name} and {address} as placeholders', r.other.includes('{first_name}')&&r.other.includes('{address}'));
  ck('editor text bakes the pattern line in (picker path drops {pattern})', r.other.includes('This could become your regular Saturday shift.')&&!r.other.includes('{pattern}'));
  ck('editor text bakes client first name + when', r.tier1.includes('Dan tomorrow 8am-12pm')&&!r.tier1.includes('Probstfield'));
  ck('preview offers the Change the wording button', w.X.covWordingPreview(w.DATA.coverage_cases[0]).includes('covEditWording'));
  ck('preview shows no Edited marker before any edit', !w.X.covWordingPreview(w.DATA.coverage_cases[0]).includes('Edited for this shift'));

  // 2. save with the text untouched + a care note: no wording frozen, care note saved + remembered per client
  w=world([sweepCase()]); r=w.X.covWordingRaw(w.DATA.coverage_cases[0]);
  w.els['covWord1_cwo_s1']={value:r.tier1}; w.els['covWordO_cwo_s1']={value:r.other};
  w.els['covWordC_cwo_s1']={value:'  Dan is on hospice and needs help with care in bed, bathing, and supporting his wife. '};
  await w.X.covSaveWording('cwo_s1'); let c=w.DATA.coverage_cases[0];
  ck('unchanged wording is NOT stored on the case', !c.msg_tier1&&!c.msg_other);
  ck('care note saved trimmed', c.care_note==='Dan is on hospice and needs help with care in bed, bathing, and supporting his wife.');
  ck('care note remembered for the client', w.persisted.some(([k,i])=>k==='client_care_blurbs'&&i.id==='777'&&i.blurb===c.care_note));
  ck('case persisted + audit line + re-render', w.persisted.some(([k])=>k==='coverage_cases')&&w.events.some(([v])=>v==='cov_wording_edited')&&w.rendered===1);
  ck('preview now fills {care} with the note', w.X.covWordingPreview(c).includes('Dan is on hospice and needs help'));
  ck('tier 1 (works with Dan) never gets the care note', !w.X.covComposeMsgs(c).tier1.includes('hospice'));

  // 3. an edited "everyone else" text rides on the case; tier1 untouched
  w=world([sweepCase()]); r=w.X.covWordingRaw(w.DATA.coverage_cases[0]);
  w.els['covWord1_cwo_s1']={value:r.tier1}; w.els['covWordO_cwo_s1']={value:'Hi {first_name}, it\'s Caring Companions. New Saturday morning shift for Dan at {address}: tomorrow 8am-12pm. {care}Very sweet family! Can you take it? Reply YES or NO.'}; w.els['covWordC_cwo_s1']={value:''};
  await w.X.covSaveWording('cwo_s1'); c=w.DATA.coverage_cases[0];
  ck('edited everyone-else text stored on msg_other', String(c.msg_other||'').startsWith('Hi {first_name}, it\'s Caring Companions. New Saturday'));
  ck('tier1 left on the agency template', !c.msg_tier1);
  ck('preview marks it Edited', w.X.covWordingPreview(c).includes('Edited for this shift'));
  ck('preview renders the edited text with the explainers', w.X.covWordingPreview(c).includes('New Saturday morning shift for Dan at (street name'));
  // 3b. reset puts the usual wording back
  await w.X.covResetWording('cwo_s1'); ck('Back to the usual wording clears the edit', !c.msg_other&&w.events.some(([v])=>v==='cov_wording_reset'));

  // 4. an em dash is refused before anything changes
  w=world([sweepCase()]); r=w.X.covWordingRaw(w.DATA.coverage_cases[0]);
  w.els['covWord1_cwo_s1']={value:r.tier1}; w.els['covWordO_cwo_s1']={value:r.other+' Sweet family — really.'}; w.els['covWordC_cwo_s1']={value:'x'};
  await w.X.covSaveWording('cwo_s1'); c=w.DATA.coverage_cases[0];
  ck('em dash refused: alert, nothing saved, nothing persisted', /em dash/.test(w.alerted||'')&&!c.msg_other&&!c.care_note&&w.persisted.length===0);

  // 5. interest check: single message on msg_interest
  w=world([{ id:'ci1', kind:'interest', client:'Joel Carol Smith', shift_date:tomorrow, shift_time:'09:00-13:00', asked:[] }]);
  r=w.X.covWordingRaw(w.DATA.coverage_cases[0]); ck('interest case shows one message', r.interest&&r.tier1.includes('potential new client'));
  w.els['covWordI_ci1']={value:r.tier1.replace('Questions welcome.','Call the office with questions.')}; w.els['covWordC_ci1']={value:''};
  await w.X.covSaveWording('ci1'); c=w.DATA.coverage_cases[0];
  ck('interest edit stored on msg_interest only', String(c.msg_interest||'').includes('Call the office')&&!c.msg_tier1&&!c.msg_other);

  console.log(log.join('\n')); console.log(fails?fails+' FAILED':log.length+'/'+log.length+' passed'); process.exit(fails?1:0);
})();
