// js/app.js — router, render, the Antz Home in the frame, the prototype controls outside the device, saving, and fitting the frame.
// Home › Modules › Diet opens #/diets (and #/history); Home › Modules › Help Desk opens #/requests (and #/new). No bottom navigation:
// each module goes back to Home from its first screen. URL options: ?f=phone|portrait|landscape, ?as=hydar|suresh|manoj, ?fill.

const STORE = 'antz-diet-module-v9';   // bump whenever the demo data changes (v9: diets know when they were made; v8: diets set at more than one level; v7: diets named Year Round Tortoise Diet and so on; v6: one cassowary chick; mixes, cadence, Age/Weight diets)
const AS = { hydar: 'u-hydar', suresh: 'u-suresh', manoj: 'u-manoj' };
const FRAMES = { phone: 'phone', portrait: 'tab-p', landscape: 'tab-l' };
function storeSave() { try { localStorage.setItem(STORE, JSON.stringify({ day: TODAY, D, S: { user: S.user, frame: S.frame, site: S.site } })); } catch (e) {} }
(function load() {
  let o = null; try { o = JSON.parse(localStorage.getItem(STORE)); } catch (e) {}
  if (o && o.day === TODAY && o.D) useData(o.D); else { useData(SEED(TODAY)); seedApprovals(); }
  if (o && o.S) Object.assign(S, o.S);
  const q = new URLSearchParams(location.search);
  if (AS[q.get('as')]) S.user = AS[q.get('as')];
  if (FRAMES[q.get('f')]) S.frame = FRAMES[q.get('f')];
})();
function resetData() { try { localStorage.removeItem(STORE); } catch (e) {} Object.assign(S, { site: 'all', draft: null, rTab: 'pending', rDept: 'all', rPrio: 'all', rQ: '', rSearch: false, hWeek: 0, hDay: null, hType: 'all', lvl: {} }); useData(SEED(TODAY)); seedApprovals(); storeSave(); closeAll(); go('#/home'); toast('Demo data reset'); }

/* ---------- router and render ---------- */
const route = () => (location.hash || '#/home').slice(2).split('?')[0].split('/');
function view() {
  const parts = route(), q = new URLSearchParams(location.hash.split('?')[1] || '');
  if (parts[0] !== 'new') S.back = location.hash || '#/home';
  switch (parts[0]) {
    case 'diets': { const v = vDiets(parts); return typeof v === 'string' ? { html: v } : v; }
    case 'history': { const v = vHistory(parts); return typeof v === 'string' ? { html: v } : v; }
    case 'requests': return { html: vHelpDesk(parts) };
    case 'new': return { html: paneForm(q) };
    default: return { home: true };
  }
}
/* on the iPad the form opens over the screen it came from */
function baseView() {
  const h = S.back && !S.back.startsWith('#/new') ? S.back : '#/requests', parts = h.slice(2).split('?')[0].split('/');
  const v = parts[0] === 'diets' ? vDiets(parts) : parts[0] === 'history' ? vHistory(parts) : vHelpDesk(parts);
  return typeof v === 'string' ? v : v.html;
}
/* the Antz Home, loaded once and kept, so coming back finds it as it was */
function showHome(on) {
  const fr = $('#homefr');
  if (on && !fr.src) fr.src = 'home/index.html?v=2';
  fr.hidden = !on; $('#app').hidden = on;
}
addEventListener('message', e => { const r = e.data && e.data.antzOpen; if (r === 'diets' || r === 'requests') { if (r === 'requests') { S.rDept = 'all'; S.rTab = 'pending'; } go('#/' + r); } });
/* the app's own back trail: Back returns to the screen you came from, even after a reload, a shared link or inside the hub viewer */
const TRAIL = [];
function track(h) { if (TRAIL.length >= 2 && TRAIL[TRAIL.length - 2] === h) TRAIL.pop(); else if (TRAIL[TRAIL.length - 1] !== h) TRAIL.push(h); if (TRAIL.length > 40) TRAIL.shift(); }
function goBack(fallback) { go(TRAIL[TRAIL.length - 2] || fallback); }
let V = null;
function render() {
  track(location.hash || '#/home');
  const dev = $('.device');
  dev.className = `device ${S.frame} ${isTab() ? 'tab' : ''}`;
  const main = $('#main'), act = document.activeElement, fid = act && act.id && dev.contains(act) ? act.id : null, pos = fid ? act.selectionStart : null;
  try { V = view(); } catch (e) { console.error(e); V = { html: pane('pane--fill', topbar({ back: '#/home', title: 'Something went wrong' }), empty1(esc(e.message))) }; }
  showHome(!!V.home);
  if (!V.home) {
    /* only what changed is redrawn (morph), so the screen never flashes; a new screen enters (phone: from the side it comes from) */
    const before = new Set([...main.children].map(c => c.getAttribute('data-k'))), depth = route().filter(Boolean).length, moved = render.last !== location.hash;
    morph(main, V.html);
    if (render.done) [...main.children].forEach(c => { if (!before.has(c.getAttribute('data-k'))) enter(c, isPhone() && moved ? (depth >= (render.depth || 0) ? 'in-fwd' : 'in-back') : 'in-fade'); });
    render.depth = depth;
    const ov = $('#over'), ovHtml = V.sheet ? 'sheet' : V.modal ? 'modal' : V.overlay ? 'ov' : '';
    /* an overlay that is closing slides away first */
    if (!ovHtml && ov.firstElementChild && !calm()) { const c = ov.firstElementChild; if (!c.classList.contains('out')) { c.classList.add('out'); setTimeout(() => { if (c.parentNode === ov && !(V.sheet || V.modal || V.overlay)) ov.innerHTML = ''; }, 230); } }
    else morph(ov, V.sheet ? `<div class="bs-scrim" onclick="if(event.target===this)go('${V.modalClose}')"><div class="bsheet" role="dialog" aria-modal="true" data-k="bs-${V.sheet}"><div class="bsheet__grab" onpointerdown="sheetDrag(event,'${V.modalClose}')" aria-hidden="true"><i></i></div>${V.modal}</div></div>`
      : V.modal ? `<div class="modal-scrim"${V.modalClose ? ` onclick="if(event.target===this)go('${V.modalClose}')"` : ''}>${V.modal.replace('class="pane ', 'class="modal pane ')}</div>` : V.overlay || '');
    if (fid && document.getElementById(fid)) { const el = document.getElementById(fid); el.focus({ preventScroll: true }); try { if (pos != null) el.setSelectionRange(pos, pos); } catch (e) {} }
  } else $('#over').innerHTML = '';
  render.last = location.hash; render.done = true;
  if (SH.length) drawOverlay();
  positionThumbs($('.device'));
  fabFit();
  drawStage();
}
/* Raise request shrinks to its icon once the diet is scrolled, so it never sits over the amounts (audit, 2 Nov) */
function fabFit(b) {
  (b ? [b] : [...document.querySelectorAll('.has-fab > .pane__body')]).forEach(x => { const f = x.parentElement.querySelector(':scope > .dfab'); if (f) f.classList.toggle('dfab--mini', x.scrollTop > 120); });
}
document.addEventListener('scroll', e => { if (e.target instanceof Element && e.target.matches('.has-fab > .pane__body')) fabFit(e.target); }, true);

/* ---------- prototype controls: outside the device, not part of the app ---------- */
function drawStage() {
  if (document.body.classList.contains('fill')) return;
  const opt = (on, label, js) => `<button class="stage__opt" aria-current="${on}" onclick="${js}">${label}</button>`;
  $('#stage-bar').innerHTML = `<b class="cap">Prototype controls</b>
    <span class="stage__grp">Frame ${[['phone', 'Phone'], ['tab-p', 'iPad portrait'], ['tab-l', 'iPad landscape']].map(([k, l]) => opt(S.frame === k, l, `setFrame('${k}')`)).join(' · ')}</span>
    <span class="stage__grp">Viewing as ${VIEWERS.map(id => opt(S.user === id, `${user(id).name} (${user(id).title})`, `setUser('${id}')`)).join(' · ')}</span>
    <span class="stage__grp">${opt(false, 'Home', "go('#/home')")} · ${opt(false, 'Reset demo data', 'resetData()')} · ${opt(figmaOpen, 'Copy to Figma', 'copyToFigma()')}</span>`;
}
/* Copy to Figma: Figma's own capture script, loaded on first use. It copies the screen in the frame as Figma layers (paste with Cmd+V
   in Figma), then shows its bar: Entire screen · Select element (a card, a sheet, a list). While that bar is open the frame is at full
   size, so the layers come out at the device's real size. The Antz Home is its own page, so on Home the script runs inside it. */
const FIGMA_JS = 'https://mcp.figma.com/mcp/html-to-design/capture.js';
let figmaOpen = false;
function loadFigma(w) {
  if (w.figma && w.figma.captureForDesign) return Promise.resolve();
  return new Promise((ok, no) => { const s = w.document.createElement('script'); s.src = FIGMA_JS; s.onload = ok; s.onerror = () => { s.remove(); no(); }; w.document.head.appendChild(s); });
}
function copyToFigma() {
  if (figmaOpen) return;
  const fr = $('#homefr'), home = !fr.hidden, w = home ? fr.contentWindow : window;
  figmaOpen = true; fit();
  loadFigma(w).then(() => w.figma.captureForDesign({ selector: home ? 'body' : '.device' }), () => toast("Couldn't load Figma's capture tool. Check the internet connection."))
    .finally(() => { figmaOpen = false; fit(); });
}
function setFrame(f) { S.frame = f; closeAll(); storeSave(); fit(); }
function setUser(id) { S.user = id; S.draft = null; S.rDept = 'all'; closeAll(); storeSave(); if (route()[0] === 'new') go('#/requests'); else render(); toast(`Viewing as ${user(id).name}, ${user(id).title}`); }
/* the frame: scaled to fit the window on a desktop; on a real phone or iPad (or ?fill) it is the screen */
function fit() {
  const dev = $('.device'), slot = $('.device-slot'), q = new URLSearchParams(location.search);
  const touch = matchMedia('(pointer: coarse)').matches, fill = q.has('fill') || (touch && Math.min(innerWidth, innerHeight) < 1400);
  document.body.classList.toggle('fill', fill);
  if (fill) { S.frame = Math.min(innerWidth, innerHeight) < 600 ? 'phone' : innerWidth > innerHeight ? 'tab-l' : 'tab-p'; dev.style.transform = ''; slot.style.width = slot.style.height = ''; render(); return; }
  const W = { phone: 390, 'tab-p': 834, 'tab-l': 1194 }[S.frame], H = { phone: 844, 'tab-p': 1194, 'tab-l': 834 }[S.frame];
  drawStage();
  const k = figmaOpen ? 1 : Math.min(1, (innerHeight - slot.getBoundingClientRect().top - 24) / H, (innerWidth - 48) / W);
  dev.style.transform = k < 1 ? `scale(${k})` : ''; slot.style.width = W * k + 'px'; slot.style.height = H * k + 'px';
  render();
}
/* the Apple sheet: drag the handle down to close it, or let go to spring back */
function sheetDrag(e, close) {
  const sh = e.target.closest('.bsheet'); if (!sh) return;
  const y0 = e.clientY, k = sh.getBoundingClientRect().height / sh.offsetHeight || 1; let dy = 0;
  sh.style.transition = 'none';
  const move = ev => { dy = Math.max(0, (ev.clientY - y0) / k); sh.style.transform = `translateY(${dy}px)`; };
  const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); sh.style.transition = '';
    if (dy > 120) { sh.style.transform = 'translateY(100%)'; setTimeout(() => go(close), 180); } else sh.style.transform = ''; };
  addEventListener('pointermove', move); addEventListener('pointerup', up);
}
addEventListener('resize', fit);
addEventListener('hashchange', () => { closeAll(); render(); });
fit();
