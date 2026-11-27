// js/ui.js — state and the shared pieces every screen is built from, on Antz Design (assets/antz.css).
// The phone shows one pane at a time; the iPad shows panes side by side. Sheets: bottom sheet on the phone, side sheet on the iPad.

const S = {
  user: 'u-hydar', frame: 'phone', site: 'all',
  land: 'species', spTab: 'all', spCls: 'all', dCert: 'all', fold: {}, spQ: '', dKind: 'all', dQ: '', lvl: {}, animAll: false, spView: 'diets', spHLvl: 'all', anim: 'with', aQ: '', day: null, dTab: 'items',
  hView: 'date', hWeek: 0, hDay: null, hType: 'all', hLvl: 'all', hBack: '#/history',
  rTab: 'pending', rSub: 'all', rDept: 'diet', rWho: null, rSort: 'newest', rPrio: 'all', rSearch: false, rQ: '', back: '#/requests', draft: null,
};
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const me = () => user(S.user);
const isPhone = () => S.frame === 'phone';
const isTab = () => !isPhone();
const isLand = () => S.frame === 'tab-l';
const go = h => { if (location.hash === h) render(); else location.hash = h; };
const first = n => n.split(' ')[0];
/* Antz Labeling Guidelines (Figma "UI Labeling Guidelines"): labels, tabs, headers, buttons and statuses have every word's first letter in CAPS,
   small words too, as the Figma ("Attachments If Any", "Move To In-Progress"); sentences and hints keep only the first word in CAPS */
const tcase = s => String(s ?? '').replace(/(^|[\s(\-–·/])([a-z])/g, (m, a, b) => a + b.toUpperCase());
const cap = s => { s = String(s ?? ''); return s.charAt(0).toUpperCase() + s.slice(1); };
const initials = n => n.split(/[\s-]+/).filter(w => /^[A-Za-z0-9#]/.test(w)).slice(0, 2).map(w => w[0].toUpperCase()).join('');
const I = (name, size = 24, fill = false) => `<span class="az-i${size === 24 ? '' : ' az-i--' + size}${fill ? ' az-i--fill' : ''}" aria-hidden="true">${name}</span>`;
const pill = (tone, text) => `<span class="az-pill az-pill--${tone}">${esc(text)}</span>`;
const avatar = (name, sz = '') => `<span class="az-avatar${sz ? ' az-avatar--' + sz : ''}" aria-hidden="true">${initials(name)}</span>`;
function toast(msg) { const t = $('#toast'); t.innerHTML = `${I('check_circle', 24, true)}<span class="az-toast__msg">${esc(msg)}</span>`; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600); }
const siteName = () => S.site === 'all' ? 'All Sites' : by('sites', S.site).name;
const youName = id => `${esc(user(id).name)}${id === S.user ? ' (You)' : ''}`;

/* ---------- top bar: back, close or none · title (and a line) · actions · the site switch ---------- */
function topbar({ back = '', close = '', lead = '', title = '', sub = '', actions = '', site = false, end = '' }) {
  const l = back ? `<button class="az-iconbtn" onclick="go('${back}')" aria-label="Back">${I('arrow_back')}</button>`
    : close ? `<button class="az-iconbtn" onclick="${close}" aria-label="Close">${I('close')}</button>` : lead;
  return `<header class="az-topbar${sub ? ' az-topbar--two' : ''}">${l}<h1 class="az-topbar__title">${title}${sub ? `<small>${sub}</small>` : ''}</h1>${actions}${site ? `<button class="az-topswitch" onclick="siteSheet()" aria-haspopup="dialog" aria-label="Site: ${esc(siteName())}">${esc(siteName())}${I('keyboard_arrow_down', 20)}</button>` : ''}${end}</header>`;
}
const iconBtn = (icon, label, js) => `<button class="az-iconbtn" onclick="${js}" aria-label="${label}" title="${label}">${I(icon)}</button>`;
const pane = (cls, top, body, foot = '', key = '') => `<section class="pane ${cls}"${key ? ` data-k="${key}"` : ''}>${top}<div class="pane__body">${body}</div>${foot ? `<div class="pane__foot">${foot}</div>` : ''}</section>`;

/* update a container to new HTML by changing only what differs: nothing flashes, photos and blurs stay, scroll and focus are kept.
   Elements with a different data-k are different screens and are replaced whole. */
function morph(el, html) { const t = document.createElement('template'); t.innerHTML = html; patchKids(el, t.content); }
const sameNode = (o, n) => o.nodeType === n.nodeType && o.nodeName === n.nodeName && (o.nodeType !== 1 || o.getAttribute('data-k') === n.getAttribute('data-k'));
function patchKids(a, b) {
  const an = [...a.childNodes], bn = [...b.childNodes];
  bn.forEach((n, i) => { const o = an[i]; if (!o) a.appendChild(n); else if (!sameNode(o, n)) a.replaceChild(n, o); else patchNode(o, n); });
  for (let i = an.length - 1; i >= bn.length; i--) a.removeChild(an[i]);
}
const JS_ATTRS = ['style', 'data-on'];
function patchNode(o, n) {
  if (o.nodeType !== 1) { if (o.data !== n.data) o.data = n.data; return; }
  const js = o.hasAttribute('data-js-style');
  for (const { name } of [...o.attributes]) if (!n.hasAttribute(name) && !(js && JS_ATTRS.includes(name))) o.removeAttribute(name);
  for (const { name, value } of [...n.attributes]) if (o.getAttribute(name) !== value) o.setAttribute(name, value);
  if (o.tagName === 'TEXTAREA') { if (document.activeElement !== o && o.value !== n.textContent) o.value = n.textContent; return; }
  if (o.tagName === 'INPUT' && document.activeElement !== o) { const v = n.getAttribute('value') ?? ''; if (o.value !== v) o.value = v; }
  patchKids(o, n);
}
/* an empty list, as the Antz design system's empty state (Web Components library, and the Kitchen's EmptyState; owner, 27 Nov 2026):
   one of its three animals at 150 px, by meaning — meerkat "a data-free zone… for now!" = nothing yet; seal "Seal-iously nothing here…" =
   nothing matches the search, the filters or the link; sloth "Wake me up when there's data" = a step to take first — then the title */
const emptyArt = (art = 'meerkat') => `<img class="empty1__img" src="assets/empty/${art}.png" alt="" width="150" height="150">`;
const empty1 = (t, sub = '', art = 'meerkat') => `<div class="empty1"><div>${emptyArt(art)}<span class="empty1__t">${t}</span>${sub ? `<small>${sub}</small>` : ''}</div></div>`;

/* ---------- motion: one set for every screen (Antz Design · Motion), off with Reduce motion ---------- */
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
/* the sliding highlight of a switch or a tab row: an <i class="thumb"> first in the row, moved under the chosen one */
const thumb = (line = false) => `<i class="hl${line ? ' hl--line' : ''}" data-js-style aria-hidden="true"></i>`;
function positionThumbs(root = document) {
  root.querySelectorAll('.hl').forEach(t => {
    const sel = t.parentElement.querySelector('[aria-selected="true"]');
    if (!sel || !sel.offsetWidth) { t.style.opacity = 0; return; }
    const first = !t.dataset.on, line = t.classList.contains('hl--line');
    if (first) t.style.transition = 'none';
    Object.assign(t.style, { opacity: 1, left: sel.offsetLeft + 'px', width: sel.offsetWidth + 'px', top: (line ? sel.offsetTop + sel.offsetHeight - 2 : sel.offsetTop) + 'px', height: (line ? 2 : sel.offsetHeight) + 'px' });
    if (first) { void t.offsetWidth; t.style.transition = ''; t.dataset.on = '1'; }
  });
}
/* a soft change: the content under a switch fades into its new state */
function swapFx(sel) { if (calm()) return; requestAnimationFrame(() => document.querySelectorAll(sel).forEach(el => { el.classList.remove('swap'); void el.offsetWidth; el.classList.add('swap'); })); }
/* play an entrance once, then forget it */
function enter(el, cls) { if (calm() || !el) return; el.classList.add(cls); el.addEventListener('animationend', () => el.classList.remove(cls), { once: true }); }

/* ---------- sheets ---------- */
/* (owner, 20 Nov 2026: "the animations are not good") one sheet stays on screen while its content changes: a second step (a species → its places)
   slides in from the side it comes from, a pushed choice (Item, Unit) slides forward and back, and the sheet's height eases to the new content
   instead of jumping. A new sheet rises with its blocks a beat apart; closing slides it down. A sheet with search keeps one height while typing. */
let SH = [];
let SHSEQ = 0;
function openSheet(fn, push = false) { if (!push) SH = []; fn._k = ++SHSEQ; SH.push(fn); drawOverlay.dir = push ? 'fwd' : ''; drawOverlay(); }
function closeSheet() { SH.pop(); drawOverlay.dir = 'back'; drawOverlay(); }
function closeAll() { SH = []; drawOverlay(); }
const SHEET_SEL = '.az-sheet, .side, .pickcard';
/* the sheet's height moves from what it was to what the new content needs */
function sheetFlip(sh, h0) {
  if (calm() || !h0) return;
  const h1 = sh.offsetHeight; if (Math.abs(h1 - h0) < 2) return;
  clearTimeout(sh._ft); sh.style.transition = 'none'; sh.style.height = h0 + 'px'; void sh.offsetHeight;
  sh.style.transition = 'height .36s cubic-bezier(.32,.72,0,1)'; sh.style.height = h1 + 'px';
  sh._ft = setTimeout(() => { sh.style.transition = ''; sh.style.height = ''; }, 380);
}
/* play a class once on an element (restarts it if it is already playing) */
function playFx(el, cls) { if (calm() || !el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); clearTimeout(el['_fx' + cls]); el['_fx' + cls] = setTimeout(() => el.classList.remove(cls), 700); }
function drawOverlay() {
  const el = $('#ovl'), act = document.activeElement, fid = act && act.id && el.contains(act) ? act.id : null, pos = fid ? act.selectionStart : null;
  /* forward when a choice is pushed over the sheet, back when it is taken off */
  const n = SH.length, dir = drawOverlay.dir || (n < (drawOverlay.n || 0) ? 'back' : n > (drawOverlay.n || 0) && drawOverlay.n ? 'fwd' : ''); drawOverlay.dir = ''; drawOverlay.n = n;
  if (!SH.length) { drawOverlay.n = 0; drawOverlay.step = ''; const c = el.firstElementChild; if (!c) return;
    if (calm()) { el.innerHTML = ''; return; }
    if (!c.classList.contains('out')) { c.classList.add('out'); setTimeout(() => { if (!SH.length && c.parentNode === el) el.innerHTML = ''; }, 280); } return; }
  /* a sheet still sliding away is gone at once: the next one rises fresh */
  if (el.firstElementChild && el.firstElementChild.classList.contains('out')) el.innerHTML = '';
  const top1 = SH[SH.length - 1], s = top1(), key = `sh${top1._k}`, step = String(s.step ?? ''), depth = +s.depth || 0;
  const was = el.querySelector(SHEET_SEL), wasIn = was && was.querySelector('.az-sheet__in'), h0 = was ? was.offsetHeight : 0;
  const typing = !!fid && /^(INPUT|TEXTAREA)$/.test(act.tagName);
  const inner = `<div class="az-sheet__in" data-k="${key}" data-step="${esc(step)}" data-depth="${depth}"><div class="az-sheet__title"><span>${s.title}${s.sub ? `<small>${s.sub}</small>` : ''}</span><button class="az-iconbtn" onclick="closeSheet()" aria-label="Close">${I('close')}</button></div><div class="az-sheet__body${s.form ? ' az-sheet__body--form' : ''}">${s.body}</div>${s.foot ? `<div class="az-sheet__foot">${s.foot}</div>` : ''}</div>`;
  /* one dimming at a time: over a window or another overlay the sheet only lifts, it does not darken again */
  const over = $('#over').children.length ? ' over' : '', tall = s.tall ? ' az-sheet--tall' : '';
  morph(el, isPhone() || s.bottom ? `<div class="az-scrim${over}" onclick="if(event.target===this)closeSheet()"><div class="az-sheet${isTab() ? ' az-sheet--wide' : ''}${tall}" role="dialog" aria-modal="true" data-js-style>${inner}</div></div>`
    : s.pick ? `<div class="pick-scrim${over}" onclick="if(event.target===this)closeSheet()"><div class="pickcard${tall}" role="dialog" aria-modal="true" data-js-style>${inner}</div></div>`
    : `<div class="side-scrim${over}" onclick="if(event.target===this)closeSheet()"><aside class="side${tall}" role="dialog" aria-modal="true" data-js-style>${inner}</aside></div>`);
  const sh = el.querySelector(SHEET_SEL), nowIn = sh.querySelector('.az-sheet__in'), body = nowIn.querySelector('.az-sheet__body');
  if (!was || was !== sh) playFx(sh, 'sh-new');
  else if (wasIn !== nowIn) { playFx(nowIn, dir === 'back' ? 'sh-back' : dir === 'fwd' ? 'sh-fwd' : 'sh-swap'); if (!typing) sheetFlip(sh, h0); }
  else if (step !== (drawOverlay.step || '')) {
    /* a tab inside the same page (Species · Site … of one species) moves only the list under the tabs; a new page moves the whole body */
    const same = (drawOverlay.step || '').split(':')[0] === step.split(':')[0], fx = same && body.querySelector('[data-fx]') || body;
    body.scrollTop = 0; playFx(fx, depth < (drawOverlay.depth || 0) ? 'sh-back' : 'sh-fwd'); sheetFlip(sh, h0); }
  else if (!typing) sheetFlip(sh, h0);
  drawOverlay.step = step; drawOverlay.depth = depth;
  /* a list that changed under a tab, or the picked row of a long list, comes into view by itself */
  const to = drawOverlay.scroll; drawOverlay.scroll = null;
  if (to === 'top') body.scrollTo({ top: 0, behavior: calm() ? 'auto' : 'smooth' });
  else if (to) { const t = body.querySelector(to); if (t) body.scrollTop = Math.max(0, t.offsetTop - body.clientHeight / 2 + t.offsetHeight / 2); }
  if (fid && document.getElementById(fid)) { const f = document.getElementById(fid); f.focus({ preventScroll: true }); try { if (pos != null) f.setSelectionRange(pos, pos); } catch (e) {} }
  /* a tab row that scrolls sideways keeps the picked tab in view */
  nowIn.querySelectorAll('.pk-lv').forEach(row => { const c = row.querySelector('[aria-selected="true"]'); if (c && (c.offsetLeft < row.scrollLeft || c.offsetLeft + c.offsetWidth > row.scrollLeft + row.clientWidth)) row.scrollTo({ left: c.offsetLeft - 16, behavior: calm() ? 'auto' : 'smooth' }); });
  positionThumbs(el);
}
/* redraw the sheet on top keeping its scroll (typing, ticking) */
function redrawSheet() { drawOverlay.same = true; drawOverlay(); drawOverlay.same = false; }
document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; if ($('#ovl .menu-scrim')) closeMenu(); else if (SH.length) closeSheet(); });
/* a menu (Antz Menu): drops below its icon with the right edges lined up, or opens above when there is no room; a tap outside closes it */
function openMenu(btn, items, cls = '') {
  const dev = $('.device'), d = dev.getBoundingClientRect(), k = d.width / dev.offsetWidth || 1, b = btn.getBoundingClientRect();
  $('#ovl').innerHTML = `<div class="menu-scrim" onclick="if(event.target===this)closeMenu()"><div class="az-menu${cls ? ' ' + cls : ''}" role="menu" style="right:${(d.right - b.right) / k}px;top:${(b.bottom - d.top) / k + 4}px">${items}</div></div>`;
  const m = $('#ovl .az-menu');
  if (m.offsetTop + m.offsetHeight > dev.offsetHeight - 8) { m.style.top = ''; m.style.bottom = `${(d.bottom - b.top) / k + 4}px`; m.classList.add('az-menu--up'); }
  m.querySelector('button').focus({ preventScroll: true });
}
function closeMenu() { const m = $('#ovl .menu-scrim'); if (m) m.remove(); }
/* choose one from a list: the design system's bottom sheet with option rows */
function optionSheet(title, opts, cur, onpick) {
  openSheet(() => ({ title, pick: true, body: opts.map(([v, l, s]) => `<button class="az-option" role="radio" aria-checked="${String(v) === String(cur)}" onclick="${onpick}(${JSON.stringify(v).replace(/"/g, '&quot;')})"><span>${esc(l)}${s ? `<small>${esc(s)}</small>` : ''}</span>${I(String(v) === String(cur) ? 'radio_button_checked' : 'radio_button_unchecked', 24, String(v) === String(cur))}</button>`).join('') }), SH.length > 0);
}
/* people to choose from (Requester, Approver): the design system's rows with the face, the name and the role, no outline; search when the list is long */
let PSQ = { q: '' };
function personSheet(title, ids, cur, cb) {
  PSQ = { q: '', title, ids, cur, cb };
  openSheet(() => { const q = PSQ.q.trim().toLowerCase(), long = PSQ.ids.length > 6, list = PSQ.ids.filter(id => !q || `${user(id).name} ${user(id).title}`.toLowerCase().includes(q));
    return { title: PSQ.title, bottom: true, tall: long, body: (long ? pkSearch('ps-q', PSQ.q, 'Search people', 'PSQ.q=this.value;redrawSheet()') : '')
      + (list.length ? pkList(list.map(id => pkRow(`${PSQ.cb}('${id}')`, avatar(user(id).name), youName(id), esc(user(id).title), undefined, PSQ.cur === id)).join('')) : '<p class="sg-none">No one by that name</p>') }; });
  if (PSQ.ids.length > 6) pkFocus('ps-q');
}
/* priority on the form's header, as the Figma (Request Module, Changes 12 Aug 2025, "Priority Selection"): a round icon in the colour of the
   priority; a tap opens Set Priority under it (Normal · High · Emergency, a tick on the one picked) */
const prioIc = (k, sz = 20) => `<span class="prio-ic prio-ic--${k}" aria-hidden="true">${k === 'emergency' ? I('local_fire_department', sz, true) : `<b>${PRIO[k][0]}</b>`}</span>`;
const prioBtn = (cur, js) => `<button class="prio-hd" onclick="${js}" aria-haspopup="menu" aria-label="Priority: ${PRIO[cur][1]}" title="Priority: ${PRIO[cur][1]}">${prioIc(cur)}</button>`;
function prioMenu(btn, cur, cb) {
  openMenu(btn, `<p class="az-menu__h">Set Priority</p>${Object.entries(PRIO).map(([k, [, l]]) => `<button role="menuitemradio" aria-checked="${cur === k}" class="prio-mi${cur === k ? ' on' : ''}" onclick="closeMenu();${cb}('${k}')">${prioIc(k, 18)}<span class="grow"><b>${l}</b><small>${esc(PRI_TEXT[k])}</small></span>${cur === k ? I('check', 20) : ''}</button>`).join('')}`, 'prio-menu');
}
/* the site switch (Antz pattern): one site card per site, a count to tell them apart, a filled radio for the one picked */
function siteSheet() {
  const count = id => { const as = D.animals.filter(a => id === 'all' || pathOfAnimal(a).site === id); return `${plural(new Set(as.map(a => a.sp)).size, 'species', 'species')} · ${plural(as.length, 'animal')}`; };
  const row = (id, name) => { const on = String(S.site) === String(id);
    return `<button class="az-site" role="radio" aria-checked="${on}" onclick="pickSiteFilter(${id === 'all' ? "'all'" : id})"><span class="az-site__thumb">${I(id === 'all' ? 'apartment' : 'location_on', 24)}</span><span class="grow"><span class="az-site__name">${esc(name)}</span><span class="az-site__sub">${count(id)}</span></span>${I(on ? 'radio_button_checked' : 'radio_button_unchecked', 24, on)}</button>`; };
  openSheet(() => ({ title: 'Site', pick: true, body: row('all', 'All Sites') + D.sites.map(s => row(s.id, s.name)).join('') }));
}
function pickSiteFilter(v) { S.site = v; closeAll(); storeSave(); render(); toast(`Showing ${siteName()}`); }

/* ---------- the diet lines: a band per feed time on the phone, the live Kitchen table on the iPad ---------- */
const bandText = f => `${f.from} – ${f.to}`;
const garText = x => [x.prep === 'Mixed' ? '' : x.prep, x.cut].filter(Boolean).join(' · ');
const wasM = t => `<span class="was">was ${t}</span>`;
const NEW = '<span class="new">NEW</span>', STOPPED = '<span class="stopped">Stopped</span>';
/* one row: a line as it is, or a change marked the Kitchen way (an amber row, was …, NEW, struck through when stopped) */
const MIXTAG = '<span class="mixtag">MIX</span>';
const mixText = id => { const x = item(id); return x && x.mix ? x.mix.map(p => `${esc(item(p.item).name)} ${p.pct}%`).join(' · ') : ''; };
function lineRow(l, c = null) {
  const r = lineRow0(l, c), id = c && c.op !== 'remove' ? c.to : l.item;
  if (item(id).mix) { r.mix = mixText(id); r.name = r.name.replace(/^([^<]+)/, `$1${MIXTAG}`); }
  return r;
}
function lineRow0(l, c = null) {
  const nm = id => esc(item(id).name);
  if (!c) return { cls: '', name: nm(l.item), gar: esc(garText(l)), day: lineDays(l), mask: l.days ?? EVERY_DAY, cad: l.cad || null, amt: qtyText(l.qty, l.unit), amts: l.bq ? l.bq.map(q => qtyText(q, l.unit)) : null, line: l };
  if (c.op === 'add') return { cls: 'chg', name: nm(c.to) + NEW, gar: esc(garText(c)), day: lineDays(c), mask: c.days ?? EVERY_DAY, cad: c.cad || null, amt: qtyText(c.qty, c.unit), line: { ...c, item: c.to } };
  if (c.op === 'remove') return { cls: 'stop', name: `<span class="gone">${nm(l.item)}</span>${STOPPED}`, gar: `<span class="gone">${esc(garText(l))}</span>`, day: lineDays(l), mask: l.days ?? EVERY_DAY, cad: l.cad || null, amt: `<span class="gone">${qtyText(l.qty, l.unit)}</span>`, line: l };
  const x = lineDiff(l, c), bw = l.bq && x.amount ? l.bq : null, bn = c.bq || (l.bq && scaleBq(l, c));
  return { cls: 'chg', amts: bn ? bn.map((q, i) => qtyText(q, c.unit) + (bw ? wasM(qtyText(bw[i], l.unit)) : '')) : null, name: nm(c.to), nameWas: x.item ? wasM(nm(l.item)) : '', gar: esc(garText(c)), garWas: x.prep || x.cut ? wasM(esc(garText(l)) || 'plain') : '',
    day: lineDays(c) + (x.days ? wasM(lineDays(l)) : ''), mask: c.days ?? EVERY_DAY, cad: c.cad || null, amt: qtyText(c.qty, c.unit) + (x.amount ? wasM(qtyText(l.qty, l.unit)) : ''), line: { ...c, item: c.to } };
}
/* a history line { op, was, now } as a request-style change */
const histChange = l => l.op === 'remove' ? { op: 'remove' } : { op: l.op, to: l.now.item, qty: l.now.qty, unit: l.now.unit, prep: l.now.prep, cut: l.now.cut, days: l.now.days, cad: l.now.cad || null };
/* a whole diet as groups, optionally only the lines fed on one day (0 Mon … 6 Sun) */
const dietGroups = (d, day = null, click = null) => d.meals.map(m => ({ feed: m.feed, rows: m.items.filter(l => fedOn(l, day)).map(l => ({ ...lineRow(l), click: click ? `${click}('${d.id}',${m.feed},${l.item})` : '' })) })).filter(g => g.rows.length);
/* a line fed less often than weekly shows its rhythm instead of the day letters */
const cadTag = c => `<span class="cadtag">${I('event_repeat', 16)}${cadText(c)}</span>`;
const dayMark = r => r.cad ? cadTag(r.cad) : letters(r.mask);
const letters = mask => `<span class="dayl" aria-label="${daysText(mask)}">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x, i) => `<i class="${mask & (1 << i) ? 'on' : ''}">${x}</i>`).join('')}</span>`;
/* requests, history and the form show their lines in the same Kitchen table as Diet Details, with the change marks (audit, 2 Nov) */
/* the wide table (Time as a column) only where the pane is wide: iPad landscape. In iPad portrait a request or a change sits in a narrow
   right pane, so it uses the phone's layout, the time on top of its items (owner, 18 Nov: the table was cut off there) */
const linesView = (groups, { act = false } = {}) => mealTable(groups, isLand(), true, { act });
/* the diet as the Kitchen table (owner, 2 Nov): Time | Day | Item | Daily amt, the time and the day spanning their runs of items as live.
   On the phone the time sits on top of its items. showDays: off when one day is picked. A tap on an item opens the line.
   Change marks as the Kitchen: a changed line is yellow with what it was under it, a stopped one red and struck through.
   act: a last column of actions; add: f => the js for "+ Add item" under each time (the request form) */
/* bands: a diet given by sex, age or weight (qBands) has one amount column per band, under one "Daily Amt · By Age (years)" head */
function mealTable(groups, wide = false, showDays = true, { act = false, add = null, bands = null } = {}) {
  if (!groups.length) return `<div class="nodiet">Nothing to feed on this day</div>`;
  /* a phone or a narrow pane with band columns has no room for a Day column: the day goes under the item's name */
  const dayIn = !!bands && !wide && showDays; if (dayIn) showDays = false;
  const nb = bands ? bands.list.length : 1, cols = (wide ? 1 : 0) + (showDays ? 1 : 0) + 1 + nb + (act ? 1 : 0), still = ' onclick="event.stopPropagation()"';
  const amtCells = r => bands ? (r.amts && r.amts.length === nb ? r.amts.map(t => `<td class="mtab__q mtab__q--b">${t}</td>`).join('') : `<td class="mtab__q mtab__q--b" colspan="${nb}">${r.amt}</td>`) : `<td class="mtab__q">${r.amt}</td>`;
  const itemCell = r => { const x = item(r.line.item);
    return `<b>${r.name}</b>${dayIn ? `<span class="mtab__dd">${r.day}</span>` : ''}${x && x.mix ? `<span class="mtab__s">· ${plural(x.mix.length, 'item')}</span>${ingrChips(x)}` : r.gar ? `<span class="mtab__s mtab__s--i">(${r.gar})</span>` : ''}${r.nameWas || ''}${r.garWas || ''}`; };
  const body = groups.map(g => {
    const rows = g.rows.map((r, i) => {
      let run = 1;
      while (i + run < g.rows.length && g.rows[i + run].day === r.day) run++;
      const time = wide && i === 0 ? `<td class="mtab__t" rowspan="${g.rows.length + (add ? 1 : 0)}"${still}>${bandText(feed(g.feed))}</td>` : '';
      const day = showDays && (i === 0 || g.rows[i - 1].day !== r.day) ? `<td class="mtab__d" rowspan="${run}"${still}>${r.day}</td>` : '';
      const tap = r.click ? ` class="tap${r.cls ? ' ' + r.cls : ''}" onclick="${r.click}" tabindex="0" onkeydown="if(event.key==='Enter'){${r.click}}"` : r.cls ? ` class="${r.cls}"` : '';
      return `<tr${tap}>${time}${day}<td class="mtab__i">${itemCell(r)}</td>${amtCells(r)}${act ? `<td class="mtab__a">${r.act || ''}</td>` : ''}</tr>`;
    }).join('');
    const more = add ? `<tr class="mtab__add"><td colspan="${cols - (wide ? 1 : 0)}"><button onclick="${add(g.feed)}">${I('add', 20)}Add item</button></td></tr>` : '';
    return (wide ? '' : `<tr class="mtab__band"><td colspan="${cols}"><span>${I('schedule', 18)}${bandText(feed(g.feed))}</span></td></tr>`) + rows + more;
  }).join('');
  /* (owner, 27 Nov 2026: option 2, "Item column pinned, groups scroll") on the phone the Item column stays put and the groups slide sideways;
     the "Daily Amt · By Age" label moves to the line above the table (it would be cut while sliding), with the groups' count */
  const pin = !!bands && !wide;
  const hint = pin ? `<p class="mtab-hint"><span>Daily Amt · ${esc(bands.by)}</span></p>` : '';
  const rs = bands ? ' rowspan="2"' : '';
  const head = pin ? `<tr>${showDays ? '<th>Day</th>' : ''}<th class="mtab__ih">Item</th>${bands.list.map(b => `<th class="mtab__bt">${esc(b)}</th>`).join('')}${act ? '<th></th>' : ''}</tr>`
    : bands ? `<tr>${wide ? `<th${rs}>Time</th>` : ''}${showDays ? `<th${rs}>Day</th>` : ''}<th class="mtab__ih"${rs}>Item</th><th class="mtab__bh" colspan="${nb}">Daily Amt · ${esc(bands.by)}</th>${act ? `<th${rs}></th>` : ''}</tr><tr class="mtab__bands">${bands.list.map(b => `<th>${esc(b)}</th>`).join('')}</tr>`
    : `<tr>${wide ? '<th>Time</th>' : ''}${showDays ? '<th>Day</th>' : ''}<th>Item</th><th>Daily Amt</th>${act ? '<th></th>' : ''}</tr>`;
  return `${hint}<div class="mtab-wrap${bands ? ' mtab-wrap--bands' : ''}${pin ? ' mtab-wrap--pin' : ''}"><table class="mtab${wide ? ' mtab--wide' : ''}${bands ? ` mtab--b${nb}` : ''}"><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}
/* a mix's parts as the Kitchen table's chips: the item and its share, then its preparation and cut */
const ingrChips = (x, per = null) => `<span class="ingr">${x.mix.map(p => `<span><b>${esc(item(p.item).name)} · ${per ? qtyText(per * p.pct / 100, 'g') : p.pct + '%'}</b><small>${esc([p.prep, p.cut].filter(Boolean).join(' · '))}</small></span>`).join('')}</span>`;
/* changed lines only, grouped by feed time (requests and history) */
function changeGroups(base, changes) {
  const feeds = [...new Set(changes.map(c => c.feed))].sort((a, b) => a - b);
  return feeds.map(f => ({ feed: f, rows: changes.filter(c => c.feed === f).map(c => lineRow(c.op === 'add' ? null : entryOf(base, f, c.item), c)) }));
}
/* a diet change: the new diet's lines that differ from the diet now, marked the same way */
function dietDiffGroups(A, B) {
  const groups = [];
  [...new Set([...(A ? A.meals : []), ...B.meals].map(m => m.feed))].sort((a, b) => a - b).forEach(f => {
    const ma = (A && A.meals.find(m => m.feed === f)) || { items: [] }, mb = B.meals.find(m => m.feed === f) || { items: [] }, rows = [];
    mb.items.forEach(b => { const a = ma.items.find(i => i.item === b.item), c = { ...b, to: b.item, op: a ? 'change' : 'add' };
      if (!a || Object.values(lineDiff(a, c)).some(Boolean)) rows.push(lineRow(a, c)); });
    ma.items.filter(a => !mb.items.some(b => b.item === a.item)).forEach(a => rows.push(lineRow(a, { op: 'remove' })));
    if (rows.length) groups.push({ feed: f, rows });
  });
  return groups;
}

/* ---------- cards ---------- */
/* species photos: assets/species/<taxonomy id>.jpg (see SOURCES.txt) */
const spPhoto = id => `assets/species/${id}.jpg`;
const spThumb = sp => `<span class="thumb"><img src="${spPhoto(sp.id)}" alt="" loading="lazy"></span>`;
/* big: the species card used across the app since Aug 2025 (Figma Collection, Species List with Images): the photo fills the card's left edge */
function speciesRow(sp, { end = '', href, current = false, sub = '', big = false } = {}) {
  return `<a class="sprow${big ? ' sprow--big' : ''} pick" href="${href}"${current ? ' aria-current="true"' : ''}>${spThumb(sp)}<span class="sprow__t"><b>${esc(sp.name)}</b><span class="sub sci">${esc(sp.sci)}</span>${sub ? `<span class="meta">${sub}</span>` : ''}</span>${end}</a>`;
}
/* a diet's state today: fed now, not fed by anyone now, starting later, or ended */
function dietStatus(a) {
  if (ended(a)) return ['neutral', 'Ended'];
  if (isNow(a)) return ['positive', 'Currently Active'];
  if (inForce(a, TODAY)) return ['neutral', 'Inactive'];   /* owner, 27 Nov 2026: "Not in use now" is Inactive */
  return ['neutral', `Starts ${fmtDay(slotDay(a))}`];
}
/* a diet in a species' list: the Diet wise row (avatar, name, kind and when) with its state and its animals (audit, 2 Nov: one diet card) */
function dietCard(a, { current = false } = {}) {
  const d = diet(a.diet), [tone, label] = dietStatus(a);
  return `<a class="sprow dietrow pick${ended(a) ? ' dietrow--ended' : ''}" href="#/diets/${a.sp}/${a.id}"${current ? ' aria-current="true"' : ''}><span class="davatar">${I('restaurant')}</span><span class="sprow__t"><b>${esc(d.name)}</b>${kindLine(a)}<span class="dfoot"><span class="dfoot__tags">${pill(tone, label)}${!d.cert ? pill('negative', 'Not Certified') : ''}</span></span></span></a>`;
}
/* one diet set at a place, as a row of its card */
function placeDietRow(a, current) {
  const d = diet(a.diet);
  return `<a class="place__d pick" href="#/diets/${a.sp}/${a.id}"${current ? ' aria-current="true"' : ''}><span class="davatar davatar--s">${I('restaurant', 20)}</span><span class="t"><b>${esc(d.name)}</b><span class="sub">${esc(slotText(a))} · ${esc(dietStatus(a)[1])}</span></span>${I('chevron_right', 20)}</a>`;
}
const PLACE_ICON = { site: 'location_on', section: 'domain', enclosure: 'fence' };
function placeCard(p, cur) {
  const sub = [p.path, plural(p.n, 'animal'), p.level === 'section' ? plural(p.encl, 'enclosure') : ''].filter(Boolean).join(' · ');
  return `<div class="place"><div class="place__top"><span class="thumb">${I(PLACE_ICON[p.level])}</span><span class="place__t"><b>${esc(p.name)}</b><span class="sub">${esc(sub)}</span></span></div>${p.diets.length ? p.diets.map(a => placeDietRow(a, cur === a.id)).join('') : `<div class="place__none">No ${p.level} diet</div>`}</div>`;
}
const SEXT = { M: 'M', F: 'F', U: 'UD' };
function animalCard(a, extra = '') {
  const e = by('enclosures', a.enc), sp = species(a.sp), t = SEXT[a.sex] || 'UD';
  return `<div class="acard"><div class="az-animal"><span class="az-photo"><img src="${spPhoto(a.sp)}" alt="" loading="lazy"><span class="az-photo__sex az-photo__sex--${t}">${t}</span></span><span class="az-animal__d"><span class="az-animal__tag">AID: ${a.id}</span><span>${esc(a.name ? `${a.name} · ${sp.name}` : sp.name)}</span><span class="az-animal__sci">${esc(sp.sci)}</span><span>Encl: ${esc(e.name)}</span></span></div>${extra}</div>`;
}

/* ---------- the Filter screen (owner, 27 Nov 2026: "check the proper Filter component") ----------
   As the Antz Mobile Figma (Request Module "Filters", Housing "Filter (n)"): a tall sheet, "Filter (n)" with close; the groups down the left
   on the page colour (the open one white, its count beside it); the open group's options on the right (a search when it is long; checkboxes
   for several, radios for one); the foot says how many results, Clear all and Apply Filters. Nothing changes until Apply.
   o = { groups: [{ k, label, multi, dflt, opts: () => [[v, label]], search }], value, count: draft => n, apply: 'fnName' } */
let FS = null;
const fsN = (g, d) => g.multi ? (d[g.k] || []).length : d[g.k] !== g.dflt ? 1 : 0;
const fsTotal = d => FS.groups.reduce((n, g) => n + fsN(g, d), 0);
/* o.push: the filter opens as the next page of the sheet it came from (Select Species), and Apply comes back to it */
function filterScreen(o) { FS = { ...o, tab: o.tab || o.groups[0].k, draft: JSON.parse(JSON.stringify(o.value)), q: '' }; openSheet(filterScreenHtml, !!o.push); }
function filterScreenHtml() {
  const d = FS.draft, g = FS.groups.find(x => x.k === FS.tab), q = FS.q.trim().toLowerCase(), n = fsTotal(d);
  const rail = FS.groups.map(x => { const c = fsN(x, d); return `<button class="fs-tab" role="tab" aria-selected="${x.k === g.k}" onclick="FS.tab='${x.k}';FS.q='';redrawSheet()"><span>${esc(x.label)}</span>${c ? `<b>${c}</b>` : ''}</button>`; }).join('');
  const on = v => g.multi ? (d[g.k] || []).includes(v) : d[g.k] === v;
  const opts = g.opts().filter(([, l]) => !q || l.toLowerCase().includes(q));
  const list = opts.map(([v, l]) => `<button class="fs-opt" role="${g.multi ? 'checkbox' : 'radio'}" aria-checked="${on(v)}" onclick="fsPick(${JSON.stringify(v).replace(/"/g, '&quot;')})">${I(g.multi ? (on(v) ? 'check_box' : 'check_box_outline_blank') : on(v) ? 'radio_button_checked' : 'radio_button_unchecked', 18, on(v))}<span>${esc(l)}</span></button>`).join('') || '<p class="fs-none">Nothing by that name</p>';
  const search = g.search ? `<label class="fs-q">${I('search', 18)}<input id="fs-q" placeholder="Search" value="${esc(FS.q)}" oninput="FS.q=this.value;redrawSheet()" aria-label="Search ${esc(g.label)}"></label>` : '';
  return { title: `Filter (${n})`, bottom: true, tall: true, step: 'fs', sub: FS.sub || '',
    body: `<div class="fs"><nav class="fs-rail" role="tablist" aria-label="Filter by">${rail}</nav><div class="fs-pane" role="group" aria-label="${esc(g.label)}">${search}<div class="fs-list">${list}</div></div></div>`,
    foot: `<span class="fs-n"><b>${FS.count(d)}</b> ${FS.count(d) === 1 ? 'result' : 'results'}</span><button class="az-btn az-btn--outline fs-clear" onclick="fsClear()">Clear all</button><button class="az-btn fs-apply" onclick="fsApply()">Apply Filters</button>` };
}
function fsPick(v) { const g = FS.groups.find(x => x.k === FS.tab), d = FS.draft;
  if (g.multi) { const a = d[g.k] || []; d[g.k] = a.includes(v) ? a.filter(x => x !== v) : [...a, v]; } else d[g.k] = v;
  redrawSheet(); }
function fsClear() { FS.groups.forEach(g => { FS.draft[g.k] = g.multi ? [] : g.dflt; }); redrawSheet(); }
function fsApply() { const f = window[FS.apply], d = FS.draft; if (FS.push) closeSheet(); else closeAll(); f(d); }
