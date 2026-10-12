/* =====================================================================================================================
   THE WHOLE JOURNEY, AS THE APPLICANT SEES IT (Samantha 2026-10-11: "show the full journey in order: Initial Application →
   Prescreening → Interview Booking → Interview → Offer → Offer Signature → Step 1 → Background & References → Step 2 in
   Viventium → Orientation → Training → Approved to Work. For each stage, I want to see the actual applicant-facing screens
   and messages, not just a description"). One stage at a time with Back and Next: the real page in preview mode, phone size,
   beside every message that stage sends (the same list the rest of this tab shows, and the same email previews), and what
   happens next and who does it. Every page here is a preview: nothing is saved, signed, booked or sent from it.
   AW.mount('awBox'). Reads window.AP_JOURNEY (applicant-journey.js) and apjFill (the tab's email preview).
   ===================================================================================================================== */
(function(){
  'use strict';
  const esc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const REF_PAGE = 'reference.html?r=preview&c=Pat%20Preview&n=Jane%20Example&t=professional&co=Home%20Helpers';
  /* Each stage: its screen(s), the journey entries (by order) it sends, and what happens next. Replaced messages are left out. */
  const STAGES = [
    { t: 'Application', pages: [['The application', 'https://mo-care.com/apply?preview=1']], orders: [1, 2, 2.1, 2.2, 3, 4, 5],
      next: 'They apply on mo-care.com, or the office sends the application after a phone call. The screening questions come next, on the same page.' },
    { t: 'Prescreening', pages: [['The screening questions (the second part of the application)', 'https://mo-care.com/apply?preview=1']], orders: [],
      next: 'A knock-out answer ends it kindly; everyone else goes straight on to pick an interview time. Their answers stay on their applicant page, so nobody asks again.' },
    { t: 'Interview booking', pages: [['Pick a time', 'https://mo-care.com/apply?preview=book'], ['Their booking, to move or cancel', 'https://mo-care.com/apply?preview=manage']], orders: [2.3, 2.4, 2.5, 2.6, 6, 6.1, 7, 7.1, 7.2, 38, 39],
      next: 'Confirmation and reminders go by themselves. Applicants who finished but did not book get the follow-ups above.' },
    { t: 'Interview', pages: [], none: 'In person at the office, about 20 minutes. There is no screen for the applicant: only the reminders and the YES / NO answer below.', orders: [8, 8.1, 8.2, 8.3, 9, 9.1, 10, 11],
      next: 'After the interview the office chooses Hire, make the offer; Candidate pool; or Not hiring.' },
    { t: 'Offer', pages: [['The offer letter and position description', 'offer.html?preview=1']], orders: [13.1, 13.2, 13.4, 14, 14.5],
      next: 'The offer link goes by text and email, with reminders on day 2 and day 5. The other two outcomes (candidate pool, not hiring) are listed here too.' },
    { t: 'Offer signature', pages: [['Sign both documents (try it: nothing is saved)', 'offer.html?preview=1']], orders: [13.3],
      next: 'Both signed: the Step 1 link goes by itself (while the Step 1 switch on the Admin page is on). The signed PDFs land on their profile.' },
    { t: 'Step 1', pages: [['Step 1, all ten screens (try it: Fill this screen with practice answers on each)', 'step1.html?preview=1']], orders: [13.35, 13.36],
      next: 'The last signature puts them into Background & References by itself and raises one card for the Recruiting & Orientation owner: start the background checks and references.' },
    { t: 'Background & References', pages: [['What a reference sees', REF_PAGE], ['If a reference cannot be reached: the applicant fixes it', 'fix-reference.html?r=preview&cid=0&n=Jane%20Example']], orders: [17, 18, 19, 20, 20.5, 20.6],
      next: 'The office runs OIG, EDL, FCSR and Case.net and asks the references. Everything clear and approved: Step 2.' },
    { t: 'Step 2 in Viventium', pages: [['The one tap when Viventium is done', 'step2.html?preview=1']], orders: [21, 21.1, 21.2, 21.3, 21.4, 22],
      next: 'The office records Step 2 sent; they do their Viventium tasks and tap I finished; the office checks Viventium and verifies.' },
    { t: 'Orientation', pages: [['Book the Orientation Video Call', 'welcome.html?preview=1']], orders: [22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7, 22.8, 22.9],
      next: 'Step 2 verified: the invitation goes by itself. After the call, the orientation link to the Training Platform.' },
    { t: 'Training', pages: [['The Training Platform (its public course list)', 'https://training.mo-care.com/#/training']], orders: [22.95, 23, 24, 25, 27, 28, 29],
      next: 'Orientation and the dementia course before the first client; completions reach the Hub by themselves.' },
    { t: 'Approved to Work', pages: [], none: 'No screen: a person on the Approve to Work list approves them in the Hub, then the texts below.', orders: [30, 30.5, 31, 32, 33],
      next: 'AxisCare active, the cleared text, the availability link, and the first-shift check-in.' },
  ];
  let BOX = null, I = 0;
  const entries = (orders) => (window.AP_JOURNEY || []).filter(x => orders.includes(Number(x.order)) && !x.replaced).sort((a, b) => Number(a.order) - Number(b.order));
  function msg(x){
    const none = /none/i.test(x.channel || '');
    return '<div style="border:1px solid var(--border);border-radius:10px;padding:9px 11px;margin-bottom:7px;background:#fff;">'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;"><b style="color:var(--navy);font-size:13.5px;">' + esc(x.name) + '</b>'
      + '<span style="font-size:11px;font-weight:800;color:#0D365F;background:#E6F5F4;border-radius:999px;padding:1px 8px;">' + esc(none ? 'No message' : x.channel) + '</span>'
      + (x.warning ? '<span style="font-size:11px;font-weight:800;color:#B91C1C;background:#FEE2E2;border-radius:999px;padding:1px 8px;">⚠ Not running</span>' : '') + '</div>'
      + (x.timing ? '<div class="field-note" style="margin-top:3px;">' + esc(x.timing) + '</div>' : '')
      + (x.text ? '<div style="white-space:pre-wrap;background:#F7F5F0;border-radius:8px;padding:8px 10px;margin-top:6px;font-size:13px;">' + esc(x.text) + '</div>' : '')
      + (x.email_key ? '<details ontoggle="if(this.open&&window.apjFill)apjFill(this)" style="margin-top:6px;"><summary style="cursor:pointer;font-size:12.5px;color:var(--navy);font-weight:700;">The email, exactly as it arrives</summary><div data-email="' + esc(JSON.stringify(x.email_key)) + '"><div class="field-note">Opening…</div></div></details>'
        : (x.subject ? '<div style="font-size:12.5px;margin-top:6px;"><b>Email:</b> ' + esc(x.subject) + (x.email_summary ? ': ' + esc(x.email_summary) : '') + '</div>' : ''))
      + '</div>';
  }
  function render(){
    if (!BOX) return;
    const s = STAGES[I], list = entries(s.orders);
    let h = '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px;">' + STAGES.map((x, k) => '<button class="fb" style="' + (k === I ? 'background:#0D365F;color:#fff;border-color:#0D365F;' : '') + '" onclick="AW.go(' + k + ')">' + (k + 1) + '. ' + esc(x.t) + '</button>').join('') + '</div>';
    h += '<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start;">';
    h += '<div style="flex:0 0 auto;max-width:100%;">' + (s.pages.length
      ? s.pages.map(([label, url], k) => '<div style="margin-bottom:12px;"><div style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:4px;">' + esc(label) + ' <a href="' + esc(url) + '" target="_blank" rel="noopener" style="font-weight:400;font-size:12px;">open in a new tab ↗</a></div>'
          + '<iframe src="' + esc(url) + '" title="' + esc(label) + '" loading="lazy" style="width:390px;max-width:100%;height:' + (k ? 520 : 720) + 'px;border:1.5px solid var(--border);border-radius:14px;background:#fff;"></iframe></div>').join('')
      : '<div style="width:390px;max-width:100%;background:#F4F2ED;border-radius:14px;padding:16px;font-size:13.5px;">' + esc(s.none || 'No screen at this stage.') + '</div>') + '</div>';
    h += '<div style="flex:1 1 300px;min-width:260px;">'
      + '<div style="font-size:15px;font-weight:800;color:var(--navy);margin-bottom:6px;">' + (I + 1) + '. ' + esc(s.t) + '</div>'
      + '<div style="background:#EEF4FB;border-radius:10px;padding:9px 11px;font-size:13px;margin-bottom:10px;"><b>What happens next:</b> ' + esc(s.next) + '</div>'
      + '<div style="font-size:13px;font-weight:700;margin-bottom:6px;">' + (list.length ? 'What they receive at this stage (' + list.length + ')' : 'No message at this stage') + '</div>'
      + list.map(msg).join('')
      + '<div style="display:flex;gap:8px;margin-top:10px;">' + (I > 0 ? '<button class="ibtn" onclick="AW.go(' + (I - 1) + ')">‹ Back</button>' : '') + (I < STAGES.length - 1 ? '<button class="ibtn" onclick="AW.go(' + (I + 1) + ')">Next: ' + esc(STAGES[I + 1].t) + ' ›</button>' : '') + '</div>'
      + '</div></div>';
    BOX.innerHTML = h;
  }
  function mount(id){
    BOX = document.getElementById(id); if (!BOX) return;
    if (!window.AP_JOURNEY) { BOX.innerHTML = '<div class="field-note">Loading the journey…</div>'; let n = 0; const t = setInterval(() => { if (window.AP_JOURNEY || ++n > 40) { clearInterval(t); render(); } }, 250); return; }
    render();
  }
  window.AW = { mount, go: (k) => { I = Math.max(0, Math.min(STAGES.length - 1, k)); render(); if (BOX) BOX.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, STAGES };
})();
