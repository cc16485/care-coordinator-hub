// node tests/cov-followup-test.js
// Follow up with the people already asked on a coverage case (her ask 2026-10-09). Pulls the follow-up functions
// out of index.html and runs them against stubs (DOM, fetch, persist). Exits 1 on any failure.
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const fn=(name)=>{ const i=html.indexOf('function '+name+'('); if(i<0) throw new Error('missing '+name);
  let d=0,j=html.indexOf('{',i),k=j; for(;k<html.length;k++){ if(html[k]==='{')d++; else if(html[k]==='}'){d--; if(!d)break;} }
  return html.slice(html.lastIndexOf('\n',i)+1,k+1); };
const src=['covClientShort','covChicagoToday','covWhenText','covYesList','covFollowCandidates','covFollowUpsFor','covFollowDefaults','covFollowOpen','covFollowPreset','covFollowClose','covFollowSend','covAskRow'].map(fn).join('\n');
const log=[]; let fails=0; const ck=(n,ok,note)=>{ log.push((ok?'ok   ':'FAIL ')+n+(ok?'':'  <- '+note)); if(!ok) fails++; };
const tomorrow=(()=>{ const t=new Date(new Date().toLocaleString('sv-SE',{timeZone:'America/Chicago'}).slice(0,10)+'T12:00:00'); t.setDate(t.getDate()+1); return t.toISOString().slice(0,10); })();
const kase=()=>({ id:'cwo_s1', status:'open', client:'Dan Probstfield', shift_date:tomorrow, shift_time:'08:00-12:00', asked:[
  { id:'a1', name:'Elizabeth Johns', state:'waiting', auto:true, at:'2026-10-09T20:00:00Z', phone:'4175550001' },
  { id:'a2', name:'Katie Parker', state:'no', picked_by_coordinator:true, at:'2026-10-09T20:01:00Z', phone:'4175550002' },
  { id:'a3', name:'Angela Muse', state:'yes', picked_by_coordinator:true, at:'2026-10-09T20:02:00Z', phone:'4175550003' },
  { id:'a4', name:'Rhonda Blakemore', state:'waiting', channel:'phone', at:'2026-10-09T20:03:00Z' },
  { id:'a5', name:'Emma Daum', state:'waiting', picked_by_coordinator:true, at:'2026-10-09T20:04:00Z', phone:'4175550005' } ],
  followups:[{ id:'fu1', at:'2026-10-09T21:00:00Z', by:'Samantha', text:'x', ask_ids:['a5'], names:['Emma Daum'] }] });
function world(c, opts){
  opts=opts||{}; const posted=[], events=[]; let alerted=[], rendered=0, confirmMsg=null;
  const els={}; const boxes={};
  const mkBox=id=>{ boxes[id]={ innerHTML:'' }; return boxes[id]; };
  const ctx={ DATA:{ ops_settings:{}, coverage_cases:[c] }, CONFIG:{ supabase_url:'https://x.supabase.co' },
    COV_STATE_UI:{ waiting:['⏳ waiting','#a60'], yes:['✅ yes','#070'], no:['✖ no','#b00'], inquiry:['❓','#a60'] },
    COV_FOLLOW_OPEN:{},
    document:{ getElementById:id=>els[id]||boxes[id]||null, querySelectorAll:sel=>{ const m=sel.match(/data-follow="([^"]+)"/); return (ctx.__checks||[]).filter(x=>x.caseId===(m&&m[1])); } },
    esc:x=>String(x==null?'':x), covClock:t=>'t('+String(t).slice(11,16)+')',
    sb:{ auth:{ getSession:async()=>({ data:{ session:{ access_token:'tok' } } }) }, from:()=>({ select:()=>({ eq:()=>({ maybeSingle:async()=>({ data:{ data:[Object.assign({},c,{followups:(c.followups||[]).concat([{id:'fuN',at:'2026-10-09T22:00:00Z',ask_ids:['a1'],names:['Elizabeth Johns']}])})] } }) }) }) }) },
    fetch:async(url,o)=>{ posted.push({url,body:JSON.parse(o.body)}); return { ok:!opts.fail, json:async()=>opts.fail?{error:'held: night'}:{ sent:['Elizabeth Johns'], failed:['Emma Daum (the text was refused; see Send problems)'], skipped:[] } }; },
    opEvent:(v,o)=>events.push([v,o]), renderCoverage:()=>{rendered++;}, ccActor:()=>({name:'Samantha'}),
    alert:m=>alerted.push(m), confirm:m=>{ confirmMsg=m; return opts.decline?false:true; }, setTimeout:(f)=>f(),
    Date, String, Object, Array, JSON, console, Math };
  const vm=require('vm'); vm.createContext(ctx);
  vm.runInContext(src+'\nthis.X={covFollowCandidates,covFollowUpsFor,covFollowDefaults,covFollowOpen,covFollowPreset,covFollowClose,covFollowSend,covAskRow};',ctx);
  return { X:ctx.X, ctx, els, boxes, mkBox, posted, events, alerted, get rendered(){return rendered}, get confirmMsg(){return confirmMsg} };
}
(async()=>{
  let c=kase(), w=world(c);
  // who can be followed up
  const cand=w.X.covFollowCandidates(c).map(a=>a.id);
  ck('candidates = texted by Cara or the picker, not the yes, not the phone ask', JSON.stringify(cand)===JSON.stringify(['a1','a2','a5']));
  ck('follow-ups per ask come from followups[]', w.X.covFollowUpsFor(c,c.asked[4]).length===1&&w.X.covFollowUpsFor(c,c.asked[0]).length===0);
  const d=w.X.covFollowDefaults(c);
  ck('default follow-up bakes client first name + when, keeps {first_name}', d.still.includes('Dan tomorrow 8am-12pm')&&d.still.includes('{first_name}')&&!d.still.includes('Probstfield'));
  ck('bonus preset has a blank amount to fill', /\$___/.test(d.bonus)&&d.bonus.includes('Dan tomorrow 8am-12pm'));
  ck('no em dash in either default', !/—/.test(d.still+d.bonus));
  // the panel
  w.mkBox('covFollow_cwo_s1'); w.X.covFollowOpen('cwo_s1'); const h=w.boxes['covFollow_cwo_s1'].innerHTML;
  ck('panel lists the three, waiting ticked, the no unticked', h.includes('value="a1" checked')&&h.includes('value="a5" checked')&&h.includes('value="a2">')&&!h.includes('Angela Muse')&&!h.includes('Rhonda'));
  ck('panel says the yes is handled elsewhere', h.includes('who said yes is not on this list'));
  ck('panel shows the earlier follow-up on Emma', h.includes('followed up 1×'));
  ck('panel is flagged open so a re-render keeps it', w.ctx.COV_FOLLOW_OPEN['cwo_s1']===true);
  // presets
  w.els['covFollowMsg_cwo_s1']={ value:d.still, focus(){} }; w.X.covFollowPreset('cwo_s1','bonus');
  ck('bonus preset fills the box', w.els['covFollowMsg_cwo_s1'].value===d.bonus);
  // refusals before anything is sent
  w.ctx.__checks=[{caseId:'cwo_s1',checked:true,value:'a1'},{caseId:'cwo_s1',checked:false,value:'a2'},{caseId:'cwo_s1',checked:true,value:'a5'}];
  await w.X.covFollowSend('cwo_s1'); ck('$___ left in: refused, nothing posted', /bonus amount/.test(w.alerted.at(-1)||'')&&w.posted.length===0);
  w.els['covFollowMsg_cwo_s1'].value='Hi {first_name}, still open — $50 bonus.'; await w.X.covFollowSend('cwo_s1');
  ck('em dash: refused, nothing posted', /em dash/.test(w.alerted.at(-1)||'')&&w.posted.length===0);
  w.ctx.__checks.forEach(x=>x.checked=false); w.els['covFollowMsg_cwo_s1'].value='Hi {first_name}, $50 bonus.'; await w.X.covFollowSend('cwo_s1');
  ck('nobody ticked: refused', /Nobody is ticked/.test(w.alerted.at(-1)||'')&&w.posted.length===0);
  // declined confirm
  w.ctx.__checks[0].checked=true; w.ctx.__checks[2].checked=true; const w2=world(kase(),{decline:true}); w2.ctx.__checks=w.ctx.__checks; w2.els['covFollowMsg_cwo_s1']={value:'Hi {first_name}, it\'s Caring Companions. Dan tomorrow 8am-12pm is still open, and there is a $50 bonus for whoever takes it. Reply YES or NO.'};
  await w2.X.covFollowSend('cwo_s1'); ck('confirm names the people and the text; a No sends nothing', /Elizabeth Johns, Emma Daum/.test(w2.confirmMsg||'')&&/\$50 bonus/.test(w2.confirmMsg||'')&&w2.posted.length===0);
  // the send
  w.ctx.COV_FOLLOW_OPEN['cwo_s1']=true; await w.X.covFollowSend('cwo_s1');
  const p=w.posted[0];
  ck('posts follow_up to coverage-run with the ticked ask ids and the text', p&&p.url.endsWith('/functions/v1/coverage-run')&&p.body.action==='follow_up'&&p.body.case_id==='cwo_s1'&&JSON.stringify(p.body.ask_ids)==='["a1","a5"]'&&p.body.message==='Hi {first_name}, $50 bonus.'&&p.body.by==='Samantha');
  ck('result alert says who got it and who did not (no silent failures)', /Follow-up sent to 1 caregiver/.test(w.alerted.at(-1))&&/Not sent: Emma Daum/.test(w.alerted.at(-1)));
  ck('audit line + panel closed + cases refreshed + re-render', w.events.some(([v])=>v==='follow_up_sent')&&!w.ctx.COV_FOLLOW_OPEN['cwo_s1']&&w.rendered===1&&(w.ctx.DATA.coverage_cases[0].followups||[]).length===2);
  // the row chip
  const row=w.X.covAskRow(w.ctx.DATA.coverage_cases[0],w.ctx.DATA.coverage_cases[0].asked[0],true);
  ck('asked row shows the follow-up', row.includes('📨 followed up')&&row.includes('t(22:00)'));
  // engine refusal shows up, not swallowed
  const w3=world(kase(),{fail:true}); w3.ctx.__checks=[{caseId:'cwo_s1',checked:true,value:'a1'}]; w3.els['covFollowMsg_cwo_s1']={value:'Hi {first_name}, still open.'};
  await w3.X.covFollowSend('cwo_s1'); ck('an engine refusal (night hold) is shown', /Could not send: held: night/.test(w3.alerted.at(-1)||''));
  console.log(log.join('\n')); console.log(fails?fails+' FAILED':log.length+'/'+log.length+' passed'); process.exit(fails?1:0);
})();
