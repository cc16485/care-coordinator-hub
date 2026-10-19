/* node tests/medicaid-profile-test.js: a Medicaid caregiver's profile shows every required training with its certificate (Samantha 2026-10-19) */
const fs=require('fs'); const src=fs.readFileSync(__dirname+'/../index.html','utf8');
const i=src.indexOf('function cgdComplianceHtml(c,g){'); let d=0,j=i;
for(let k=src.indexOf('{',i);k<src.length;k++){ if(src[k]==='{')d++; else if(src[k]==='}'){d--; if(!d){j=k+1;break;}} }
require('../eligibility-rules.js'); global.window=globalThis;
global.escapeHtmlComms=s=>String(s==null?'':s).replace(/</g,'&lt;'); global.CGD_VIVENTIUM_NOTE='';
eval(src.slice(i,j)+';global.F=cgdComplianceHtml;');
const txt=h=>h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
const g={id:1,first:'A',last:'B',hire_date:'2024-01-01',orient_date:'2024-01-02',orient_proof:'p.pdf',alz_date:'2024-01-03',ojt_date:'2024-01-10',ojt_signed:'yes',ojt_proof:'o.pdf',medicaid_hand:'yes'};
const t=txt(F({},g)); let ok=0,bad=0; const ck=(n,c)=>{c?ok++:bad++;console.log((c?'PASS ':'FAIL ')+n)};
ck('Medicaid section shows', /Medicaid caregiver: required training and certificates/.test(t));
ck('dementia without certificate flagged', /Medicaid audit: no certificate on file/.test(t));
ck('online OJT not on record flagged', /On-the-job training, online.*Medicaid audit: not on record/.test(t));
ck('no Optional wording for a Medicaid caregiver', !/Optional/.test(t));
ck('annual in-service required', /Annual in-service \(5 hours\) Required/.test(t));
const t2=txt(F({},Object.assign({},g,{medicaid_hand:''})));
ck('non-Medicaid caregiver keeps optional records', /Optional/.test(t2) && !/Medicaid audit/.test(t2));
console.log(ok+' passed, '+bad+' failed'); process.exit(bad?1:0);
