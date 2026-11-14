/* =============================================================================
   email-template.js · how every email from the email library looks (2026-11-13)
   =============================================================================
   ONE file, used in two places and kept identical in both:
     · the Hub (this file beside index.html): the preview in Campaigns and every email a person sends by hand
     · the server (Staffing-Coordinator-Hub supabase/functions/_shared/email-template.js): the scheduled sender
   Samantha, 2026-11-13, on the mock-up: "Yes, build it". What changed from the first design:
     · the website's colors (teal and navy) and a plain white header, the logo on the left
     · a real photo across the top when the email has one (referral-partner emails get one by partner type);
       every other email keeps its drawn banner until a photo is chosen for it
     · three new blocks an email may use: "stats" (proof tiles), "links" (cards to pages we share openly) and
       "video" (the video's picture with a play button, linked to the page where it plays)
     · a line under referral-partner emails with the three ways to refer
     · a footer that says why they are getting it, written for who is reading (a partner is not told they
       "have been in touch about care for your family"), and an Unsubscribe link that works by itself
   The words of every email are untouched: this file only draws them.
   CCEmailTemplate.build(email, { unsub, assets }) returns the whole email as HTML.
     unsub   the address the Unsubscribe link opens. The server sends each person their own; without one the link
             writes to the office, as before.
     assets  where the pictures are (default https://mo-care.com/email-assets)
   ============================================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CCEmailTemplate = api;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this), function () {
  'use strict';
  const ASSETS = 'https://mo-care.com/email-assets';
  const TEAL = '#14606F', NAVY = '#0D365F', INK = '#2c3d4d', MUTED = '#45566a', TINT = '#E4F4F3', GOLD = '#A88400';
  const SANS = "Arial,Helvetica,sans-serif", SERIF = "Georgia,'Times New Roman',serif";
  const PHONE = '(417) 234-8494', FAX = '(417) 719-7870', ADDRESS = '1331 N Stewart Ave, Ste B, Springfield, MO 65802';
  /* the photo a referral-partner email gets when it names none: by who it is written for */
  const PARTNER_PHOTO = {
    'Hospice & Palliative': ['scene-hands', 'A caregiver holding an older person\'s hands'],
    'Home Health': ['scene-kitchen-walker', 'A caregiver helping an older woman in her kitchen'],
    'Skilled Nursing & Rehab': ['scene-garden-walker', 'A caregiver walking outdoors with an older woman'],
    'Hospitals & Case Mgmt': ['scene-door-handshake', 'A caregiver greeting an older woman at her front door'],
    'Senior Living': ['scene-puzzle', 'A caregiver and an older man at a table by a window'],
    'Physicians & Clinics': ['scene-planning-talk', 'An older woman talking with a visitor at home'],
    'Elder Law & Financial': ['scene-sofa-album', 'A daughter and a caregiver laughing with an older woman on the sofa'],
  };
  const PARTNER_PHOTO_ANY = ['scene-door-handshake', 'A caregiver greeting an older woman at her front door'];
  const WHY = {
    referrers: "You're receiving this because your organization serves older adults in the Springfield area. We send one email a month.",
    caregivers: "You're receiving this because you are part of the Caring Companions team.",
    clients: "You're receiving this because you are a Caring Companions client.",
    client_contacts: "You're receiving this because Caring Companions cares for someone in your family.",
  };
  const WHY_FAMILY = "You're receiving this because you've been in touch with Caring Companions about care for your family.";
  const isPartner = e => !!e && e.aud === 'referrers';
  const safe = u => /^(https?:|mailto:|tel:)/i.test(String(u || '')) ? String(u) : '#';

  function photoOf(e) {
    if (e.photo) return [String(e.photo).replace(/\.(jpe?g|png|webp)$/i, ''), e.photo_alt || 'Caring Companions'];
    if (isPartner(e)) return PARTNER_PHOTO[e.seg] || PARTNER_PHOTO_ANY;
    return null;
  }
  function blocks(e, assets) {
    const P = 'margin:0 0 18px;font-family:' + SANS + ';font-size:16px;line-height:1.65;color:' + INK + ';';
    return (e.blocks || []).map(function (b) {
      if (b.t === 'p') return '<p style="' + P + '">' + b.text + '</p>';
      if (b.t === 'l') return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;">' + (b.items || []).map(function (it) {
        return '<tr><td width="30" valign="top" style="font-family:' + SANS + ';font-size:17px;line-height:1.5;color:' + TEAL + ';font-weight:700;">&#10003;</td><td style="font-family:' + SANS + ';font-size:16px;line-height:1.55;color:' + INK + ';padding-bottom:10px;">' + it + '</td></tr>'; }).join('') + '</table>';
      if (b.t === 'tip') return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 22px;"><tr><td style="background:' + TINT + ';border-left:4px solid ' + TEAL + ';border-radius:0 10px 10px 0;padding:16px 20px;"><div style="font-family:' + SANS + ';font-size:11.5px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;color:' + TEAL + ';margin-bottom:6px;">Good to know</div><div style="font-family:' + SANS + ';font-size:15.5px;line-height:1.6;color:' + INK + ';font-weight:600;">' + b.text + '</div></td></tr></table>';
      if (b.t === 'q') return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 22px;"><tr><td style="border-left:4px solid ' + TEAL + ';padding:6px 0 6px 22px;"><div style="font-family:' + SERIF + ';font-size:19px;line-height:1.5;font-style:italic;color:' + NAVY + ';margin-bottom:10px;">' + b.text + '</div><div style="font-family:' + SANS + ';font-size:13.5px;font-weight:bold;color:' + TEAL + ';">' + String(b.by || '').replace(/^[\s,—-]+/, '') + '</div></td></tr></table>';
      if (b.t === 'rating') {
        const star = function (n) { return '<a href="' + safe(b.href) + (String(b.href).indexOf('?') < 0 ? '?r=' : '&r=') + n + '" style="font-family:' + SANS + ';font-size:30px;line-height:1;color:' + GOLD + ';text-decoration:none;">&#9733;</a>'; };
        return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 20px;"><tr><td align="center" style="background:' + TINT + ';border:1px solid #cfe6e4;border-radius:13px;padding:22px 20px;"><div style="font-family:' + SANS + ';font-size:14px;font-weight:bold;color:' + INK + ';margin-bottom:12px;">How would you rate your experience with us?</div><div style="font-size:0;line-height:0;margin-bottom:10px;">' + [1, 2, 3, 4, 5].map(star).join('&nbsp;&nbsp;') + '</div><div style="font-family:' + SANS + ';font-size:12.5px;color:' + MUTED + ';">Tap a star, it only takes a moment</div><div style="font-family:' + SANS + ';font-size:13px;margin-top:10px;"><a href="' + safe(b.href) + '" style="color:' + TEAL + ';font-weight:bold;text-decoration:underline;">Prefer to write instead? Share your thoughts here</a></div></td></tr></table>';
      }
      /* a video: mail programs cannot play one, so this is its picture with the play button on it, linked to the page
         where it plays. { href, img (a name under email-assets/video), alt, title?, caption? } */
      if (b.t === 'video') return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px;"><tr><td>'
        + (b.title ? '<div style="font-family:' + SANS + ';font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:' + TEAL + ';margin:0 0 8px;">' + b.title + '</div>' : '')
        + '<a href="' + safe(b.href) + '" style="display:block;text-decoration:none;"><img src="{assets}/video/' + String(b.img || '').replace(/\.(jpe?g|png)$/i, '') + '.jpg" width="532" alt="' + (b.alt || 'Watch the video') + '" style="display:block;border:0;width:100%;height:auto;border-radius:10px;"></a>'
        + '<div style="font-family:' + SANS + ';font-size:13.5px;line-height:1.5;color:' + MUTED + ';margin-top:8px;">' + (b.caption ? b.caption + ' ' : '') + '<a href="' + safe(b.href) + '" style="color:' + TEAL + ';font-weight:700;">Watch the video</a></div></td></tr></table>';
      /* proof tiles: up to three, each { big, small } */
      if (b.t === 'stats') {
        const it = (b.items || []).slice(0, 3), w = Math.floor((100 - 2 * (it.length - 1)) / (it.length || 1));
        return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:2px 0 20px;"><tr>' + it.map(function (s, i) {
          return (i ? '<td class="cc-gap" width="2%" style="font-size:0;line-height:0;">&nbsp;</td>' : '') + '<td class="cc-tile" width="' + w + '%" valign="top" style="background:' + TINT + ';border-radius:10px;padding:16px 14px;"><div style="font-family:' + SERIF + ';font-size:23px;font-weight:700;color:' + NAVY + ';line-height:1.1;">' + s.big + '</div><div style="font-family:' + SANS + ';font-size:12.5px;line-height:1.4;color:' + INK + ';margin-top:5px;">' + s.small + '</div></td>'; }).join('') + '</tr></table>';
      }
      /* link cards, two across: { head?, text?, items:[{ t, d, href }] } */
      if (b.t === 'links') {
        const it = b.items || []; let rows = '';
        const card = function (c) { return c ? '<td class="cc-tile" width="49%" valign="top" style="border:1px solid #d5e3e1;border-radius:10px;padding:0;"><a href="' + safe(c.href) + '" style="display:block;padding:14px 16px;text-decoration:none;"><span style="display:block;font-family:' + SANS + ';font-size:15px;font-weight:700;color:' + TEAL + ';line-height:1.3;">' + c.t + ' &rarr;</span><span style="display:block;font-family:' + SANS + ';font-size:13px;line-height:1.45;color:' + MUTED + ';margin-top:4px;">' + (c.d || '') + '</span></a></td>' : '<td class="cc-tile" width="49%" style="font-size:0;line-height:0;">&nbsp;</td>'; };
        for (let i = 0; i < it.length; i += 2) rows += '<tr>' + card(it[i]) + '<td class="cc-gap" width="2%" style="font-size:0;line-height:0;">&nbsp;</td>' + card(it[i + 1]) + '</tr><tr><td colspan="3" class="cc-gap" style="height:10px;font-size:0;line-height:0;">&nbsp;</td></tr>';
        return '<div style="border-top:1px solid #e6eceb;font-size:0;line-height:0;margin-top:8px;">&nbsp;</div>'
          + (b.head ? '<div style="font-family:' + SERIF + ';font-size:21px;font-weight:700;color:' + NAVY + ';margin:22px 0 4px;">' + b.head + '</div>' : '')
          + (b.text ? '<p style="margin:0 0 14px;font-family:' + SANS + ';font-size:14.5px;line-height:1.6;color:' + MUTED + ';">' + b.text + '</p>' : '')
          + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">' + rows + '</table>';
      }
      return '';
    }).join('').split('{assets}').join(assets);
  }

  function build(e, opts) {
    opts = opts || {};
    const assets = String(opts.assets || ASSETS).replace(/\/$/, '');
    /* '{unsub}' is left as it is: the by-hand sender (campaign-send) puts each person's own link there */
    const unsub = opts.unsub === '{unsub}' ? '{unsub}' : safe(opts.unsub || 'mailto:samantha@mo-care.com?subject=Please%20unsubscribe%20me');
    const partner = isPartner(e), ph = photoOf(e);
    const why = e.footer || WHY[e.aud] || WHY_FAMILY;
    const hero = ph
      ? '<tr><td style="padding:0;"><img src="' + assets + '/photos/' + ph[0] + '.jpg" width="600" alt="' + ph[1] + '" style="display:block;border:0;width:100%;max-width:600px;height:auto;"></td></tr>'
      : (e.banner ? '<tr><td style="padding:0;background:' + TINT + ';"><img src="' + assets + '/' + e.banner + '.jpg" width="600" alt="Caring Companions" style="display:block;border:0;width:100%;max-width:600px;height:auto;"></td></tr>' : '');
    return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>' + e.subj + '</title>'
      + '<style>@media (max-width:620px){.cc-wrap{width:100% !important;border-radius:0 !important}.cc-pad{padding-left:22px !important;padding-right:22px !important}.cc-h1{font-size:25px !important;line-height:1.2 !important}.cc-tile{display:block !important;width:100% !important;box-sizing:border-box;margin:0 0 8px !important}.cc-gap{display:none !important}.cc-for{display:none !important}.cc-btn a{display:block !important}}</style></head>'
      + '<body style="margin:0;padding:0;background:#eef1f0;">'
      + '<div style="display:none;max-height:0;overflow:hidden;opacity:0;">' + (e.pre || '') + '</div>'
      + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f0;"><tr><td align="center" style="padding:22px 0;">'
      + '<table role="presentation" class="cc-wrap" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;">'
      + '<tr><td class="cc-pad" style="padding:20px 34px 16px;border-bottom:1px solid #e6eceb;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>'
      + '<td align="left"><img src="' + assets + '/cc-logo.png" width="168" alt="Caring Companions, Quality Caregivers 24 7 365" style="display:block;border:0;width:168px;height:auto;"></td>'
      + (partner ? '<td class="cc-for" align="right" style="font-family:' + SANS + ';font-size:11.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:' + TEAL + ';">For referral partners</td>' : '')
      + '</tr></table></td></tr>'
      + hero
      + '<tr><td class="cc-pad" style="padding:30px 34px 8px;">'
      + (e.eye ? '<div style="font-family:' + SANS + ';font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:' + TEAL + ';margin:0 0 10px;">' + e.eye + '</div>' : '')
      + '<h1 class="cc-h1" style="margin:0 0 16px;font-family:' + SERIF + ';font-size:29px;line-height:1.18;font-weight:700;color:' + NAVY + ';">' + e.head + '</h1>'
      + blocks(e, assets)
      + (e.cta ? '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0 8px;"><tr><td class="cc-btn" align="left"><a href="' + safe(e.cta.href) + '" style="display:inline-block;background:' + TEAL + ';color:#ffffff;font-family:' + SANS + ';font-size:16px;font-weight:700;text-decoration:none;text-align:center;padding:14px 26px;border-radius:8px;">' + e.cta.label + '</a></td></tr></table>' : '')
      + (partner ? '<p style="margin:10px 0 0;font-family:' + SANS + ';font-size:14.5px;line-height:1.6;color:' + MUTED + ';">Have a patient who needs help at home? <a href="https://mo-care.com/refer" style="color:' + TEAL + ';font-weight:700;">Refer in two minutes</a>, call <a href="tel:4172348494" style="color:' + TEAL + ';font-weight:700;text-decoration:none;white-space:nowrap;">' + PHONE + '</a>, or fax <span style="white-space:nowrap;">' + FAX + '</span>.</p>' : '')
      + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;border-top:1px solid #e6eceb;"><tr><td style="padding:18px 0 26px;">'
      + '<div style="font-family:' + SERIF + ';font-size:17px;font-style:italic;color:' + MUTED + ';margin-bottom:3px;">' + (e.sign || 'With care,') + '</div>'
      + '<div style="font-family:' + SANS + ';font-size:15px;font-weight:bold;color:' + NAVY + ';">The Caring Companions Team</div>'
      + '</td></tr></table></td></tr>'
      + '<tr><td class="cc-pad" style="background:' + NAVY + ';padding:24px 34px 26px;">'
      + '<div style="font-family:' + SERIF + ';font-size:16px;color:#ffffff;margin:0 0 4px;">Caring Companions In-Home Senior Care</div>'
      + '<div style="font-family:' + SANS + ';font-size:12.5px;line-height:1.6;color:#c3cdd6;">' + ADDRESS + ' &middot; <a href="tel:4172348494" style="color:#F5D061;text-decoration:none;white-space:nowrap;">' + PHONE + '</a> &middot; <a href="https://mo-care.com" style="color:#c3cdd6;">mo-care.com</a></div>'
      + '<div style="border-top:1px solid #2b527a;margin:14px 0 12px;font-size:0;line-height:0;">&nbsp;</div>'
      + '<div style="font-family:' + SANS + ';font-size:12px;line-height:1.6;color:#9fb0c0;">' + why + ' <a href="' + unsub + '" style="color:#ffffff;font-weight:700;">Unsubscribe</a></div>'
      + '</td></tr></table></td></tr></table></body></html>';
  }
  return { build, photoOf, PARTNER_PHOTO, WHY, ASSETS };
});
