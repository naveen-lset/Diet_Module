// js/versions.js — a species' Version History (owner, 26 Nov 2026): every diet of the species in one line of versions, v1, v2 … counted for the
// whole species. A diet created, changed (by hand or by an approved request), shared or ended makes a new version; the dietitian's and the
// kitchen's certifications are stamped on the version they certified. Each version says who and when (date and time), and opens the diet as it
// read then (View Diet). Kitchen & Diet keeps a diet's past as rows of antz_ktn_diet_plans joined by lineage_id (copy-on-write: each edit
// deactivates the old row and inserts a new one) with createdBy / createdAt, and the certifications as dietician_user_id and
// kitchen_certified_by / _at; it has no version number, so the number here is counted, oldest first.

/* the diets a species has had: its own (ended ones too) and the ones shared with it */
const spDietIds = sp => D.diets.filter(d => d.sp === sp || (d.shared || []).includes(sp)).map(d => d.id);
const plusMin = (stamp, m) => { const t = new Date(stamp); t.setMinutes(t.getMinutes() + m); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}T${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`; };
const later = (a, b) => (a > b ? a : b);
/* what happened to a species' diets, oldest first: { at, by, kind: created | changed | shared | ended | moved | cert | kcert, diet, h } */
function spEvents(sp) {
  const ids = spDietIds(sp), ev = [];
  ids.forEach(id => {
    const d = diet(id), hist = D.history.filter(h => h.diet === id || h.follows === id);
    const made = hist.find(h => h.created && h.diet === id);
    /* the seed knows the day a diet was made and certified, not the hour: the web's working hours, never before what came first */
    const madeAt = made ? made.at : `${d.made.at}T10:30`;
    if (!made) ev.push({ at: madeAt, by: d.made.by, kind: 'created', diet: id, h: null });
    const certs = hist.filter(h => h.cert);
    certs.forEach(h => ev.push({ at: h.at, by: h.by, kind: 'cert', diet: id, h }));
    /* a certification on a day the diet changed comes just after that change; otherwise mid-afternoon; never later than now */
    const lastOn = day => hist.filter(h => h.at.slice(0, 10) === day).map(h => h.at).sort().pop();
    const stamp = (day, dflt, after, gap) => { const x = lastOn(day), t = later(x ? plusMin(x, gap) : `${day}T${dflt}`, plusMin(after, gap)); return t > nowStamp() ? nowStamp() : t; };
    const certAt = d.cert && !certs.length ? stamp(d.cert.at, '15:00', madeAt, 10) : null;
    if (certAt) ev.push({ at: certAt, by: d.cert.by, kind: 'cert', diet: id, h: null });
    if (d.kcert) ev.push({ at: stamp(d.kcert.at, '17:30', certAt || (certs[0] || {}).at || madeAt, 20), by: d.kcert.by, kind: 'kcert', diet: id, h: null });
    hist.filter(h => !h.cert && !h.skip).forEach(h => ev.push({ at: h.at, by: h.by, kind: h.created && h.diet === id ? 'created' : h.shared ? 'shared' : h.ended ? 'ended' : h.follows ? 'moved' : 'changed', diet: id, h }));
  });
  /* a moved place shows once, under the diet it moved to */
  return ev.filter((e, i) => e.kind !== 'moved' || ev.findIndex(x => x.h === e.h) === i).sort((a, b) => a.at.localeCompare(b.at) || (a.kind === 'created' ? -1 : b.kind === 'created' ? 1 : 0));
}
const VKIND = { created: ['Diet Created', 'add_circle'], changed: ['Diet Changed', 'edit_note'], shared: ['Diet Shared', 'share'], ended: ['Diet Ended', 'event_busy'], moved: ['Diet Changed', 'swap_horiz'] };
/* versions, oldest first: v1 … vN, each with the certifications that came while it was the latest */
function spVersions(sp) {
  const out = [];
  spEvents(sp).forEach(e => {
    if (e.kind === 'cert' || e.kind === 'kcert') { const v = [...out].reverse().find(x => x.diet === e.diet) || out[out.length - 1]; if (v) v.certs.push(e); return; }
    out.push({ n: out.length + 1, ...e, certs: [] });
  });
  return out;
}
/* a diet as it read right after a moment: today's diet with every later change taken back */
function dietAt(id, at) {
  const d = diet(id), x = JSON.parse(JSON.stringify(d));
  const find = (f, it) => { const m = x.meals.find(m => m.feed === f); return m ? m.items.findIndex(l => l.item === it) : -1; };
  D.history.filter(h => h.diet === id && h.lines && h.at > at).sort((a, b) => b.at.localeCompare(a.at)).forEach(h => h.lines.forEach(l => {
    let m = x.meals.find(m => m.feed === l.feed);
    if (l.op === 'add') { if (m) m.items = m.items.filter(i => i.item !== l.now.item); return; }
    if (!m) { m = { feed: l.feed, items: [] }; x.meals.push(m); x.meals.sort((a, b) => a.feed - b.feed); }
    if (l.op === 'remove') { if (find(l.feed, l.was.item) < 0) m.items.push({ ...l.was, ...(x.qmode ? { bq: x.qmode.bands.map(() => l.was.qty) } : {}) }); return; }
    const i = find(l.feed, l.now.item); if (i < 0) return;
    const now = m.items[i]; m.items[i] = { ...l.was, ...(now.bq ? { bq: scaleBq(now, l.was) } : {}) };
  }));
  x.meals = x.meals.filter(m => m.items.length);
  return x;
}
const vWho = (id, at) => `${youName(id)}, ${esc(user(id).title)} · ${fmtDayY(at.slice(0, 10))}, ${fmtTime(at)}`;
/* what a version did, in a line: the change summary, or the diet's place for a new one */
function vWhat(v) {
  if (v.h && !v.h.created) return esc(changeSummary(v.h));
  const a = D.assigns.find(x => x.diet === v.diet && x.sp === diet(v.diet).sp) || D.assigns.find(x => x.diet === v.diet);
  return a ? `${esc(tcase(slotKind(a)))} diet · ${esc(useText(a))}` : 'New diet';
}
const VFILT = sp => [['all', 'All diets'], ...spDietIds(sp).map(id => [id, diet(id).name])];
/* (owner, 26 Nov 2026: option A of the mockup; "it was going top and down") the versions on one line, newest on top, grouped by day. Each is a
   card: what happened, the diet, the change, who and the time, and two ticks (Dietitian · Kitchen). A tap opens why, who certified and when,
   the request, and View diet, in place (no redraw, so nothing moves). The diet filter is one dropdown; a new filter starts the list at its top */
function versionsTab(sp) {
  const all = spVersions(sp);
  if (!all.length) return '<div class="nodiet">No diet history yet</div>';
  const f = S.vDiet && S.vDiet.sp === sp ? S.vDiet.id : 'all', list = all.filter(v => f === 'all' || v.diet === f).reverse(), top = all[all.length - 1].n;
    const fname = f === 'all' ? 'All diets' : diet(f).name;
  const head = `<div class="vh__top"><span class="vh__t"><b>${plural(list.length, 'version')}</b><span>Now at v${top} · ${plural(spDietIds(sp).length, 'diet')}</span></span>
    ${spDietIds(sp).length > 1 ? `<button class="vh__f" onclick="vFilterPop(this,${sp})" aria-haspopup="menu"><span>${esc(fname)}</span>${I('keyboard_arrow_down', 20)}</button>` : ''}</div>`;
  /* (owner, 26 Nov 2026: "A · Versions on one line, by day — history has to be like this") the mockup's option A: a heading per day, the version
     numbers on one line down the left, and a white card for each on the page colour. A card says what happened and to which diet, then who
     did it and when; each certification the same way. Nothing else (no item changes, no reasons). View diet at its foot */
  const who = (icon, label, uid, at, fill = false) => `<div class="vr">${I(icon, 18, fill)}<span class="vr__t"><small>${label}</small><b>${esc(user(uid).name)}<span> · ${esc(user(uid).title)}</span></b><span class="vr__w">${fmtDay(at.slice(0, 10))}, ${fmtTime(at)}</span></span></div>`;
  const VERB = { created: 'Created by', changed: 'Changed by', moved: 'Changed by', shared: 'Shared by', ended: 'Ended by' };
  let day = '', html = '';
  list.forEach(v => {
    const d = v.at.slice(0, 10); if (d !== day) { html += `<p class="vday">${wday(d)} ${fmtDayY(d)}</p>`; day = d; }
    const [t] = VKIND[v.kind], cur = v.n === top, cert = v.certs.find(c => c.kind === 'cert'), kc = v.certs.find(c => c.kind === 'kcert');
    html += `<div class="tv${cur ? ' cur' : ''}"><span class="tv__n">v${v.n}</span><article class="vc2${cur ? ' cur' : ''}"><div class="vc2__h"><span class="vc2__k">${t}</span>${cur ? pill('positive', 'Current') : ''}</div>
      <b class="vc2__d">${esc(diet(v.diet).name)}</b>
      <div class="vc2__rows">${who('person', VERB[v.kind], v.by, v.at)}${cert ? who('verified', 'Certified by Dietitian', cert.by, cert.at, true) : ''}${kc ? who('soup_kitchen', 'Certified by Kitchen', kc.by, kc.at) : ''}</div>
      <div class="vc2__f"><button class="lnk" onclick="go('#/diets/${sp}/v/${v.n}')">View diet${I('chevron_right', 18)}</button></div></article></div>`;
  });
  return head + `<div class="tl tl2">${html}</div>`;
}
function vOpen(el) { const o = el.getAttribute('aria-expanded') === 'true'; el.setAttribute('aria-expanded', String(!o)); el.closest('.tv').classList.toggle('open', !o); }
/* the diet filter: a menu under its button (no sheet, no second dimming) */
function vFilterPop(btn, sp) {
  const dev = $('.device'), d = dev.getBoundingClientRect(), k = d.width / dev.offsetWidth || 1, b = btn.getBoundingClientRect(), all = spVersions(sp), f = S.vDiet && S.vDiet.sp === sp ? S.vDiet.id : 'all';
  closeMenu();
  $('#ovl').insertAdjacentHTML('beforeend', `<div class="menu-scrim" onclick="if(event.target===this)closeMenu()"><div class="az-menu vf-menu" role="menu" style="right:${(d.right - b.right) / k}px;top:${(b.bottom - d.top) / k + 4}px">${VFILT(sp).map(([id, l]) => `<button role="menuitemradio" aria-checked="${f === id}" class="${f === id ? 'on' : ''}" onclick="closeMenu();vFilter(${sp},'${id}')"><span class="grow">${esc(l)}</span><small>${id === 'all' ? all.length : all.filter(v => v.diet === id).length}</small>${f === id ? I('check', 20) : ''}</button>`).join('')}</div></div>`);
}
function vFilter(sp, id) {
  S.vDiet = { sp, id }; render();
  const t = $('.vh__top'), box = t && (t.closest('.spsheet__body') || t.closest('.pane__body'));
  if (box) box.scrollTo({ top: 0, behavior: calm() ? 'auto' : 'smooth' });
}
/* View Diet: the diet as it read in that version, its change marked the Kitchen way, with who and when on top */
function paneVersion(sp, n, { cls = '', back = '' } = {}) {
  const all = spVersions(sp), v = all.find(x => x.n === n);
  const top = topbar({ back: '', lead: `<button class="az-iconbtn" onclick="goBack('${back || `#/diets/${sp}`}')" aria-label="Back">${I('arrow_back')}</button>`, title: v ? `Version v${n}` : 'Version', sub: esc(species(sp).name) });
  if (!v) return pane(cls, top, empty1('Version not found'), '', `ver-${sp}-${n}`);
  const d0 = diet(v.diet), x = v.kind === 'ended' ? d0 : dietAt(v.diet, v.at), nextV = all.find(y => y.n > n && y.diet === v.diet && y.h && y.h.lines), cur = !nextV;
  const [t] = VKIND[v.kind], hl = v.h && v.h.lines && v.h.lines.length ? v.h : null;
  const groups = hl ? markedGroups(x, hl, null) : dietGroups(x);
  const a = D.assigns.find(y => y.diet === v.diet && y.sp === sp && !ended(y)) || D.assigns.find(y => y.diet === v.diet && y.sp === sp);
  const head = `<section class="vhead"><div class="vcard__top"><span class="vtag">v${n}</span><span class="vcard__k">${t}</span>${cur && v.kind !== 'ended' ? pill('positive', 'As It Is Today') : ''}</div>
    <b class="vcard__d">${esc(d0.name)}</b><span class="vcard__w">${vWhat(v)}</span>
    <span class="vcard__row">${I('person', 18)}<span>${vWho(v.by, v.at)}</span></span>
    ${v.certs.map(c => `<span class="vcard__row vcard__row--ok">${I(c.kind === 'cert' ? 'verified' : 'soup_kitchen', 18, true)}<span><b>${c.kind === 'cert' ? 'Certified by Dietitian' : 'Certified by Kitchen'}</b> · ${vWho(c.by, c.at)}</span></span>`).join('')}
    ${nextV ? `<span class="vcard__row vcard__row--wait">${I('history', 18)}<span>Changed again in v${nextV.n} · ${fmtDayY(nextV.at.slice(0, 10))}</span></span>` : ''}
    ${a && !ended(a) ? `<a class="lnk vhead__lnk" href="#/diets/${sp}/${a.id}">Open Diet Details${I('chevron_right', 18)}</a>` : ''}</section>`;
  const note = hl ? `<p class="vnote">${I('info', 18)}The lines changed in v${n} are marked: yellow with what it was, or struck through when stopped.</p>` : '';
  const body = head + note + `<p class="secttl">${v.kind === 'ended' ? 'The Diet When It Ended' : 'The Diet In This Version'}</p><div class="dtable">${mealTable(groups, isLand(), true, { bands: qBands(x) })}</div>`;
  return pane(cls, top, `<div class="body">${body}</div>`, '', `ver-${sp}-${n}`);
}
