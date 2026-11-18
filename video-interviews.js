/* video-interviews.js (window.VI) · Katlin's video interviews, Stage A (Samantha 2026-11-17, "Yes, both").
   1. Interview hours: each interviewer gets a "Video link" (coordinators.meeting_link). An interviewer with a link does
      VIDEO interviews: the server (interview-messages) sends video words, the link and the driver's license line instead
      of the office address, and mo-care.com/apply marks those times "Video". Google Meet or Zoom links only, the same
      rule the server uses (_shared/office-from.ts videoLink). Nothing is offered until that interviewer has hours.
   2. The interview card: for a video interview, "Driver's license check" (her words: "during interview the person holds
      their drivers license up to the camera"). Matched / Not done / Didn't look right. Her 10-27 rule: anything but
      Matched is a review flag and a task for the owners, never an automatic no, and the offer waits for an owner.
      Nothing is recorded or kept: no photo, no number, only the choice. Separate from the I-9.
   No em dashes (her rule). */
(function(W){
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const lc = s => String(s || '').trim().toLowerCase();
  const D = () => { try{ return DATA || {}; }catch(e){ return {}; } };
  const me = () => { try{ return lc(W.ccActor().email); }catch(e){ return ''; } };
  const meName = () => { try{ return W.ccActor().name || me(); }catch(e){ return me(); } };
  /* sb, IV_HOSTS and AP_BOOK are top-level let/const in index.html (not on window): read them by name */
  const SB = () => { try{ return sb; }catch(e){ return null; } };
  const HOSTS = () => { try{ return IV_HOSTS || []; }catch(e){ return []; } };
  const BOOK = () => { try{ return AP_BOOK || {}; }catch(e){ return {}; } };
  const isOwner = () => { try{ return typeof W.ccIsOwner === 'function' && !!W.ccIsOwner(); }catch(e){ return false; } };

  /* same test as the server's videoLink(): https, zoom.us or meet.google.com, a path, at most 300 characters */
  function validLink(raw){
    const s = String(raw == null ? '' : raw).trim();
    return /^https:\/\/([\w-]+\.)*(zoom\.us|meet\.google\.com)\/\S+$/i.test(s) && s.length <= 300 ? s : null;
  }

  /* ---------- 1. the interviewer's video link (Interview hours) ---------- */
  function hostChip(h){
    const link = String((h && h.meeting_link) || '').trim();
    return link
      ? '<span title="' + esc(link) + '" style="font-size:11.5px;font-weight:700;color:#1F5E8C;background:#E6F0F8;border-radius:999px;padding:2px 9px;">🎥 Video interviews</span>'
      : '';
  }
  function hostButton(h){
    const has = String((h && h.meeting_link) || '').trim();
    return '<button class="fb" onclick="VI.setLink(\'' + esc(h.id) + '\')">🎥 ' + (has ? 'Video link' : 'Add video link') + '</button>';
  }
  async function setLink(id){
    const h = HOSTS().find(x => String(x.id) === String(id)) || {};
    const cur = String(h.meeting_link || '').trim();
    const raw = await W.ccPrompt('Video interview link for ' + (h.name || 'this interviewer') + '\n\n'
      + 'Paste their own standing Google Meet link (https://meet.google.com/...). Applicants booked with them get a VIDEO interview with this link, '
      + 'and their times show as Video on the apply page.\n\nLeave it empty to make them in person again.', cur);
    if(raw === null) return;
    const v = String(raw).trim();
    if(v && !validLink(v)){ alert('That is not a Google Meet or Zoom link. It needs to start with https://meet.google.com/ (or a zoom.us link). Nothing was changed.'); return; }
    try{
      const { error } = await SB().from('coordinators').update({ meeting_link: v || null }).eq('id', id);
      if(error) throw error;
      if(typeof W.ivLoad === 'function') await W.ivLoad();
    }catch(e){
      const m = String(e && e.message || 'error');
      alert(/meeting_link/.test(m) ? 'The database is not ready for video links yet (the Desktop step has not been run). Nothing was changed.' : 'Could not save that: ' + m);
    }
  }

  /* ---------- 2. the driver's license check on a video interview ---------- */
  const CHOICES = [['matched', 'Matched'], ['not_done', 'Not done'], ['wrong', "Didn't look right"]];
  const LABEL = { matched: 'Matched', not_done: 'Not done', wrong: "Didn't look right" };
  let CUR = { id: null, video: false };

  async function bookingIsVideo(applicantId){
    try{
      const b = BOOK()[applicantId];
      const cid = b && b.coordinator_id; if(!cid) return false;
      const { data, error } = await SB().from('coordinators').select('id, meeting_link').eq('id', cid).maybeSingle();
      if(error || !data) return false;
      return !!String(data.meeting_link || '').trim();
    }catch(e){ return false; }
  }
  async function idCheckMount(applicantId){
    const host = document.getElementById('apIntIdCheck'); if(!host) return;
    CUR = { id: applicantId, video: false };
    host.innerHTML = '';
    const video = await bookingIsVideo(applicantId);
    if(String(CUR.id) !== String(applicantId)) return;   // another interview was opened meanwhile
    CUR.video = video;
    if(!video) return;
    const prev = ((W.__apInt || {}).id_check) || '';
    host.innerHTML = '<div style="background:#F4F8FB;border:1px solid #D6E4EF;border-radius:11px;padding:11px 13px;max-width:760px;">'
      + '<div style="font-size:13.5px;font-weight:700;color:var(--navy);">🪪 Driver\'s license check (video interview)</div>'
      + '<div class="field-note" style="margin:3px 0 8px;">Ask them to hold their driver\'s license up to the camera. Check the photo is them and the name matches the application. '
      + 'Do not write down the number or take a picture. Anything but Matched goes to Samantha to look at.</div>'
      + '<div style="display:flex;gap:14px;flex-wrap:wrap;">'
      + CHOICES.map(([k, l]) => '<label style="display:inline-flex;align-items:center;gap:6px;font-size:13.5px;margin:0;font-weight:600;">'
          + '<input type="radio" name="apIntIdCk" value="' + k + '"' + (prev === k ? ' checked' : '') + ' onchange="VI.pick(this.value)"> ' + esc(l) + '</label>').join('')
      + '</div></div>';
  }
  function pick(v){ if(W.__apInt) W.__apInt.id_check = v; }
  function value(){
    const el = document.querySelector('input[name="apIntIdCk"]:checked');
    return el ? el.value : (((W.__apInt || {}).id_check) || '');
  }

  /* Called by apOutcome before anything is saved. Returns a message to show (stop), or null (go on). A wants the
     post_interview object; the id_check and a review flag are written onto it. */
  function beforeOutcome(applicantId, outcome, A){
    if(!CUR.video || String(CUR.id) !== String(applicantId)) return null;
    const v = value();
    if(!v) return 'Mark the driver\'s license check first (Matched, Not done or Didn\'t look right).';
    A.id_check = v; A.id_check_by = meName(); A.id_check_at = new Date().toISOString();
    A.id_review = v !== 'matched';
    if(A.id_review && outcome === 'hired' && !isOwner())
      return 'The license check was "' + LABEL[v] + '", so Samantha looks before an offer goes out. Press Save notes; she gets a task to look.';
    return null;
  }
  /* After a save (or Save notes): a check that was not Matched becomes one owners' task. Never an automatic no. */
  async function afterSave(applicantId, who){
    if(!CUR.video || String(CUR.id) !== String(applicantId)) return;
    const v = value(); if(!v || v === 'matched') return;
    const d = D(); d.staffing_tasks = d.staffing_tasks || [];
    const key = 'vi_idck_' + applicantId;
    if(d.staffing_tasks.some(t => t && t.vi_key === key && t.status === 'open')) return;   // one open task per person
    const t = { id: (typeof W.uid === 'function' ? W.uid() : 'vi_' + Date.now().toString(36)), direction: 'to_owners', kind: 'update', urgency: 'Today',
      about: who || '', caregiver: '', lead_id: null, vi_key: key,
      message: 'Video interview license check for ' + (who || 'an applicant') + ': ' + LABEL[v] + ' (marked by ' + meName() + '). Please look before any offer. Nothing was rejected automatically.',
      created_at: new Date().toISOString(), from_name: meName(), from_email: me(), status: 'open', done_at: null, done_by: null, reply: '' };
    d.staffing_tasks.push(t);
    try{ await W.persist('staffing_tasks', t); }catch(e){ alert('The license check was saved, but the task for Samantha did not send. Please tell her.'); }
  }

  W.VI = { validLink, hostChip, hostButton, setLink, idCheckMount, pick, value, beforeOutcome, afterSave };
})(window);
