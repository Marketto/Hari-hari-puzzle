/* Hari, il riccio mascotte. SVG generato da codice (stesso disegno usato per le icone).
 * HH.mascot.svg({ cls }) -> stringa SVG; HH.mascot.mini() -> riccio piccolo per le celle.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});

  function spikes(cx, cy, n, ro, ri, rot) {
    const pts = [];
    for (let i = 0; i < n * 2; i++) {
      const a = rot + (i * Math.PI) / n;
      // niente aculei sotto il mento: il pancino resta morbido
      const r = i % 2 || Math.sin(a) > 0.5 ? ri : ro;
      pts.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1));
    }
    return pts.join(' ');
  }

  function svg(opts = {}) {
    const cls = opts.cls || 'hari';
    const id = 'h' + Math.random().toString(36).slice(2, 7);
    return `<svg class="${cls}" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Hari">
  <defs>
    <radialGradient id="${id}s" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#c58d68"/><stop offset="1" stop-color="#8a5a40"/></radialGradient>
    <radialGradient id="${id}f" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="#fff6ec"/><stop offset="1" stop-color="#ffdcc0"/></radialGradient>
    <radialGradient id="${id}e" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#6b4330"/><stop offset=".6" stop-color="#2e1a12"/><stop offset="1" stop-color="#1c0f0a"/></radialGradient>
  </defs>
  <ellipse class="hari-shadow" cx="100" cy="188" rx="56" ry="7" fill="#4a2f27" opacity=".14"/>
  <g class="hari-body">
    <polygon points="${spikes(100, 104, 17, 90, 68, -Math.PI / 2)}" fill="url(#${id}s)" stroke="#7a4c35" stroke-width="3" stroke-linejoin="round"/>
    <polygon points="${spikes(100, 100, 11, 70, 56, -Math.PI / 2 + 0.14)}" fill="#a8714f" opacity=".55"/>
    <circle cx="54" cy="70" r="15" fill="#ffe3cc" stroke="#7a4c35" stroke-width="3"/>
    <circle cx="54" cy="70" r="7" fill="#ffb3c4"/>
    <circle cx="146" cy="70" r="15" fill="#ffe3cc" stroke="#7a4c35" stroke-width="3"/>
    <circle cx="146" cy="70" r="7" fill="#ffb3c4"/>
    <ellipse cx="100" cy="122" rx="64" ry="56" fill="url(#${id}f)" stroke="#7a4c35" stroke-width="3"/>
    <g transform="translate(142 40)"><g class="hari-flower">
      <circle cx="0" cy="-8" r="7" fill="#ff8fb3"/><circle cx="8" cy="-2" r="7" fill="#ff8fb3"/>
      <circle cx="5" cy="8" r="7" fill="#ff8fb3"/><circle cx="-5" cy="8" r="7" fill="#ff8fb3"/>
      <circle cx="-8" cy="-2" r="7" fill="#ff8fb3"/><circle cx="0" cy="1" r="5" fill="#ffd36e"/>
    </g></g>
    <g class="hari-eyes">
      <ellipse cx="74" cy="116" rx="17" ry="20" fill="url(#${id}e)"/>
      <ellipse cx="126" cy="116" rx="17" ry="20" fill="url(#${id}e)"/>
      <g class="hari-shine">
        <circle cx="80" cy="107" r="6.5" fill="#fff"/><circle cx="69" cy="125" r="3" fill="#fff" opacity=".9"/>
        <circle cx="132" cy="107" r="6.5" fill="#fff"/><circle cx="121" cy="125" r="3" fill="#fff" opacity=".9"/>
        <path d="M84 120 l2 -4 l2 4 l-2 4z" fill="#fff" opacity=".8"/><path d="M136 120 l2 -4 l2 4 l-2 4z" fill="#fff" opacity=".8"/>
      </g>
    </g>
    <ellipse cx="54" cy="142" rx="12" ry="6.5" fill="#ff9fb8" opacity=".7"/>
    <ellipse cx="146" cy="142" rx="12" ry="6.5" fill="#ff9fb8" opacity=".7"/>
    <ellipse cx="100" cy="140" rx="7" ry="5" fill="#3a2418"/>
    <circle cx="98" cy="138.5" r="1.7" fill="#fff"/>
    <path class="hari-mouth" d="M91 149 q4.5 6 9 0 q4.5 6 9 0" fill="none" stroke="#3a2418" stroke-width="2.6" stroke-linecap="round"/>
    <ellipse cx="76" cy="178" rx="15" ry="8" fill="#ffd6b8" stroke="#7a4c35" stroke-width="2.5"/>
    <ellipse cx="124" cy="178" rx="15" ry="8" fill="#ffd6b8" stroke="#7a4c35" stroke-width="2.5"/>
  </g>
</svg>`;
  }

  // Riccio piccolo e semplificato per le celle di Hedgedoku
  function mini() {
    return `<svg class="mini-hari" viewBox="0 0 100 100" aria-hidden="true">
  <polygon points="${spikes(50, 54, 11, 46, 34, -Math.PI / 2)}" fill="#8a5a40" stroke="#6b432f" stroke-width="3" stroke-linejoin="round"/>
  <ellipse cx="50" cy="62" rx="32" ry="27" fill="#ffe8d4" stroke="#6b432f" stroke-width="3"/>
  <ellipse cx="38" cy="58" rx="7" ry="8.5" fill="#2e1a12"/><ellipse cx="62" cy="58" rx="7" ry="8.5" fill="#2e1a12"/>
  <circle cx="40.5" cy="54.5" r="2.8" fill="#fff"/><circle cx="64.5" cy="54.5" r="2.8" fill="#fff"/>
  <ellipse cx="50" cy="69" rx="4" ry="3" fill="#2e1a12"/>
  <ellipse cx="29" cy="70" rx="6" ry="3.5" fill="#ff9fb8" opacity=".75"/><ellipse cx="71" cy="70" rx="6" ry="3.5" fill="#ff9fb8" opacity=".75"/>
</svg>`;
  }

  HH.mascot = { svg, mini };
})(typeof globalThis !== 'undefined' ? globalThis : window);
