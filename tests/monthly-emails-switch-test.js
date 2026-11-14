// The lead's "Monthly emails" switch (Samantha 2026-11-13). The sender obeys lead.monthly_emails === false.
// Pulls the two functions out of index.html and runs them against fakes. node tests/monthly-emails-switch-test.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const grab = (name) => { const i = html.indexOf('function ' + name + '('); if (i < 0) throw new Error(name + ' not found');
  const start = html.lastIndexOf('\n', i) + 1; let d = 0, j = html.indexOf('{', i);
  for (;; j++) { const c = html[j]; if (c === '{') d++; else if (c === '}') { d--; if (!d) break; } } return html.slice(start, j + 1); };
const res = []; const ck = (n, c, note) => res.push([n, !!c, c ? '' : JSON.stringify(note ?? null)]);
(async () => {
  let saved = [], confirmAnswer = true, asked = 0;
  const ctx = { commsLead: null, ccActor: () => ({ email: 'office@example.com', name: 'Office' }), ccConfirm: async () => { asked++; return confirmAnswer; },
    persist: async (k, l) => { saved.push([k, JSON.parse(JSON.stringify(l))]); }, renderCommsTimeline: () => {}, Date };
  vm.createContext(ctx);
  vm.runInContext(grab('ldMonthlyState') + '\n' + grab('ldToggleMonthly').replace('async function ldToggleMonthly', 'this.ldToggleMonthly = async function') + '\nthis.ldMonthlyState = ldMonthlyState;', ctx);
  const S = ctx.ldMonthlyState;
  ck('button is on the lead profile, beside Do not contact', /id="ldDncBtn"[^\n]*\n\s*<button[^>]*id="ldMonthlyBtn"[^>]*onclick="ldToggleMonthly\(\)"/.test(html));
  ck('an open lead with an email is ON by default', S({ email: 'a@example.com', status: 'Contacted' }).word === 'on' && S({ email: 'a@example.com', status: 'Contacted' }).can);
  ck('turned off shows off, and can be turned back on', S({ email: 'a@example.com', monthly_emails: false }).word === 'off' && S({ email: 'a@example.com', monthly_emails: false }).can);
  ck('no email: says so and cannot be switched', S({ status: 'New' }).word === 'no email on file' && !S({ status: 'New' }).can);
  ck('do not contact, a client, a closed lead: off and locked', [{ email: 'a@example.com', do_not_contact: true }, { email: 'a@example.com', status: 'Converted' }, { email: 'a@example.com', status: 'Lost' }].every((l) => /^off \(/.test(S(l).word) && !S(l).can));
  ctx.commsLead = { id: 'L1', email: 'a@example.com', status: 'Contacted' };
  await ctx.ldToggleMonthly();
  ck('turning it off asks first, then saves monthly_emails false with who and when, and a line on the history',
    asked === 1 && saved.length === 1 && saved[0][0] === 'leads' && saved[0][1].monthly_emails === false && saved[0][1].monthly_emails_by === 'office@example.com' && !!saved[0][1].monthly_emails_at && /turned off/.test(saved[0][1].comm_log[0].body), saved);
  await ctx.ldToggleMonthly();
  ck('turning it back on saves monthly_emails true, without asking', asked === 1 && saved.length === 2 && saved[1][1].monthly_emails === true && /turned back on/.test(saved[1][1].comm_log[1].body), saved);
  confirmAnswer = false; await ctx.ldToggleMonthly();
  ck('saying no to the question changes nothing', saved.length === 2 && ctx.commsLead.monthly_emails === true);
  ctx.commsLead = { id: 'L2', email: 'b@example.com', do_not_contact: true }; confirmAnswer = true; await ctx.ldToggleMonthly();
  ck('a do-not-contact lead cannot be switched on', saved.length === 2 && ctx.commsLead.monthly_emails === undefined);
  let pass = 0; for (const [n, ok, note] of res) { console.log((ok ? '  ✓ ' : '  ✗ ') + n + (ok ? '' : '\n      ' + note)); if (ok) pass++; }
  console.log(`\n${pass}/${res.length} passed`); process.exit(pass === res.length ? 0 : 1);
})();
