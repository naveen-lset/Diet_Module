// js/ui.js — state and the shared pieces every screen is built from, on Antz Design (assets/antz.css).
// The phone shows one pane at a time; the iPad shows panes side by side. Sheets: bottom sheet on the phone, side sheet on the iPad.

const S = {
  user: 'u-hydar', frame: 'phone', site: 'all',
  land: 'diets', spTab: 'all', spCls: 'all', dCert: 'all', fold: {}, spQ: '', dKind: 'all', dQ: '', lvl: {}, animAll: false, spView: 'diets', spHLvl: 'all', anim: 'with', aQ: '', day: null, dTab: 'items',
  hView: 'date', hWeek: 0, hDay: null, hType: 'all', hLvl: 'all', hBack: '#/history',
  rTab: 'pending', rDept: 'all', rSort: 'newest', rPrio: 'all', rSearch: false, rQ: '', back: '#/requests', draft: null,
};
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const me = () => user(S.user);
const isPhone = () => S.frame === 'phone';
const isTab = () => !isPhone();
const isLand = () => S.frame === 'tab-l';
const go = h => { if (location.hash === h) render(); else location.hash = h; };
const first = n => n.split(' ')[0];
const initials = n => n.split(/[\s-]+/).filter(w => /^[A-Za-z0-9#]/.test(w)).slice(0, 2).map(w => w[0].toUpperCase()).join('');
const I = (name, size = 24, fill = false) => `<span class="az-i${size === 24 ? '' : ' az-i--' + size}${fill ? ' az-i--fill' : ''}" aria-hidden="true">${name}</span>`;
const pill = (tone, text) => `<span class="az-pill az-pill--${tone}">${esc(text)}</span>`;
const avatar = (name, sz = '') => `<span class="az-avatar${sz ? ' az-avatar--' + sz : ''}" aria-hidden="true">${initials(name)}</span>`;
function toast(msg) { const t = $('#toast'); t.innerHTML = `${I('check_circle', 24, true)}<span class="az-toast__msg">${esc(msg)}</span>`; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600); }
const siteName = () => S.site === 'all' ? 'All sites' : by('sites', S.site).name;
const youName = id => `${esc(user(id).name)}${id === S.user ? ' (You)' : ''}`;

/* ---------- top bar: back, close or none · title (and a line) · actions · the site switch ---------- */
function topbar({ back = '', close = '', lead = '', title = '', sub = '', actions = '', site = false }) {
  const l = back ? `<button class="az-iconbtn" onclick="go('${back}')" aria-label="Back">${I('arrow_back')}</button>`
    : close ? `<button class="az-iconbtn" onclick="${close}" aria-label="Close">${I('close')}</button>` : lead;
  return `<header class="az-topbar${sub ? ' az-topbar--two' : ''}">${l}<h1 class="az-topbar__title">${title}${sub ? `<small>${sub}</small>` : ''}</h1>${actions}${site ? `<button class="az-topswitch" onclick="siteSheet()" aria-haspopup="dialog" aria-label="Site: ${esc(siteName())}">${esc(siteName())}${I('keyboard_arrow_down', 20)}</button>` : ''}</header>`;
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
const empty1 = (t, sub = '') => `<div class="empty1"><div>${t}${sub ? `<small>${sub}</small>` : ''}</div></div>`;

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
let SH = [];
let SHSEQ = 0;
function openSheet(fn, push = false) { if (!push) SH = []; fn._k = ++SHSEQ; SH.push(fn); drawOverlay(); }
function closeSheet() { SH.pop(); drawOverlay(); }
function closeAll() { SH = []; drawOverlay(); }
function drawOverlay() {
  const el = $('#ovl'), act = document.activeElement, fid = act && act.id && el.contains(act) ? act.id : null, pos = fid ? act.selectionStart : null;
  if (!SH.length) { const c = el.firstElementChild; if (!c) return;
    if (calm()) { el.innerHTML = ''; return; }
    if (!c.classList.contains('out')) { c.classList.add('out'); setTimeout(() => { if (!SH.length && c.parentNode === el) el.innerHTML = ''; }, 210); } return; }
  const top1 = SH[SH.length - 1], k = ` data-k="sh${top1._k}"`, s = top1(), inner = `<div class="az-sheet__title"><span>${s.title}${s.sub ? `<small>${s.sub}</small>` : ''}</span>${SH.length > 1 ? '' : ''}<button class="az-iconbtn" onclick="closeSheet()" aria-label="Close">${I('close')}</button></div><div class="az-sheet__body${s.form ? ' az-sheet__body--form' : ''}">${s.body}</div>${s.foot ? `<div class="az-sheet__foot">${s.foot}</div>` : ''}`;
  /* one dimming at a time: over a window or another overlay the sheet only lifts, it does not darken again */
  const over = $('#over').children.length ? ' over' : '';
  morph(el, isPhone() || s.bottom ? `<div class="az-scrim${over}" onclick="if(event.target===this)closeSheet()"><div class="az-sheet${isTab() ? ' az-sheet--wide' : ''}" role="dialog" aria-modal="true"${k}>${inner}</div></div>`
    : s.pick ? `<div class="pick-scrim${over}" onclick="if(event.target===this)closeSheet()"><div class="pickcard" role="dialog" aria-modal="true"${k}>${inner}</div></div>`
    : `<div class="side-scrim${over}" onclick="if(event.target===this)closeSheet()"><aside class="side" role="dialog" aria-modal="true"${k}>${inner}</aside></div>`);
  if (fid && document.getElementById(fid)) { const f = document.getElementById(fid); f.focus({ preventScroll: true }); try { if (pos != null) f.setSelectionRange(pos, pos); } catch (e) {} }
  positionThumbs(el);
}
/* redraw the sheet on top keeping its scroll (typing, ticking) */
function redrawSheet() { drawOverlay.same = true; drawOverlay(); drawOverlay.same = false; }
document.addEventListener('keydown', e => { if (e.key === 'Escape' && SH.length) closeSheet(); });
/* choose one from a list: the design system's bottom sheet with option rows */
function optionSheet(title, opts, cur, onpick) {
  openSheet(() => ({ title, pick: true, body: opts.map(([v, l, s]) => `<button class="az-option" role="radio" aria-checked="${String(v) === String(cur)}" onclick="${onpick}(${JSON.stringify(v).replace(/"/g, '&quot;')})"><span>${esc(l)}${s ? `<small>${esc(s)}</small>` : ''}</span>${I(String(v) === String(cur) ? 'radio_button_checked' : 'radio_button_unchecked', 24, String(v) === String(cur))}</button>`).join('') }), SH.length > 0);
}
/* the site switch (Antz pattern): one site card per site, a count to tell them apart, a filled radio for the one picked */
function siteSheet() {
  const count = id => { const as = D.animals.filter(a => id === 'all' || pathOfAnimal(a).site === id); return `${plural(new Set(as.map(a => a.sp)).size, 'species', 'species')} · ${plural(as.length, 'animal')}`; };
  const row = (id, name) => { const on = String(S.site) === String(id);
    return `<button class="az-site" role="radio" aria-checked="${on}" onclick="pickSiteFilter(${id === 'all' ? "'all'" : id})"><span class="az-site__thumb">${I(id === 'all' ? 'apartment' : 'location_on', 24)}</span><span class="grow"><span class="az-site__name">${esc(name)}</span><span class="az-site__sub">${count(id)}</span></span>${I(on ? 'radio_button_checked' : 'radio_button_unchecked', 24, on)}</button>`; };
  openSheet(() => ({ title: 'Site', pick: true, body: row('all', 'All sites') + D.sites.map(s => row(s.id, s.name)).join('') }));
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
  if (!c) return { cls: '', name: nm(l.item), gar: esc(garText(l)), day: lineDays(l), mask: l.days ?? EVERY_DAY, cad: l.cad || null, amt: qtyText(l.qty, l.unit), line: l };
  if (c.op === 'add') return { cls: 'chg', name: nm(c.to) + NEW, gar: esc(garText(c)), day: lineDays(c), mask: c.days ?? EVERY_DAY, cad: c.cad || null, amt: qtyText(c.qty, c.unit), line: { ...c, item: c.to } };
  if (c.op === 'remove') return { cls: 'stop', name: `<span class="gone">${nm(l.item)}</span>${STOPPED}`, gar: `<span class="gone">${esc(garText(l))}</span>`, day: lineDays(l), mask: l.days ?? EVERY_DAY, cad: l.cad || null, amt: `<span class="gone">${qtyText(l.qty, l.unit)}</span>`, line: l };
  const x = lineDiff(l, c);
  return { cls: 'chg', name: nm(c.to), nameWas: x.item ? wasM(nm(l.item)) : '', gar: esc(garText(c)), garWas: x.prep || x.cut ? wasM(esc(garText(l)) || 'plain') : '',
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
function linesView(groups, { act = false } = {}) {
  if (!groups.length) return `<div class="nodiet">Nothing to feed on this day</div>`;
  if (isPhone()) return groups.map(g => `<div class="band"><div class="band__h">${I('schedule', 18)}${bandText(feed(g.feed))}<small>${plural(g.rows.length, 'item')}</small></div>${g.rows.map(r => {
    const inner = `<span class="t"><b>${r.name}${r.nameWas || ''}</b>${r.gar || r.garWas ? `<span>${r.gar || ''}${r.garWas || ''}</span>` : ''}${r.cad || r.mask !== EVERY_DAY || r.day.includes('was') ? `<span>${r.cad ? cadTag(r.cad) : r.mask === EVERY_DAY ? 'Daily' : letters(r.mask)}${r.day.includes('class="was"') ? r.day.slice(r.day.indexOf('<span class="was">')) : ''}</span>` : ''}</span><span class="q">${r.amt}</span>${act && r.act ? `<span class="act">${r.act}</span>` : ''}`;
    return r.click ? `<button class="drow ${r.cls}" onclick="${r.click}">${inner}</button>` : `<div class="drow ${r.cls}">${inner}</div>`;
  }).join('')}</div>`).join('');
  const body = groups.map(g => g.rows.map((r, i) => {
    let run = 1;
    while (i + run < g.rows.length && g.rows[i + run].day === r.day) run++;
    const dayCell = i === 0 || g.rows[i - 1].day !== r.day ? `<td class="dy" rowspan="${run}">${r.day}</td>` : '';
    return `<tr class="${r.cls}${r.click ? ' click' : ''}"${r.click ? ` onclick="${r.click}" tabindex="0" onkeydown="if(event.key==='Enter')${r.click}"` : ''}>${i === 0 ? `<td class="tm" rowspan="${g.rows.length}">${bandText(feed(g.feed))}</td>` : ''}${dayCell}<td class="it"><b>${r.name}</b>${r.gar ? ` <span class="gar">(${r.gar})</span>` : ''}${r.nameWas || ''}${r.garWas || ''}</td><td class="amt">${r.amt}</td>${act ? `<td class="act">${r.act || ''}</td>` : ''}</tr>`;
  }).join('')).join('');
  return `<div class="dtab-wrap"><table class="dtab"><thead><tr><th>Time</th><th>Day</th><th>Item</th><th>Daily amt</th>${act ? '<th></th>' : ''}</tr></thead><tbody>${body}</tbody></table></div>`;
}
/* the diet as the Kitchen table (owner, 2 Nov): Time | Day | Item | Daily amt, the time and the day spanning their runs of items as live.
   On the phone the time sits on top of its items. showDays: off when one day is picked. A tap on an item opens the line */
function mealTable(groups, wide = false, showDays = true) {
  if (!groups.length) return `<div class="nodiet">Nothing to feed on this day</div>`;
  const cols = (wide ? 1 : 0) + (showDays ? 1 : 0) + 2, still = ' onclick="event.stopPropagation()"';
  const itemCell = r => { const x = item(r.line.item);
    return x.mix ? `<b>${esc(x.name)}</b><span class="mixtag">MIX</span><span class="mtab__s">· ${plural(x.mix.length, 'item')}</span><span class="ingr">${x.mix.map(p => `<span><b>${esc(item(p.item).name)} · ${p.pct}%</b><small>${esc([p.prep, p.cut].filter(Boolean).join(' · '))}</small></span>`).join('')}</span>`
      : `<b>${esc(x.name)}</b>${r.gar ? `<span class="mtab__s mtab__s--i">(${r.gar})</span>` : ''}`; };
  const body = groups.map(g => (wide ? '' : `<tr class="mtab__band"><td colspan="${cols}"><span>${I('schedule', 18)}${bandText(feed(g.feed))}</span></td></tr>`) + g.rows.map((r, i) => {
    let run = 1;
    while (i + run < g.rows.length && g.rows[i + run].day === r.day) run++;
    const time = wide && i === 0 ? `<td class="mtab__t" rowspan="${g.rows.length}"${still}>${bandText(feed(g.feed))}</td>` : '';
    const day = showDays && (i === 0 || g.rows[i - 1].day !== r.day) ? `<td class="mtab__d" rowspan="${run}"${still}>${r.day}</td>` : '';
    return `<tr onclick="${r.click}" tabindex="0" onkeydown="if(event.key==='Enter'){${r.click}}">${time}${day}<td class="mtab__i">${itemCell(r)}</td><td class="mtab__q">${r.amt}</td></tr>`;
  }).join('')).join('');
  return `<div class="mtab-wrap"><table class="mtab${wide ? ' mtab--wide' : ''}"><thead><tr>${wide ? '<th>Time</th>' : ''}${showDays ? '<th>Day</th>' : ''}<th>Item</th><th>Daily amt</th></tr></thead><tbody>${body}</tbody></table></div>`;
}
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
function speciesRow(sp, { end = '', href, current = false, sub = '' } = {}) {
  return `<a class="sprow pick" href="${href}"${current ? ' aria-current="true"' : ''}>${spThumb(sp)}<span class="sprow__t"><b>${esc(sp.name)}</b><span class="sub sci">${esc(sp.sci)}</span>${sub ? `<span class="meta">${sub}</span>` : ''}</span>${end}</a>`;
}
/* the diet card (Figma plan card, a plain Antz fill); the diet's name, never its ID */
function dietCard(a, { current = false } = {}) {
  const d = diet(a.diet), now = isNow(a), off = ended(a), n = followersOf(a).length;
  const cls = off ? 'dcard--ended' : now ? '' : 'dcard--later';
  const tags = [now ? pill('positive', 'Currently active') : '', off ? pill('neutral', 'Ended') : '', !d.cert ? pill('negative', 'Not certified') : ''].join('');
  return `<a class="dcard pick ${cls}" href="#/diets/${a.sp}/${a.id}"${current ? ' aria-current="true"' : ''}>${tags ? `<span class="dcard__tags">${tags}</span>` : ''}<span class="dcard__name">${esc(d.name)}</span><span class="dcard__kind">${esc(slotText(a))}</span>
    <span class="dcard__foot"><span class="dcard__chip">${I('pets', 18)}${plural(n, 'animal')}</span></span></a>`;
}
/* one diet set at a place, as a row of its card */
function placeDietRow(a, current) {
  const d = diet(a.diet);
  return `<a class="place__d pick" href="#/diets/${a.sp}/${a.id}"${current ? ' aria-current="true"' : ''}><span class="t"><b>${esc(d.name)}</b><span class="sub">${esc(slotText(a))}${isNow(a) ? ' · Currently active' : ''}</span></span>${I('chevron_right', 20)}</a>`;
}
const PLACE_ICON = { site: 'location_on', section: 'domain', enclosure: 'fence' };
function placeCard(p, cur) {
  const sub = [p.path, plural(p.n, 'animal'), p.level === 'section' ? plural(p.encl, 'enclosure') : ''].filter(Boolean).join(' · ');
  return `<div class="place"><div class="place__top"><span class="thumb">${I(PLACE_ICON[p.level])}</span><span class="place__t"><b>${esc(p.name)}</b><span class="sub">${esc(sub)}</span></span></div>${p.diets.length ? p.diets.map(a => placeDietRow(a, cur === a.id)).join('') : '<div class="place__none">No diet added</div>'}</div>`;
}
const SEXT = { M: 'M', F: 'F', U: 'UD' };
function animalCard(a, extra = '') {
  const e = by('enclosures', a.enc), sp = species(a.sp), t = SEXT[a.sex] || 'UD';
  return `<div class="acard"><div class="az-animal"><span class="az-photo"><img src="${spPhoto(a.sp)}" alt="" loading="lazy"><span class="az-photo__sex az-photo__sex--${t}">${t}</span></span><span class="az-animal__d">${a.name ? `<span class="az-animal__tag">Name: ${esc(a.name)}</span>` : ''}<span>AID: ${a.id}</span><span>${esc(sp.name)}</span><span class="az-animal__sci">${esc(sp.sci)}</span><span>Encl: ${esc(e.name)}</span></span></div>${extra}</div>`;
}
