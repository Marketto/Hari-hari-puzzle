/* Aggiornamento "in place" del DOM: invece di sostituire tutto con innerHTML (nodi nuovi a ogni mossa, animazioni CSS che
 * ripartono, sfarfallio, focus perso) si confronta il markup nuovo con i nodi esistenti e si toccano solo attributi e
 * testi cambiati. Un nodo si sostituisce solo se cambia tipo o chiave (data-key, data-o, data-a, data-inv, data-zoom, id).
 *   HH.domPatch.patch(el, html)   aggiorna i figli di el (HTML o SVG, in base a el)
 *   HH.domPatch.morph(a, b)       allinea i figli del nodo vivo a a quelli del nodo b (b viene svuotato)
 * Logica pura sui nodi (niente document in morph): testabile in Node con un DOM finto (tests/dom-patch.test.mjs). */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const KEYS = ['data-key', 'data-o', 'data-a', 'data-inv', 'data-zoom', 'id'];
  const keyOf = (n) => { if (n.nodeType !== 1) return ''; for (const k of KEYS) { const v = n.getAttribute(k); if (v != null) return k + '=' + v; } return ''; };
  const same = (x, y) => x.nodeType === y.nodeType && x.nodeName === y.nodeName && keyOf(x) === keyOf(y);

  function syncAttrs(x, y) {
    const ya = y.attributes, seen = new Set();
    for (let i = 0; i < ya.length; i++) {
      const a = ya[i];
      seen.add(a.name);
      if (x.getAttribute(a.name) !== a.value) {
        if (a.namespaceURI) x.setAttributeNS(a.namespaceURI, a.name, a.value); else x.setAttribute(a.name, a.value);
      }
    }
    const xa = x.attributes;
    for (let i = xa.length - 1; i >= 0; i--) { const n = xa[i].name; if (!seen.has(n)) x.removeAttribute(n); }
  }
  function morphNode(x, y) {
    if (x.nodeType === 3 || x.nodeType === 8) { if (x.nodeValue !== y.nodeValue) x.nodeValue = y.nodeValue; return; }
    syncAttrs(x, y);
    morph(x, y);
  }
  function morph(a, b) {
    const bc = Array.from(b.childNodes);
    for (let i = 0; i < bc.length; i++) {
      const x = a.childNodes[i], y = bc[i];
      if (!x) a.appendChild(y);
      else if (same(x, y)) morphNode(x, y);
      else a.replaceChild(y, x);
    }
    while (a.childNodes.length > bc.length) a.removeChild(a.lastChild);
    return a;
  }
  const SVG = 'http://www.w3.org/2000/svg';
  function patch(el, html) {
    const doc = el.ownerDocument || G.document;
    const t = doc.createElement('template');
    if (el.namespaceURI === SVG) { t.innerHTML = `<svg xmlns="${SVG}">${html}</svg>`; return morph(el, t.content.firstChild); }
    t.innerHTML = html;
    return morph(el, t.content);
  }
  HH.domPatch = { morph, patch };
})(typeof globalThis !== 'undefined' ? globalThis : window);
