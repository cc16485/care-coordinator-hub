/* =====================================================================================================================
   RELATIONSHIP RULES: the calls a family's Care Coordinator makes once care starts (Care Coordinator Leads and Bonus,
   Stage 3; policy approved by Samantha 2026-10-18). Pure functions only: no page, no database.

   The three relationship calls:
     welcome   the client journey's own step "Call the family after the first visit" (fw.family), due by the end of the
               next business day, owned by the client's Care Coordinator. Nothing here duplicates it.
     day7      the 7-day relationship call: shows from day 2 after the first visit, due by day 7
     day30     the 30-day relationship call: shows from day 25 once the 7-day call is logged, due by day 30
   One card at a time: the 30-day call waits for the 7-day call. A card stays until someone logs that they talked with
   the family; a call that reached nobody is recorded and the card stays.

   These are RELATIONSHIP calls. They never write a supervisory note and never make a supervisory visit due (supervisory
   work is concern-only from 2026-11-16). Nothing here contacts a family: a person makes every call.
   The first visit is lead.first_shift_at (stamped by the client journey from the first AxisCare clock-in).
   Switch: ops_settings.relationship_calls_live. Off: no cards. On: only clients whose first visit is on or after the day it
   was turned on (relationship_calls_live_since), so turning it on never floods My Work with late cards for older clients.
   ===================================================================================================================== */
(function(root){
  'use strict';
  const LR = () => root.LeadRules;
  const CALLS = [
    { key:'day7', title:'7-day relationship call', opens:2, due:7, after:null },
    { key:'day30', title:'30-day relationship call', opens:25, due:30, after:'day7' } ];
  const OUTCOMES = { talked:'Talked with them', voicemail:'Left a voicemail', no_answer:'No answer' };
  function on(settings){ return !!(settings && settings.relationship_calls_live === true); }
  function since(settings){ const v = settings && settings.relationship_calls_live_since; return v ? LR().chicago(v).ymd : null; }
  function firstVisitDay(l){ return l && l.first_shift_at ? LR().chicago(l.first_shift_at).ymd : null; }
  const entries = l => Array.isArray(l && l.relationship_calls) ? l.relationship_calls : [];
  /* the conversation that completed this call, or null */
  function done(l, key){ return entries(l).filter(e => e && e.key === key && e.outcome === 'talked').slice(-1)[0] || null; }
  function attempts(l, key){ return entries(l).filter(e => e && e.key === key && e.outcome !== 'talked'); }
  /* care has stopped: the journey closed (care ended or did not start), or the lead is lost or archived */
  function stopped(l, journey){
    if(!l || l.archived || String(l.status || '') === 'Lost') return true;
    return !!(journey && journey.status === 'closed');
  }
  /* the one relationship call that is open now: {key, title, first_visit, opens, due, late, attempts} or null */
  function nextCall(l, ctx){
    ctx = ctx || {}; const today = ctx.today || LR().ymd(new Date());
    const fv = firstVisitDay(l); if(!fv || stopped(l, ctx.journey)) return null;
    if(ctx.since && fv < String(ctx.since).slice(0, 10)) return null;   /* only first visits from the day the switch went on */
    for(const c of CALLS){
      if(done(l, c.key)) continue;
      if(c.after && !done(l, c.after)) return null;
      const opens = LR().addDays(fv, c.opens), due = LR().addDays(fv, c.due);
      if(today < opens) return null;
      return { key:c.key, title:c.title, first_visit:fv, opens, due, late:today > due, attempts:attempts(l, c.key).length };
    }
    return null;
  }
  /* record a logged call on the lead (who, when, outcome, a short note); returns the entry, or null when not valid */
  function record(l, key, o){
    o = o || {}; const c = CALLS.find(x => x.key === key);
    if(!l || !c || !OUTCOMES[o.outcome]) return null;
    const e = { key, title:c.title, outcome:o.outcome, note:String(o.note || '').trim().slice(0, 400), at:o.at || new Date().toISOString(),
      by:String(o.by || ''), by_name:String(o.by_name || ''), owner:String(o.owner || '') };
    l.relationship_calls = entries(l).concat([e]).slice(-30);
    l.comm_log = Array.isArray(l.comm_log) ? l.comm_log : [];
    l.comm_log.push({ kind:'relationship_call', at:e.at, by:e.by, body:'📞 ' + c.title + ': ' + OUTCOMES[o.outcome].toLowerCase() + (e.note ? ' (' + e.note + ')' : '')
      + (e.owner && e.by_name && e.owner.split(/\s+/)[0].toLowerCase() !== e.by_name.split(/\s+/)[0].toLowerCase() ? '. ' + e.by_name.split(/\s+/)[0] + ' helped; it stays ' + e.owner.split(/\s+/)[0] + '’s family.' : '') });
    return e;
  }
  const api = { CALLS, OUTCOMES, on, since, firstVisitDay, done, attempts, stopped, nextCall, record };
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  root.RelationshipRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
