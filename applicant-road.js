/* The road to your first shift (2026-10-18, Samantha: "can those cute visuals be added to the applicants side that they
   see as well?"). A small picture at the top of the pages a new hire opens, in the same hand as the Hub's garden and
   the person page's road: eight stops, the ones behind them ticked, a little car where they are now, and a house at
   the end. Each page knows where the person is by itself, so nothing new is read or stored, and nothing is sent.
     ARoad.html(at)   at = the index of the stop they are on (0 Applied ... 7 First shift)
   The order is the real one (Step 1's "All done" screen): Offer, Step 1 paperwork, background checks and references,
   Step 2 payroll in Viventium, the Orientation Video Call, the first shift. No em dashes (her rule for anything a
   person reads). Still for anyone whose phone asks for less motion. */
(function(){
  const STOPS = ['Applied', 'Interview', 'Offer', 'Paperwork', 'Checks & references', 'Payroll setup', 'Orientation', 'First shift'];
  const N = '#0D365F', T = '#0F7A73', H = '#F0A63A', M = '#8FD1C7', P = '#EAF4F6', L = '#CADDD9';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  function css(){
    if(document.getElementById('aroadCss')) return;
    const st = document.createElement('style'); st.id = 'aroadCss';
    st.textContent = '.aroad{margin:6px 0 14px;}.aroad svg{display:block;width:100%;height:auto;border-radius:12px;}'
      + '.aroad .car{transition:transform 1s cubic-bezier(.3,1.2,.5,1);}'
      + '.aroad-say{font-size:14px;margin-top:6px;color:#16283a;}.aroad-say b{color:' + N + ';}'
      + '.aroad .lbl{font-size:10.5px;font-weight:700;fill:#55677a;}.aroad .lbl.now{fill:' + N + ';font-weight:800;}.aroad .lbl.done{fill:' + T + ';}'
      + '@media (max-width:520px){.aroad .lbl{display:none;}}'
      + '@media (prefers-reduced-motion:reduce){.aroad .car{transition:none;}}';
    document.head.appendChild(st);
  }
  function html(at){
    css();
    const n = STOPS.length, cur = Math.max(0, Math.min(n - 1, at | 0));
    const W = 640, x0 = 34, x1 = W - 70, gap = (x1 - x0) / (n - 1), X = i => x0 + i * gap;
    let h = '<rect width="' + W + '" height="132" rx="12" fill="' + P + '"/><circle cx="' + (W - 34) + '" cy="26" r="13" fill="' + H + '" opacity="' + (cur === n - 1 ? 1 : .55) + '"/>'
      + '<path d="M0 132 L0 92 Q ' + (W / 2) + ' 74 ' + W + ' 92 L' + W + ' 132 Z" fill="' + L + '"/>'
      + '<rect x="0" y="84" width="' + W + '" height="20" fill="#fff" stroke="' + N + '" stroke-width="1.4"/>'
      + '<rect x="0" y="84" width="' + X(cur).toFixed(1) + '" height="20" fill="' + M + '" opacity=".5"/>'
      + '<line x1="0" y1="94" x2="' + W + '" y2="94" stroke="' + H + '" stroke-width="2" stroke-dasharray="10 9"/>';
    STOPS.forEach((s, i) => {
      const x = X(i), done = i < cur, now = i === cur;
      h += '<line x1="' + x + '" y1="84" x2="' + x + '" y2="64" stroke="' + N + '" stroke-width="2"/>'
        + '<circle cx="' + x + '" cy="58" r="' + (now ? 9 : 7.5) + '" fill="' + (done ? T : now ? H : '#fff') + '" stroke="' + N + '" stroke-width="1.8"/>'
        + (done ? '<path d="M' + (x - 3.5) + ' 58 l2.5 2.5 4.5-5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>' : '')
        + '<text class="lbl' + (done ? ' done' : now ? ' now' : '') + '" x="' + x + '" y="' + (i % 2 ? 124 : 40) + '" text-anchor="middle">' + esc(s) + '</text>';
    });
    h += '<g transform="translate(' + (W - 52) + ' 46)"><path d="M0 16 L16 3 L32 16" fill="' + T + '" stroke="' + N + '" stroke-width="1.8" stroke-linejoin="round"/><rect x="4" y="15" width="24" height="18" fill="#fff" stroke="' + N + '" stroke-width="1.8"/><rect x="8" y="19" width="6" height="6" fill="' + H + '"/><rect x="17" y="22" width="6" height="11" fill="' + N + '"/></g>';
    h += '<g class="car" style="transform:translate(' + (X(cur) - 20).toFixed(1) + 'px,78px)"><rect x="0" y="5" width="40" height="13" rx="4.5" fill="' + T + '" stroke="' + N + '" stroke-width="1.8"/><path d="M7 5 L12 -1 H28 L33 5" fill="#fff" stroke="' + N + '" stroke-width="1.8"/><circle cx="10" cy="19" r="4.5" fill="' + N + '"/><circle cx="30" cy="19" r="4.5" fill="' + N + '"/></g>';
    const next = STOPS[cur + 1];
    return '<div class="aroad" role="img" aria-label="Your road to your first shift: you are at ' + esc(STOPS[cur]) + (next ? ', next is ' + esc(next) : '') + '.">'
      + '<svg viewBox="0 0 ' + W + ' 132" aria-hidden="true">' + h + '</svg>'
      + '<div class="aroad-say">You are here: <b>' + esc(STOPS[cur]) + '</b>' + (next ? ' · Next: ' + esc(next) : '') + '</div></div>';
  }
  window.ARoad = { html, STOPS };
})();
