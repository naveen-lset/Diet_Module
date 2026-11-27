// js/app.js — router, render, the Antz Home in the frame, the prototype controls outside the device, saving, and fitting the frame.
// Home › Modules › Diet opens #/diets (and #/history); Home › Modules › Help Desk opens #/requests (and #/new). No bottom navigation:
// each module goes back to Home from its first screen. URL options: ?f=phone|portrait|landscape, ?as=hydar|suresh|manoj, ?fill.

const STORE = 'antz-diet-module-v21';   // bump whenever the demo data changes (v21: real-looking place and people names; v20: Coypu 1, CL 1 and SW 1 so each species' own diet is in use; v19: diets wait for the Dietitian's certification, with comments; v18: the tortoise age diet has six age groups; v17: 10 sites, 10 sections, 20 enclosures, about 100 animals; v16: amounts by sex, age or weight bands; v15: animals go by AID in the seed titles; v14: diet requests end at approval, which applies them; requests in words; v13: the diet history says who updated it in the kitchen; v12: diet requests — the Biologist raises, the Dietician approves, the Kitchen updates; v11: Help Desk In progress and Completed, the team's Job in charge; v10: requests say how long and can be for many places; v9: diets know when they were made; v8: diets set at more than one level; v7: diets named Year Round Tortoise Diet and so on; v6: one cassowary chick; mixes, cadence, Age/Weight diets)
const AS = { kiran: 'u-kiran', aparna: 'u-hydar', hydar: 'u-hydar', suresh: 'u-suresh', manoj: 'u-manoj' };
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
function resetData() { try { localStorage.removeItem(STORE); } catch (e) {} Object.assign(S, { site: 'all', draft: null, rTab: 'pending', rSub: 'all', rDept: 'all', rPrio: 'all', rF: null, seen: {}, rQ: '', rSearch: false, hWeek: 0, hDay: null, hType: 'all', lvl: {} }); useData(SEED(TODAY)); seedApprovals(); storeSave(); closeAll(); go('#/home'); toast('Demo data reset'); }

/* ---------- router and render ---------- */
const route = () => (location.hash || '#/home').slice(2).split('?')[0].split('/');
function view() {
  const parts = route(), q = new URLSearchParams(location.hash.split('?')[1] || '');
  if (!['new', 'suggest', 'applyto'].includes(parts[0])) S.back = underSheet(location.hash) || location.hash || '#/home';
  switch (parts[0]) {
    case 'diets': { const v = vDiets(parts); return typeof v === 'string' ? { html: v } : v; }
    case 'history': { const v = vHistory(parts); return typeof v === 'string' ? { html: v } : v; }
    case 'requests': return { html: vHelpDesk(parts) };
    /* a diet change is suggested on the diet itself (js/suggest.js); other departments keep the New Request form */
    case 'suggest': return { html: paneSuggest(q) };
    /* every request is a diet request now (Help Desk lives in the Diet module): a New Request without a department is Diet's */
    case 'applyto': return { html: paneApplyTo() };
    case 'new': { if (!q.get('dept') && !q.get('edit') && !q.get('clone')) q.set('dept', 'diet'); const e = q.get('edit') && by('requests', q.get('edit')); return { html: q.get('dept') === 'diet' || (e && isDiet(e)) ? paneSuggest(q) : paneForm(q) }; }
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
  if (on && !fr.src) fr.src = 'home/index.html?v=6';
  fr.hidden = !on; $('#app').hidden = on;
}
addEventListener('message', e => { if (e.data && e.data.antzWho) { whoSheet(); return; } const r = e.data && e.data.antzOpen; if (r === 'diets' || r === 'requests') { if (r === 'requests') { S.rTab = 'pending'; S.rSub = 'all'; } go('#/' + r); } });
/* the app's own back trail: Back returns to the screen you came from, even after a reload, a shared link or inside the hub viewer */
const TRAIL = [];
/* a sheet is never a place Back returns to (design system: a sheet works "without leaving the page"). Leaving the phone's species
   sheet for a diet or a form closes it for good, so Back goes to the list under it (owner, 3 Nov: Back reopened the sheet) */
const underSheet = h => isPhone() && /^#\/diets\/\d+$/.test(h || '') ? '#/diets' : '';
function track(h) {
  const u = underSheet(TRAIL[TRAIL.length - 1]);
  if (u && h !== u && h !== TRAIL[TRAIL.length - 1]) { TRAIL.pop(); if (TRAIL[TRAIL.length - 1] !== u) TRAIL.push(u); }
  if (TRAIL.length >= 2 && TRAIL[TRAIL.length - 2] === h) TRAIL.pop(); else if (TRAIL[TRAIL.length - 1] !== h) TRAIL.push(h); if (TRAIL.length > 40) TRAIL.shift();
}
function goBack(fallback) { go(TRAIL[TRAIL.length - 2] || fallback); }
let V = null;
function render() {
  track(location.hash || '#/home');
  const dev = $('.device');
  dev.className = `device ${S.frame} ${isTab() ? 'tab' : ''}`;
  const main = $('#main'), act = document.activeElement, fid = act && act.id && dev.contains(act) ? act.id : null, pos = fid ? act.selectionStart : null;
  try { V = view(); } catch (e) { console.error(e); V = { html: pane('pane--fill', topbar({ back: '#/home', title: 'Something went wrong' }), empty1(esc(e.message), '', 'sloth')) }; }
  showHome(!!V.home);
  if (V.home) S.homeY = 0;
  if (!V.home) {
    /* only what changed is redrawn (morph), so the screen never flashes; a new screen enters (phone: from the side it comes from) */
    const before = new Set([...main.children].map(c => c.getAttribute('data-k'))), depth = route().filter(Boolean).length, moved = render.last !== location.hash;
    /* the Diet list keeps its place: Back from a diet finds it scrolled where it was left */
    const hb = main.querySelector('.pane--home .pane__body'); if (hb) S.homeY = hb.scrollTop;
    morph(main, V.html);
    const nb = !hb && S.homeY && main.querySelector('.pane--home .pane__body'); if (nb) nb.scrollTop = S.homeY;
    if (render.done) [...main.children].forEach(c => { if (!before.has(c.getAttribute('data-k'))) enter(c, isPhone() && moved ? (depth >= (render.depth || 0) ? 'in-fwd' : 'in-back') : 'in-fade'); });
    render.depth = depth;
    const ov = $('#over');
    /* an overlay that is closing slides away first */
    if (!V.overlay && ov.firstElementChild && !calm()) { const c = ov.firstElementChild; if (!c.classList.contains('out')) { c.classList.add('out'); setTimeout(() => { if (c.parentNode === ov && !V.overlay) ov.innerHTML = ''; }, 230); } }
    else morph(ov, V.overlay || '');
    if (fid && document.getElementById(fid)) { const el = document.getElementById(fid); el.focus({ preventScroll: true }); try { if (pos != null) el.setSelectionRange(pos, pos); } catch (e) {} }
  } else $('#over').innerHTML = '';
  render.last = location.hash; render.done = true;
  if (SH.length) drawOverlay();
  positionThumbs($('.device'));
  if (typeof stripView === 'function') stripView();
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
    <span class="stage__grp">Viewing as ${VIEWERS.map(id => opt(S.user === id, `${user(id).name} (${VIEW_ROLE[id]})`, `setUser('${id}')`)).join(' · ')}</span>
    ${D.diets.some(x => x.review && x.review.state === 'asked') ? `<span class="stage__grp">Web team ${opt(false, 'Answer: updated and applied', 'webReply()')}</span>` : ''}
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
/* who you are (owner, 19 Nov 2026: "on the mobile there is no role selection, so I can't request"). On a phone or iPad the prototype fills the screen and
   the controls above the frame are gone, so the app asks once (remembered in this browser) and the Home avatar or the avatar in a module's top bar
   switches later. ?as= in the link still decides, and then nothing is asked */
const WHO_KEY = 'antz-diet-module-who';
const WHO_DOES = { 'u-kiran': 'Raises diet requests: Suggest a change and New Request', 'u-hydar': 'Approves diet requests (and the kitchen\'s substitutes); sees every diet', 'u-suresh': 'Is told when a diet changes, updates the items in the kitchen, or says an item is not in stock', 'u-manoj': 'Updates the diet in the kitchen' };
function whoSheet(firstTime = false) {
  openSheet(() => ({ title: firstTime ? 'Who are you?' : 'View as', sub: 'Each role sees its own screens', bottom: true,
    body: `<div class="sg-list">${VIEWERS.map(id => { const u = user(id); return pkRow(`pickWho('${id}')`, avatar(u.name, '48'), esc(u.name), `<span class="who-role">${esc(u.title)}</span>${esc(WHO_DOES[id])}`, '', S.user === id); }).join('')}</div>` }));
}
function pickWho(id) { try { localStorage.setItem(WHO_KEY, id); } catch (e) {} closeAll(); if (S.user !== id) setUser(id); }
/* where only a Biologist can go on: switch to Kiran and carry on */
function asBiologist(then) { try { localStorage.setItem(WHO_KEY, 'u-kiran'); } catch (e) {} S.user = 'u-kiran'; S.draft = null; SG = null; APK = null; S.rDept = 'diet'; S.rWho = null; closeAll(); storeSave(); toast(`Viewing as ${user('u-kiran').name}, ${user('u-kiran').title}`); go(then); }
const whoBtn = () => document.body.classList.contains('fill') ? `<button class="whobtn" onclick="whoSheet()" aria-label="Viewing as ${esc(me().name)}. Switch person" title="Switch person">${avatar(me().name)}</button>` : '';
function askWhoOnce() {
  if (askWhoOnce.done || !document.body.classList.contains('fill') || new URLSearchParams(location.search).get('as')) return;
  askWhoOnce.done = true; let had = null; try { had = localStorage.getItem(WHO_KEY); } catch (e) {}
  if (!had) setTimeout(() => { if (!SH.length) whoSheet(true); }, 500);
}
function setFrame(f) { S.frame = f; closeAll(); storeSave(); fit(); }
function setUser(id) { S.user = id; S.landWas = null; S.land = onTeam({ dept: 'diet' }, user(id)) ? 'requests' : 'species'; S.draft = null; S.rDept = 'diet'; S.rWho = null; closeAll(); storeSave(); APK = null; if (['new', 'suggest', 'applyto'].includes(route()[0])) { SG = null; go('#/requests'); } else render(); toast(`Viewing as ${user(id).name}, ${user(id).title}`); }
/* the frame: scaled to fit the window on a desktop; on a real phone or iPad (or ?fill) it is the screen */
function fit() {
  const dev = $('.device'), slot = $('.device-slot'), q = new URLSearchParams(location.search);
  const touch = matchMedia('(pointer: coarse)').matches, fill = q.has('fill') || (touch && Math.min(innerWidth, innerHeight) < 1400);
  document.body.classList.toggle('fill', fill);
  if (fill) { S.frame = Math.min(innerWidth, innerHeight) < 600 ? 'phone' : innerWidth > innerHeight ? 'tab-l' : 'tab-p'; dev.style.transform = ''; slot.style.width = slot.style.height = ''; render(); askWhoOnce(); return; }
  const W = { phone: 390, 'tab-p': 834, 'tab-l': 1194 }[S.frame], H = { phone: 844, 'tab-p': 1194, 'tab-l': 834 }[S.frame];
  drawStage();
  const k = figmaOpen ? 1 : Math.min(1, (innerHeight - slot.getBoundingClientRect().top - 24) / H, (innerWidth - 48) / W);
  dev.style.transform = k < 1 ? `scale(${k})` : ''; slot.style.width = W * k + 'px'; slot.style.height = H * k + 'px';
  render();
}
addEventListener('resize', fit);
addEventListener('hashchange', () => { closeAll(); render(); });
fit();
