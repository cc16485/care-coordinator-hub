/* The Hub's drawing kit (2026-10-18, Samantha: "I absolutely love the design and vibe of this goals page! How can we introduce
   these kinds of graphics and more fun throughout the hub?" then "build step 1 into the Hub as shown", mockup
   https://claude.ai/artifact/T9RnDQsGSkJ9RVvJPGbnHo).
   One hand for every scene: navy outlines, teal and honey fills, a little mint, the same as the Client Goals hill and street.
   Step 1 uses them where a list is empty because the work is done: My Work, the Live Schedule, Leads and Call Follow Ups.
   Rules (hers): good news only, never a nudge, never ranking or comparing people; urgent and HR screens stay plain;
   small motion, and none at all for anyone whose computer asks for reduced motion.
   HS.svg(name) draws one scene. HS.empty({...}) is the big centred version, HS.banner({...}) the one-line version. */
(function(){
  const N = '#0D365F', T = '#0F7A73', H = '#F0A63A', M = '#8FD1C7', P = '#EAF4F6', L = '#CADDD9';
  let seq = 0;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  function frame(inner, top, bottom){
    const id = 'hsSky' + (++seq);
    return '<svg class="hs-svg" viewBox="0 0 320 180" aria-hidden="true" focusable="false"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0" stop-color="' + (top || P) + '"/><stop offset="1" stop-color="' + (bottom || '#faf9f6') + '"/></linearGradient></defs>'
      + '<rect width="320" height="180" rx="12" fill="url(#' + id + ')"/>' + inner + '</svg>';
  }
  const hills = (o) => '<path d="M0 180 L0 128 Q 80 98 160 122 T 320 104 L320 180 Z" fill="' + L + '"/><path d="M0 180 L0 150 Q 110 134 200 152 T 320 140 L320 180 Z" fill="' + M + '" opacity="' + (o || .55) + '"/>';
  function house(x, y, s, lit){
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')"><path d="M0 18 L18 4 L36 18" fill="' + (lit ? T : 'none') + '" stroke="' + N + '" stroke-width="2.2" stroke-linejoin="round"/>'
      + '<rect x="5" y="17" width="26" height="20" rx="1.5" fill="#fff" stroke="' + N + '" stroke-width="2.2"/>'
      + '<rect class="hs-twinkle" x="9" y="21" width="7" height="7" rx="1" fill="' + (lit ? H : L) + '"/><rect x="20" y="25" width="6.5" height="12" rx="1" fill="' + N + '"/></g>';
  }
  const SCENES = {
    sunrise: () => {
      let rays = ''; for(let i = 0; i < 12; i++) rays += '<line x1="0" y1="-40" x2="0" y2="-52" stroke="' + H + '" stroke-width="3" stroke-linecap="round" transform="rotate(' + (i * 30) + ')"/>';
      return frame('<g class="hs-spin"><g transform="translate(160 122)">' + rays + '</g></g><circle cx="160" cy="122" r="32" fill="' + H + '"/>' + hills(), '#FFF4E3');
    },
    porch: () => frame('<circle cx="262" cy="56" r="22" fill="' + H + '" opacity=".8"/>' + hills()
      + '<g class="hs-bob"><rect x="70" y="70" width="150" height="80" fill="#fff" stroke="' + N + '" stroke-width="2.4"/>'
      + '<path d="M58 72 L145 30 L232 72 Z" fill="' + T + '" stroke="' + N + '" stroke-width="2.4" stroke-linejoin="round"/>'
      + '<rect x="128" y="100" width="28" height="50" rx="2" fill="' + N + '"/>'
      + '<rect class="hs-twinkle" x="86" y="92" width="26" height="22" rx="2" fill="' + H + '"/><rect class="hs-twinkle" x="174" y="92" width="26" height="22" rx="2" fill="' + H + '"/>'
      + '<line x1="60" y1="150" x2="240" y2="150" stroke="' + N + '" stroke-width="3"/>'
      + '<path d="M232 150 v-26 h14 v26 M232 136 h14" fill="none" stroke="' + N + '" stroke-width="2.2"/></g>'),
    road: () => frame('<circle cx="48" cy="40" r="12" fill="' + H + '" opacity=".5"/><path d="M0 180 L0 120 Q 160 100 320 120 L320 180 Z" fill="' + L + '"/>'
      + '<path d="M130 180 Q 150 140 160 118 Q 170 140 190 180 Z" fill="#fff" stroke="' + N + '" stroke-width="1.6"/>'
      + '<line x1="160" y1="128" x2="160" y2="176" stroke="' + H + '" stroke-width="2.4" stroke-dasharray="6 6"/>'
      + '<g class="hs-bob">' + house(28, 86, 1.1, true) + house(80, 94, .9, true) + house(212, 94, .9, true) + house(258, 86, 1.1, true) + '</g>'),
    phone: () => frame(hills(.35) + '<rect x="80" y="122" width="160" height="10" rx="3" fill="' + N + '"/>'
      + '<line x1="98" y1="132" x2="92" y2="170" stroke="' + N + '" stroke-width="3"/><line x1="222" y1="132" x2="228" y2="170" stroke="' + N + '" stroke-width="3"/>'
      + '<g class="hs-bob"><rect x="132" y="66" width="56" height="56" rx="10" fill="#fff" stroke="' + N + '" stroke-width="2.4"/>'
      + '<path d="M146 84 q 14 -10 28 0 v6 q -14 -6 -28 0 Z" fill="' + T + '" stroke="' + N + '" stroke-width="1.8"/>'
      + '<circle cx="160" cy="104" r="8" fill="' + P + '" stroke="' + N + '" stroke-width="1.8"/>'
      + '<path d="M160 64 c -6 -8 -14 -2 -10 4 l10 9 l10 -9 c 4 -6 -4 -12 -10 -4 Z" fill="' + H + '" stroke="' + N + '" stroke-width="1.4" transform="translate(22 -8) scale(.8)"/></g>'
      + '<g transform="translate(212 92)"><rect x="0" y="12" width="20" height="18" rx="3" fill="' + H + '" stroke="' + N + '" stroke-width="1.8"/>'
      + '<path d="M10 12 q -10 -14 -2 -22 M10 12 q 8 -12 14 -14" fill="none" stroke="' + T + '" stroke-width="2.4" stroke-linecap="round"/></g>'),
    mailbox: () => frame(hills() + '<line x1="160" y1="100" x2="160" y2="160" stroke="' + N + '" stroke-width="5"/>'
      + '<g class="hs-bob"><path d="M118 70 h56 a20 20 0 0 1 20 20 v14 h-96 v-14 a20 20 0 0 1 20 -20 Z" fill="#fff" stroke="' + N + '" stroke-width="2.4"/>'
      + '<path d="M118 70 a20 20 0 0 1 20 20 v14" fill="none" stroke="' + N + '" stroke-width="2.4"/>'
      + '<rect x="104" y="88" width="20" height="12" rx="2" fill="' + T + '"/><line x1="196" y1="98" x2="216" y2="98" stroke="' + N + '" stroke-width="2.4"/>'
      + '<rect x="214" y="92" width="16" height="9" rx="1" fill="' + H + '" stroke="' + N + '" stroke-width="1.6"/></g>'
      + '<path d="M60 140 q 6 -16 12 0 q 6 -16 12 0" fill="none" stroke="' + T + '" stroke-width="2.4"/>'),
    garden: () => {
      let g = ''; [60, 120, 180, 240].forEach((x, i) => {
        g += '<g class="hs-bob"><line x1="' + x + '" y1="132" x2="' + x + '" y2="' + (96 - i * 8) + '" stroke="' + T + '" stroke-width="3"/>'
          + '<path d="M' + x + ' ' + (112 - i * 6) + ' q -18 -4 -20 -18 q 16 2 20 18 Z" fill="' + M + '" stroke="' + N + '" stroke-width="1.4"/>'
          + '<path d="M' + x + ' ' + (106 - i * 8) + ' q 18 -4 20 -18 q -16 2 -20 18 Z" fill="' + T + '" stroke="' + N + '" stroke-width="1.4"/>'
          + (i > 1 ? '<circle cx="' + x + '" cy="' + (92 - i * 8) + '" r="7" fill="' + H + '" stroke="' + N + '" stroke-width="1.4"/>' : '') + '</g>';
      });
      return frame('<circle cx="270" cy="40" r="14" fill="' + H + '" opacity=".7"/><rect x="0" y="132" width="320" height="48" fill="' + L + '"/>' + g
        + '<path d="M0 132 Q 160 124 320 132" fill="none" stroke="' + N + '" stroke-width="2"/>');
    },
    lighthouse: () => frame('<circle cx="60" cy="40" r="2" fill="#fff"/><circle cx="100" cy="24" r="1.6" fill="#fff"/><circle cx="250" cy="30" r="2" fill="#fff"/>'
      + '<path d="M0 150 Q 80 140 160 152 T 320 146 L320 180 L0 180 Z" fill="' + T + '" opacity=".6"/>'
      + '<g class="hs-bob"><path class="hs-twinkle" d="M196 58 L250 40 L250 76 Z" fill="' + H + '" opacity=".45"/>'
      + '<path d="M146 150 L152 70 h16 l6 80 Z" fill="#fff" stroke="' + N + '" stroke-width="2.4"/>'
      + '<rect x="149" y="96" width="22" height="10" fill="' + T + '"/><rect x="151" y="122" width="18" height="10" fill="' + T + '"/>'
      + '<rect x="148" y="56" width="24" height="16" rx="2" fill="' + H + '" stroke="' + N + '" stroke-width="2.2"/><path d="M146 56 L160 44 L174 56 Z" fill="' + N + '"/></g>', '#1B4A73', '#2C6E8F'),
    coffee: () => {
      let steam = ''; [142, 158, 174].forEach((x, i) => { steam += '<path class="hs-twinkle" style="animation-delay:' + (i * .4) + 's" d="M' + x + ' 70 q -6 -10 0 -18 q 6 -8 0 -18" fill="none" stroke="' + L + '" stroke-width="3" stroke-linecap="round"/>'; });
      return frame('<rect x="0" y="128" width="320" height="52" fill="#f2f0e9"/><line x1="0" y1="128" x2="320" y2="128" stroke="' + N + '" stroke-width="2"/>'
        + '<g class="hs-bob"><path d="M126 78 h64 v40 a22 22 0 0 1 -22 22 h-20 a22 22 0 0 1 -22 -22 Z" fill="#fff" stroke="' + N + '" stroke-width="2.4"/>'
        + '<path d="M190 88 h8 a12 12 0 0 1 0 24 h-8" fill="none" stroke="' + N + '" stroke-width="2.4"/><rect x="126" y="92" width="64" height="12" fill="' + T + '"/>'
        + '<path d="M158 112 c -5 -6 -11 -1 -8 3 l8 7 l8 -7 c 3 -4 -3 -9 -8 -3 Z" fill="' + H + '"/>' + steam + '</g>'
        + '<rect x="214" y="112" width="60" height="16" rx="2" fill="' + H + '" stroke="' + N + '" stroke-width="1.8"/><rect x="220" y="100" width="52" height="12" rx="2" fill="' + M + '" stroke="' + N + '" stroke-width="1.8"/>');
    }
  };
  function css(){
    if(document.getElementById('hsCss')) return;
    const st = document.createElement('style'); st.id = 'hsCss';
    st.textContent = '.hs-svg{display:block;width:100%;height:auto;border-radius:12px;}'
      + '.hs-empty{display:grid;gap:8px;justify-items:center;text-align:center;padding:18px 16px 20px;margin:8px 0 6px;}'
      + '.hs-empty .hs-svg{width:min(100%,340px);}'
      + '.hs-say{font-size:17px;font-weight:800;color:var(--navy);letter-spacing:-.01em;}'
      + '.hs-sub{font-size:13px;color:var(--text-muted);max-width:46ch;}'
      + '.hs-links{display:flex;gap:16px;flex-wrap:wrap;justify-content:center;}'
      + '.hs-links button{font:inherit;font-size:12.5px;font-weight:700;color:var(--teal);background:none;border:0;padding:2px 0;cursor:pointer;}'
      + '.hs-links button:hover{text-decoration:underline;}'
      + '.hs-banner{display:flex;gap:14px;align-items:center;padding:10px 14px;margin:0 0 10px;}'
      + '.hs-banner .hs-svg{width:128px;flex:0 0 128px;border-radius:9px;}'
      + '.hs-banner .hs-say{font-size:15px;}'
      + '.hs-bob{transition:transform .35s ease;}'
      + '.hs-empty:hover .hs-bob,.hs-banner:hover .hs-bob{transform:translateY(-3px);}'
      + '.hs-spin{transform-origin:center;transform-box:fill-box;animation:hsSpin 26s linear infinite;}'
      + '.hs-twinkle{animation:hsTw 2.4s ease-in-out infinite alternate;}'
      + '@keyframes hsSpin{to{transform:rotate(360deg)}}@keyframes hsTw{from{opacity:.6}to{opacity:1}}'
      + '@media (prefers-reduced-motion:reduce){.hs-bob,.hs-spin,.hs-twinkle{animation:none!important;transition:none!important;}}';
    document.head.appendChild(st);
  }
  function svg(name){ css(); return (SCENES[name] || SCENES.sunrise)(); }
  /* links: [[label, onclick-js]] written by the Hub, never from data */
  function links(list){ return (list || []).length ? '<div class="hs-links">' + list.map(l => '<button type="button" onclick="' + esc(l[1]) + '">' + esc(l[0]) + '</button>').join('') + '</div>' : ''; }
  function empty(o){
    return '<div class="card hs-empty" data-scene="' + esc(o.scene) + '">' + svg(o.scene) + '<div class="hs-say">' + esc(o.say) + '</div>'
      + (o.sub ? '<div class="hs-sub">' + esc(o.sub) + '</div>' : '') + links(o.links) + '</div>';
  }
  function banner(o){
    return '<div class="card hs-banner" data-scene="' + esc(o.scene) + '">' + svg(o.scene) + '<div style="min-width:0;"><div class="hs-say">' + esc(o.say) + '</div>'
      + (o.sub ? '<div class="hs-sub">' + esc(o.sub) + '</div>' : '') + '</div></div>';
  }
  window.HS = { svg, empty, banner, names:Object.keys(SCENES) };
})();
