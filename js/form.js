// js/form.js — Help Desk › New Request (and Edit, by the person who raised it while it is open), as the Help Desk app:
// Request Details (title, description, requested by, requesting to, site, approver) · Attachments · Submit Request, priority at the top right.
// When "Requesting to" is Diet (Dieticians only), the diet sections come in: what you need · which diet · for which animals · what should change · when · reason.
// Full screen on the phone, a window on the iPad.

const PREPS = ['Raw', 'Washed', 'Fresh', 'Peeled', 'Steamed', 'Boiled', 'Mashed', 'Soaked', 'Cooked'];
const CUTS = ['Whole', 'Halved', 'Chunks 5 cm', 'Cubes 2 cm', 'Diced 1 cm', 'Shredded', 'Leaves'];
const STEP_BY = { g: 10, kg: 0.1, ml: 10, ltr: 0.1, pcs: 1 };
const hasSlots = d => !!d.sp && slotsOf(d.sp).length > 0;
const byDiet = d => d.kind !== 'skip' && hasSlots(d);
const slotOn = d => byDiet(d) && d.slot ? by('assigns', d.slot) : null;
const wOf = t => { const p = pathOf(t), w = {}; LEVELS.slice(1, LEVELS.indexOf(t.level) + 1).forEach(l => w[l] = p[l]); return w; };
const deptsFor = u => DEPTS.filter(x => x.id !== 'diet' || canRaise(u));
/* the target is the narrowest level chosen; the diet is the one picked, or (no diet for a day) the one in force there; the site follows the place */
function setTarget(d) {
  const lvl = ['animal', 'enclosure', 'section', 'site'].find(l => d.w[l]) || 'species', ref = lvl === 'species' ? null : d.w[lvl];
  if (d.tsp !== d.sp) d.diet = null;
  Object.assign(d, { level: lvl, ref, tsp: d.sp });
  const s = slotOn(d), w = s ? { diet: diet(s.diet) } : d.sp && !byDiet(d) ? currentDiet(d) : null, base = w ? w.diet.id : null;
  if (base !== d.base) d.changes = [];
  d.base = base;
  if (d.diet === d.base) d.diet = null;
  if (d.sp) { const p = pathOf(d); d.site = p.site || (d.site && spAnimals(d.sp, d.site).length ? d.site : pathOfAnimal(spAnimals(d.sp)[0]).site); }
}
function pickKind(k) { const d = S.draft; if (d.kind !== k) { d.kind = k; d.changes = []; d.diet = null; setTarget(d); } render(); }
function setW(level, id) {
  const d = S.draft;
  if (level === 'species') { d.sp = id; d.w = {}; d.slot = null; }
  else { LEVELS.slice(LEVELS.indexOf(level) + 1).forEach(l => delete d.w[l]); if (id == null) delete d.w[level]; else { d.w[level] = id; Object.assign(d.w, wOf({ sp: d.sp, level, ref: id })); } }
  setTarget(d); closeAll(); render();
}
function setSlot(id) { const d = S.draft; d.slot = id; d.w = wOf(by('assigns', id)); setTarget(d); render(); }

/* ---------- the draft ---------- */
function initDraft(q) {
  const editId = q.get('edit'), asg = q.get('asg'), dq = q.get('dept'), key = [S.user, editId || 'new', asg || '', dq || ''].join(':');
  if (S.draft && S.draft.key === key) return S.draft;
  const blank = { key, edit: null, dept: null, f: {}, title: '', titleEdited: false, text: '', site: null, approver: null, prio: 'normal', files: [],
    kind: 'items', sp: null, level: 'species', ref: null, w: {}, slot: null, base: null, changes: [], diet: null,
    start: addDays(TODAY, 1), end: addDays(TODAY, 14), endMode: 'date', date: TODAY, feeds: 'all', reason: null, note: '' };
  if (editId) {
    const r = by('requests', editId);
    if (!r || r.by !== S.user || !isOpen(r)) return (S.draft = { key, blocked: true });
    const d = { ...blank, edit: r.id, dept: r.dept, f: JSON.parse(JSON.stringify(r.f || {})), title: r.title, titleEdited: true, text: r.text, site: r.site, approver: r.approver, prio: r.prio, files: [...(r.files || [])], note: r.note || '' };
    if (isDiet(r)) Object.assign(d, { kind: r.kind, sp: r.sp, tsp: r.sp, level: r.level, ref: r.ref, w: wOf(r), slot: r.kind === 'skip' ? null : (slotFor(r) || {}).id || null, base: r.base || (currentDiet(r) || { diet: {} }).diet.id || null,
      changes: (r.changes || []).map(c => ({ ...c })), diet: r.diet || null, start: r.start || addDays(TODAY, 1), end: r.end || addDays(TODAY, 14), endMode: r.kind !== 'skip' && !r.end ? 'open' : 'date',
      date: r.date || TODAY, feeds: r.feeds === 'all' || !r.feeds ? 'all' : [...r.feeds], reason: r.reason });
    return (S.draft = d);
  }
  const d = (S.draft = blank);
  if (dq && deptsFor(me()).some(x => x.id === dq)) setDept(dq, false);
  const a = asg && by('assigns', asg);
  if (a && d.dept === 'diet') { d.sp = a.sp; d.slot = a.id; d.w = wOf(a); setTarget(d); }
  return d;
}
const asReq = d => ({ kind: d.kind, sp: d.sp, level: d.level, ref: d.ref, slot: byDiet(d) ? d.slot : null, base: d.base, changes: d.changes, diet: d.diet, start: d.start, end: d.endMode === 'open' ? null : d.end, date: d.date, feeds: d.feeds });
/* a diet request suggests its own title until the person types one */
const titleOf = d => d.titleEdited || d.dept !== 'diet' ? d.title : (d.sp && (d.kind !== 'items' || d.changes.length) && (d.kind !== 'diet' || d.diet) ? autoTitle(asReq(d)) : '');
function err(d) {
  if (!d.dept) return 'Choose the department';
  if (d.dept === 'diet') {
    if (!d.sp) return 'Choose the species';
    if (byDiet(d) && !d.slot) return 'Choose the diet';
    if (d.kind === 'items' && !d.base) return 'There is no diet here to change';
    if (d.kind === 'items' && !d.changes.length) return 'Change at least one item';
    if (d.kind === 'diet' && !d.diet) return 'Choose the new diet';
    if (d.kind === 'skip' && (d.date < TODAY || (d.feeds !== 'all' && !d.feeds.length))) return 'Choose the day and the feeds';
    if (d.kind !== 'skip' && (!d.start || d.start < TODAY || (d.endMode === 'date' && (!d.end || d.end < d.start)))) return 'Check the dates';
    if (!d.reason) return 'Choose a reason';
  }
  const form = DEPT_FORMS[d.dept];
  if (form) for (const x of form.fields) if (x.req && !(x.type === 'items' ? (d.f.items || []).some(i => i.name.trim() && i.qty > 0) : d.f[x.k])) return `Add ${x.label.toLowerCase()}`;
  if (!titleOf(d).trim()) return 'Add a title';
  if (d.text.trim().length < 5) return 'Add a description';
  if (!d.site) return 'Choose the site';
  if (!d.approver) return 'Add the approver';
  return '';
}

/* ---------- form parts (Antz fields: labels above, 56 tall) ---------- */
const section = (icon, title, body, req = false) => `<section class="az-section"><h2 class="az-section__title">${I(icon, 20)}<span class="grow">${title}${req ? '<span class="az-req">*</span>' : ''}</span></h2>${body}</section>`;
const select = (label, value, js, { req = false, placeholder = 'Select', disabled = false, icon = 'keyboard_arrow_down' } = {}) => `<div class="az-field">${label ? `<span class="az-label">${label}${req ? ' <span class="az-req">*</span>' : ''}</span>` : ''}<button class="az-input az-input--select${value ? '' : ' az-input--placeholder'}" ${disabled ? 'aria-disabled="true" disabled' : `onclick="${js}"`}><span class="grow">${value ? esc(value) : placeholder}</span>${I(icon, 24)}</button></div>`;
const personCard = (id, remove = '') => { const u = user(id); return `<div class="az-picked">${avatar(u.name)}<span class="grow"><span class="az-who__name">${youName(id)}</span><span class="az-who__sub">${esc(u.title)}</span></span>${remove ? `<button class="az-iconbtn" onclick="${remove}" aria-label="Remove ${esc(u.name)}" style="color:var(--Tertiary)">${I('cancel')}</button>` : ''}</div>`; };
const KTABS = [['items', 'Change items'], ['diet', 'Change diet'], ['skip', 'No diet for a day']];
function setDept(id, draw = true) { const d = S.draft; if (d.dept !== id) d.f = id === 'procurement' ? { items: [{ name: '', qty: 1 }] } : {}; d.dept = id; d.approver = dept(id).head; if (draw) { closeAll(); render(); } }
const pickDept = v => setDept(v);
/* Requesting to: each department with what it handles and who approves; Diet is locked for people without the Dietician permission */
function deptSheet() {
  const u = me(), cur = S.draft.dept;
  openSheet(() => ({ title: 'Requesting to', pick: true, body: DEPTS.map(x => { const locked = x.id === 'diet' && !canRaise(u), on = cur === x.id;
    return `<button class="az-option dopt${locked ? ' dopt--locked' : ''}" role="radio" aria-checked="${on}" ${locked ? 'aria-disabled="true" disabled' : `onclick="pickDept('${x.id}')"`}><span class="dopt__ic">${I(x.icon, 24)}</span><span><b>${x.name}</b><small>${locked ? 'Dieticians raise diet requests' : `${esc(x.what)} · ${esc(user(x.head).name)}`}</small></span>${locked ? I('lock', 22) : I(on ? 'radio_button_checked' : 'radio_button_unchecked', 24, on)}</button>`; }).join('') }));
}
function pickReqSite(v) { S.draft.site = +v; closeAll(); render(); }
function pickApprover(v) { S.draft.approver = v; closeAll(); render(); }
function requestDetails(d) {
  const deptName = d.dept ? dept(d.dept).name : '';
  return section('category', 'Request Details', `${select('Requesting to', deptName, 'deptSheet()', { placeholder: 'Select Department', disabled: !!d.edit })}
    <span class="az-label">What are you requesting?</span>
    <label class="az-input az-input--text"><input id="f-title" placeholder="Title" value="${esc(titleOf(d))}" oninput="S.draft.title=this.value;S.draft.titleEdited=true;redrawFoot()" aria-label="Title"></label>
    <label class="az-input az-input--text az-textarea"><textarea id="f-text" rows="4" placeholder="Description / Justification" oninput="S.draft.text=this.value;redrawFoot()" aria-label="Description or justification">${esc(d.text)}</textarea></label>
    <div class="az-field"><span class="az-label">Requested by</span>${personCard(S.user)}</div>
    ${d.site ? `<div class="az-field"><span class="az-label">Requesting Site</span><div class="az-site az-site--picked"><span class="az-site__thumb" style="display:grid;place-items:center;color:var(--Outline)">${I('location_on', 20)}</span><span class="grow"><span class="az-site__name">${esc(by('sites', d.site).name)}</span></span>${d.dept === 'diet' && d.sp ? '' : `<button class="az-iconbtn" onclick="S.draft.site=null;render()" aria-label="Remove site">${I('cancel')}</button>`}</div></div>`
      : select('Requesting Site', '', `optionSheet('Requesting Site',D.sites.map(s=>[s.id,s.name]),S.draft.site,'pickReqSite')`, { placeholder: 'Choose site', icon: 'add_circle' })}
    ${d.approver ? `<div class="az-field"><span class="az-label">To be approved by</span>${personCard(d.approver, d.dept === 'diet' ? '' : 'S.draft.approver=null;render()')}</div>`
      : select('To be approved by', '', `optionSheet('To be approved by',D.users.filter(u=>u.id!==S.user&&!VIEWERS.includes(u.id)||u.id==='u-suresh').map(u=>[u.id,u.name,u.title]),S.draft.approver,'pickApprover')`, { placeholder: 'Add approver', icon: 'add_circle' })}`, true);
}
function speciesSelect(d) { return select('Species', d.sp ? species(d.sp).name : '', 'speciesPickSheet()', { req: true, placeholder: 'Choose species' }); }
/* Species: a bottom sheet with search, photo rows, the number of diets */
let SPQ = '';
function speciesPickSheet() {
  SPQ = '';
  openSheet(() => {
    const q = SPQ.trim().toLowerCase(), list = D.species.filter(s => !q || s.name.toLowerCase().includes(q) || s.sci.toLowerCase().includes(q) || String(s.id).includes(q)).sort((a, b) => a.name.localeCompare(b.name));
    return { title: 'Species', bottom: true, body: `<label class="az-search sheet-search">${I('search', 20)}<input id="spq-f" placeholder="Search species or taxonomy ID" value="${esc(SPQ)}" oninput="SPQ=this.value;redrawSheet()" aria-label="Search species"></label>`
      + (list.length ? list.map(s => { const on = S.draft.sp === s.id, n = slotsOf(s.id).length;
        return `<button class="sprow" role="radio" aria-checked="${on}" onclick="closeAll();setW('species',${s.id})">${spThumb(s)}<span class="sprow__t"><b>${esc(s.name)}</b><span class="sub sci">${esc(s.sci)}</span><span class="meta">${s.cls} · ${n ? plural(n, 'diet') : 'No diet'}</span></span>${I(on ? 'radio_button_checked' : 'radio_button_unchecked', 24, on)}</button>`; }).join('') : '<div class="nodiet">No species matches</div>') };
  });
  setTimeout(() => { const i = document.getElementById('spq-f'); if (i && !matchMedia('(pointer: coarse)').matches) i.focus(); }, 60);
}
function pickSpecies(v) { setW('species', +v); }
/* cascading place pickers, one per level; `pool` keeps the options to the animals on the chosen diet */
function placeSelects(d, levels, pool = null) {
  const within = l => { const o = {}; LEVELS.slice(1, LEVELS.indexOf(l)).forEach(k => { if (d.w[k]) o[k] = d.w[k]; }); return o; };
  return levels.map(l => {
    const opts = d.sp ? placesUnder(d.sp, l, within(l), pool) : [], cur = opts.find(o => o.id === d.w[l]);
    const list = JSON.stringify([['', `All ${LEVEL[l].toLowerCase()}s`, ''], ...opts.map(o => [o.id, o.name, l === 'animal' ? (o.sub || '') : plural(o.n, 'animal')])]).replace(/"/g, '&quot;');
    return select(LEVEL[l], cur ? cur.name : `All ${LEVEL[l].toLowerCase()}s`, `optionSheet('${LEVEL[l]}',${list},S.draft.w['${l}']||'','pickPlace${l}')`, { disabled: !d.sp || !opts.length });
  }).join('');
}
LEVELS.slice(1).forEach(l => { window['pickPlace' + l] = v => setW(l, v === '' ? null : +v); });
const animalsLine = d => `<span class="az-lastline">${I('pets', 20)}<button class="lnk" onclick="animalsSheetFor(S.draft)">${plural(animalsIn(d).length, 'animal')}</button></span>`;
const dupNote = d => { const open = d.sp ? openFor(d).filter(r => r.id !== d.edit) : []; return open.length ? `<div class="az-warnline">${I('info', 18)}<span>Already open here: ${open.map(r => `<a class="lnk" href="#/requests/${r.id}">${r.id}</a>`).join(', ')}</span></div>` : ''; };

/* the diet sections */
/* the diet part: what you need, the species, which diet (a bottom sheet by level), for which animals (the entity page) */
const LVL_TABS = [['all', 'All'], ['species', 'Species-wide'], ['site', 'Site-wide'], ['section', 'Section-wide'], ['enclosure', 'Enclosure-wide'], ['animal', 'Animal-wide']];
const slotWhere = a => a.level === 'species' ? 'Species-wide' : `${LEVEL[a.level]} · ${targetName(a)}`;
function dietPick(d) {
  const slots = d.sp ? slotsOf(d.sp) : [], s = slotOn(d);
  const seg = `<div class="az-seg" role="tablist">${thumb()}${KTABS.map(([k, l]) => `<span role="tab" tabindex="0" aria-selected="${d.kind === k}" onclick="pickKind('${k}')" onkeydown="if(event.key==='Enter')pickKind('${k}')">${l}</span>`).join('')}</div>`;
  if (d.kind === 'skip') return section('restaurant', 'Diet', seg + speciesSelect(d) + (d.sp ? whoField(d) + `<div class="az-hintline">${I('restaurant', 18)}<span>Diet now: ${currentDiet(d) ? `<button class="lnk" onclick="dietSheet('${currentDiet(d).diet.id}')">${esc(currentDiet(d).diet.name)}</button>` : 'no diet'}</span></div>` + dupNote(d) : ''));
  if (!d.sp || !slots.length) return section('restaurant', 'Diet', seg + speciesSelect(d) + (d.sp ? `<div class="az-hintline">${I('info', 18)}<span>${esc(species(d.sp).name)} has no diet yet.</span></div>` : ''));
  const which = s ? pickedBox('Selected diet', 'restaurant', esc(diet(s.diet).name), `${esc(slotKind(s))} · ${esc(slotWhere(s))} · ${plural(followersOf(s).length, 'animal')}`, 'clearSlot()', `<button class="lnk" onclick="dietSheet('${s.diet}')">View</button>`)
    : `<div class="az-field"><span class="az-label">Which diet? <span class="az-req">*</span></span><button class="az-input az-input--select az-input--placeholder" onclick="dietPickSheet()"><span class="grow">Choose diet</span>${I('keyboard_arrow_down')}</button></div>`;
  return section('restaurant', 'Diet', seg + speciesSelect(d) + which + (s ? whoField(d) + dupNote(d) : ''));
}
/* a chosen thing, as the Selected box of the entity page: title + Clear, then the choice */
const pickedBox = (title, icon, name, sub, clear, end = '', locked = false) => `<div class="ebox"><div class="ebox__h"><span>${title}</span>${clear && !locked ? `<button onclick="${clear}">Clear</button>` : ''}</div><div class="ebox__c"><span class="eav">${I(icon, 22)}</span><span class="grow"><b>${name}</b>${sub ? `<small>${sub}</small>` : ''}</span>${end}</div></div>`;
function clearSlot() { const d = S.draft; d.slot = null; d.w = {}; setTarget(d); render(); }
/* Which diet: a bottom sheet, tabs by level */
function dietPickSheet() {
  const d = S.draft; if (!d.dlvl) d.dlvl = 'all';
  openSheet(() => {
    const slots = slotsOf(d.sp), tabs = LVL_TABS.filter(([k]) => k === 'all' || slots.some(a => a.level === k)), list = slots.filter(a => d.dlvl === 'all' || a.level === d.dlvl);
    return { title: 'Which diet?', sub: esc(species(d.sp).name), bottom: true,
      body: `<div class="az-chips sheet-chips" role="tablist">${tabs.map(([k, l]) => `<button class="az-chip" role="tab" aria-selected="${d.dlvl === k}" onclick="S.draft.dlvl='${k}';redrawSheet()">${l} - ${k === 'all' ? slots.length : slots.filter(a => a.level === k).length}</button>`).join('')}</div>`
        + list.map(a => { const on = d.slot === a.id; return `<button class="az-pickrow" role="radio" aria-checked="${on}" onclick="closeAll();setSlot('${a.id}')"><span class="az-pickrow__t"><b>${esc(diet(a.diet).name)}</b><span>${esc(slotKind(a))}${a.group ? ' · ' + esc(a.group.label) : ''} · ${esc(slotWhere(a))}</span><span>${plural(followersOf(a).length, 'animal')}${isNow(a) ? ' · Currently active' : ''}</span></span>${I(on ? 'radio_button_checked' : 'radio_button_unchecked', 24, on)}</button>`; }).join('') };
  });
}
/* For which animals: the field shows the choice; it opens the entity page */
function whoField(d) {
  const s = slotOn(d), n = animalsIn(d).length, base = s ? s.level : 'species', chosen = d.level !== base;
  const name = chosen ? esc(targetName(d)) : s ? 'All animals on this diet' : `All ${esc(species(d.sp).name)}`, path = chosen ? esc(targetPath(d)) : '';
  if (s && s.level === 'animal') return pickedBox('For which animals?', 'pets', esc(targetName(d)), esc(targetPath(d)), '', '', true);
  return `<div class="az-field"><span class="az-label">For which animals?</span><button class="whobtn" onclick="entOpen()"><span class="eav">${I(chosen ? (d.level === 'animal' ? 'pets' : PLACE_ICON[d.level]) : 'groups', 22)}</span><span class="grow"><b>${name}</b><small>${[path, plural(n, 'animal')].filter(Boolean).join(' · ')}</small></span>${I('chevron_right')}</button></div>`;
}

/* ---------- the entity page (as the Item requests form): search, the site, then Section › Enclosure › Animal, Done ---------- */
const entPool = d => { const s = slotOn(d); return s ? followersOf(s) : D.animals.filter(a => a.sp === d.sp); };
function entOpen() { const d = S.draft, s = slotOn(d), lock = s ? wOf(s) : {}; d.ent = { ...lock, ...d.w, lock, q: '' }; if (!d.ent.site) { const sites = placesUnder(d.sp, 'site', {}, entPool(d)); if (sites.length === 1) d.ent.site = sites[0].id; } render(); }
function entBack() { S.draft.ent = null; render(); }
function entSet(o) {
  const e = S.draft.ent, deepest = ['animal', 'enclosure', 'section', 'site'].find(l => o[l]);
  if (deepest) Object.assign(e, pathOf({ sp: S.draft.sp, level: deepest, ref: o[deepest] }));
  Object.assign(e, o); closeAll(); render();
}
function entDone() { const d = S.draft, e = d.ent; d.w = {}; ['site', 'section', 'enclosure', 'animal'].forEach(l => { if (e[l]) d.w[l] = e[l]; }); d.ent = null; setTarget(d); render(); }
const entWithin = (e, l) => { const o = {}; LEVELS.slice(1, LEVELS.indexOf(l)).forEach(k => { if (e[k]) o[k] = e[k]; }); return o; };
const entCount = (pool, l, id) => pool.filter(a => pathOfAnimal(a)[l] === id);
/* a section or enclosure card (the site card shape: a square thumbnail, the name, where and how many) */
function placeCard2(l, id, pool) {
  const p = placeOf(l, id), here = entCount(pool, l, id), encl = new Set(here.map(a => a.enc)).size;
  const sub = l === 'site' ? [plural(new Set(here.map(a => pathOfAnimal(a).section)).size, 'section'), plural(here.length, 'animal')]
    : l === 'section' ? [placeOf('site', p.site).name, plural(encl, 'enclosure'), plural(here.length, 'animal')]
    : [`${placeOf('section', p.section).name} › ${placeOf('site', placeOf('section', p.section).site).name}`, plural(here.length, 'animal')];
  return `<span class="pcard"><span class="thumb">${I(PLACE_ICON[l], 24)}</span><span class="grow"><b>${esc(p.name)}</b><span class="sub">${esc(sub.join(' · '))}</span></span></span>`;
}
const pcardBtn = (l, id, pool, js, on) => `<button class="pcard-btn${on ? ' on' : ''}" onclick="${js}">${placeCard2(l, id, pool)}${I(on ? 'check_circle' : 'chevron_right', 22, on)}</button>`;
const erow = (icon, name, chips, js, on) => `<button class="erow${on ? ' on' : ''}" onclick="${js}"><span class="eav">${I(icon, 22)}</span><span class="grow"><b>${name}</b><span class="echips">${chips.map(c => `<span class="echip">${esc(c)}</span>`).join('')}</span></span>${on ? I('check', 22) : I('chevron_right', 20)}</button>`;
function entSheet(l) {
  const d = S.draft, e = d.ent, pool = entPool(d), opts = placesUnder(d.sp, l, entWithin(e, l), pool);
  openSheet(() => ({ title: `Select ${LEVEL[l]}`, sub: [e.enclosure && l === 'animal' ? `Encl: ${placeOf('enclosure', e.enclosure).name}` : '', e.section && l !== 'section' && l !== 'site' ? `Sec: ${placeOf('section', e.section).name}` : '', e.site && l !== 'site' ? `Site: ${placeOf('site', e.site).name}` : ''].filter(Boolean).join(' · '), bottom: true,
    body: l === 'animal' ? opts.map(o => { const an = by('animals', o.id); return `<button class="epick" onclick="entSet({animal:${o.id}})">${animalCard(an)}</button>`; }).join('')
      : opts.map(o => pcardBtn(l, o.id, pool, `entSet({${l}:${o.id}${LEVELS.slice(LEVELS.indexOf(l) + 1).map(k => `,${k}:null`).join('')}})`, e[l] === o.id)).join('') }));
}
function paneEntity(d) {
  const e = d.ent, pool = entPool(d), q = e.q.trim().toLowerCase(), lock = e.lock, sites = placesUnder(d.sp, 'site', {}, pool);
  const search = `<div class="az-searchrow"><label class="az-search">${I('search', 20)}<input id="ent-q" placeholder="Search animal, enclosure, section" value="${esc(e.q)}" oninput="S.draft.ent.q=this.value;render()" aria-label="Search animal, enclosure or section"></label><button class="az-scanbtn" onclick="toast('Scan an enclosure or animal QR')" aria-label="Scan QR">${I('qr_code_scanner', 22)}</button></div>`;
  let body;
  if (q) {
    const secs = placesUnder(d.sp, 'section', entWithin(lock, 'section'), pool).filter(o => o.name.toLowerCase().includes(q) && (!lock.section || lock.section === o.id));
    const encs = placesUnder(d.sp, 'enclosure', entWithin(lock, 'enclosure'), pool).filter(o => o.name.toLowerCase().includes(q) && (!lock.enclosure || lock.enclosure === o.id));
    const ans = pool.filter(a => `${animalName(a)} ${a.id}`.toLowerCase().includes(q) && Object.entries(lock).every(([k, v]) => !v || pathOfAnimal(a)[k] === v));
    const pick = (l, id) => { const p = pathOf({ sp: d.sp, level: l, ref: id }); return `entSet({site:${p.site || 'null'},section:${p.section || 'null'},enclosure:${p.enclosure || 'null'},animal:${p.animal || 'null'},q:''})`; };
    body = !secs.length && !encs.length && !ans.length ? `<div class="nodiet">Nothing called “${esc(e.q)}”. Try another name, or choose step by step.</div>`
      : (secs.length ? `<p class="cap">Sections</p>${secs.map(o => pcardBtn('section', o.id, pool, pick('section', o.id))).join('')}` : '')
      + (encs.length ? `<p class="cap">Enclosures</p>${encs.map(o => pcardBtn('enclosure', o.id, pool, pick('enclosure', o.id))).join('')}` : '')
      + (ans.length ? `<p class="cap">Animals</p>${ans.map(a => `<button class="epick" onclick="${pick('animal', a.id)}">${animalCard(a)}</button>`).join('')}` : '');
  } else {
    const site = e.site ? placeOf('site', e.site) : null, step = (l, icon, opt) => {
      const v = e[l], deeper = LEVELS.slice(LEVELS.indexOf(l) + 1).some(k => e[k]);
      if (v) { const clear = lock[l] || deeper ? '' : `<button onclick="entSet({${l}:null${LEVELS.slice(LEVELS.indexOf(l) + 1).map(k => `,${k}:null`).join('')}})">Clear</button>`;
        return `<div class="ebox"><div class="ebox__h"><span>Selected ${LEVEL[l]}</span>${clear}</div>${l === 'animal' ? animalCard(by('animals', v)) : `<div class="ebox__card">${placeCard2(l, v, pool)}</div>`}</div>`; }
      return `<button class="az-input az-input--select az-input--placeholder" onclick="entSheet('${l}')"><span class="grow">Select ${LEVEL[l]}${opt ? ' (optional)' : ''}</span>${I('keyboard_arrow_down')}</button>`;
    };
    body = `<p class="cap">Site</p>${sites.length > 1 && !lock.site ? `<button class="esite" onclick="entSheet('site')">${I('near_me', 22)}<span class="grow">${site ? esc(site.name) : 'All sites'}</span>${I('keyboard_arrow_down')}</button>` : `<div class="esite esite--fixed">${I('near_me', 22)}<span class="grow">${esc((site || placeOf('site', sites[0].id)).name)}</span></div>`}
      <p class="cap">Choose Section, Enclosure or Animal</p>${step('section', 'domain')}${e.section ? step('enclosure', 'fence') : ''}${e.enclosure ? step('animal', 'pets', true) : ''}`;
  }
  const picked = ['animal', 'enclosure', 'section', 'site'].find(l => e[l] && !lock[l]), t = picked ? { sp: d.sp, level: picked, ref: e[picked], kind: d.kind, slot: d.slot, base: d.base } : null;
  const n = (t ? pool.filter(a => inScope(a, t)) : pool).length, words = t ? [targetPath(t), targetName(t)].filter(Boolean).join(' › ') : (slotOn(d) ? 'All animals on this diet' : `All ${species(d.sp).name}`);
  const foot = `<div class="az-actionbar az-actionbar--row"><span class="grow entfoot"><b>${esc(words)}</b><small>${plural(n, 'animal')}</small></span><button class="az-btn" onclick="entDone()">Done</button></div>`;
  return pane('pane--fill form-page ent-page', topbar({ back: '', lead: `<button class="az-iconbtn" onclick="entBack()" aria-label="Back">${I('arrow_back')}</button>`, title: 'For which animals?' }) + search, `<div class="body">${body}</div>`, foot, `ent-${d.key}`);
}
function dietSheet(id) { const d = diet(id); openSheet(() => ({ title: esc(d.name), sub: esc(species(d.sp).name), body: linesView(dietGroups(d)) }), SH.length > 0); }

/* what should change: the diet as Diet Details shows it; tap a line to change it; the Kitchen marks show what changed */
const changeOf = (d, f, it) => d.changes.find(x => x.op !== 'add' && x.feed === f && x.item === it);
const addsAt = (d, f) => d.changes.filter(c => c.op === 'add' && c.feed === f);
function itemsSec(d) {
  const base = diet(d.base), feeds = [...new Set([...base.meals.map(m => m.feed), ...d.changes.filter(c => c.op === 'add').map(c => c.feed)])].sort((a, b) => a - b);
  const row = (r, js) => `<button class="frow${r.cls ? ' frow--' + r.cls : ''}" onclick="${js}"><span class="frow__i"><b>${r.name}${r.nameWas || ''}</b>${r.mix || r.gar || r.garWas ? `<span class="frow__s">${r.mix || r.gar}${r.garWas || ''}</span>` : ''}${dayMark(r)}${r.day.includes('class="was"') ? r.day.slice(r.day.indexOf('<span class="was">')) : ''}</span><span class="frow__q">${r.amt}</span></button>`;
  const bands = feeds.map(f => {
    const m = base.meals.find(x => x.feed === f) || { items: [] };
    const rows = m.items.map(i => row(lineRow(i, changeOf(d, f, i.item)), `lineSheet(${f},${i.item})`)).concat(addsAt(d, f).map(c => row(lineRow(null, c), `addSheet(${f},${c.to})`)));
    return `<div class="fband fband--static"><span class="fband__t">${I('schedule', 18)}${bandText(feed(f))}</span><span class="fband__c fband__c--q">${f === feeds[0] ? 'Daily amt' : ''}</span></div><div class="frows">${rows.join('')}<button class="frow-add" onclick="addSheet(${f})">${I('add', 20)}Add item</button></div>`;
  }).join('');
  const n = d.changes.length;
  return `<section class="az-section"><h2 class="az-section__title">${I('edit_note', 20)}<span class="grow">What should change<span class="az-req">*</span></span>${n ? `<span class="chgcount">${plural(n, 'change')}</span>` : ''}</h2><div class="fbands">${bands}</div></section>`;
}
function setChange(c) { const d = S.draft; d.changes = d.changes.filter(x => !(c.op !== 'add' && x.op !== 'add' && x.feed === c.feed && x.item === c.item) && !(c.op === 'add' && x.op === 'add' && x.feed === c.feed && x.to === c.to)); d.changes.push(c); d.changes.sort((a, b) => a.feed - b.feed); closeAll(); render(); }
function undoChange(f, it) { const d = S.draft; d.changes = d.changes.filter(x => !(x.op !== 'add' && x.feed === f && x.item === it)); closeAll(); render(); }
function undoAdd(f, to) { const d = S.draft; d.changes = d.changes.filter(x => !(x.op === 'add' && x.feed === f && x.to === to)); closeAll(); render(); }

/* one diet line: time, item, daily amount, day, preparation, cut size */
let LS = {};
function lineSheet(f, it) {
  const was = entryOf(diet(S.draft.base), f, it), c = changeOf(S.draft, f, it), from = c && c.op === 'change' ? c : { ...was, to: was.item };
  LS = { mode: 'change', feed: f, item: it, to: from.to, qty: from.qty, unit: from.unit, prep: from.prep || '', cut: from.cut || '', days: from.days ?? EVERY_DAY, cad: from.cad ? { ...from.cad } : null, had: !!c };
  openSheet(lsHtml);
}
function addSheet(f = null, to = null) {
  const c = to ? addsAt(S.draft, f).find(x => x.to === to) : null;
  LS = c ? { mode: 'add', feed: f, wasFeed: f, to: c.to, was: c.to, qty: c.qty, unit: c.unit, prep: c.prep || '', cut: c.cut || '', days: c.days ?? EVERY_DAY, cad: c.cad ? { ...c.cad } : null, had: true }
    : { mode: 'add', feed: f ?? diet(S.draft.base).meals[0].feed, to: null, was: null, qty: null, unit: null, prep: '', cut: '', days: EVERY_DAY, cad: null, had: false };
  openSheet(lsHtml);
}
function itemsAt(f) { const d = S.draft, m = diet(d.base).meals.find(x => x.feed === f), ids = new Set(m ? m.items.map(i => i.item) : []); addsAt(d, f).forEach(c => ids.add(c.to)); if (LS.item) ids.delete(LS.item); if (LS.was && LS.wasFeed === f) ids.delete(LS.was); return ids; }
function lsHtml() {
  const d = S.draft, n = animalsIn(d).length, add = LS.mode === 'add', was = add ? null : entryOf(diet(d.base), LS.feed, LS.item), it = LS.to ? item(LS.to) : null;
  const line = { to: LS.to, qty: LS.qty, unit: LS.unit, prep: LS.prep, cut: LS.cut, days: LS.cad ? EVERY_DAY : LS.days, cad: LS.cad }, diff = was && it && LS.qty > 0 ? Object.values(lineDiff(was, line)).some(Boolean) : true;
  const st = it && LS.qty > 0 ? stockFor(it, LS.qty, LS.unit, n) : 'ok', need = it && LS.qty > 0 ? qtyText(toBase(LS.qty, LS.unit) * n, BASE[LS.unit][0]) : '';
  const ok = it && LS.qty > 0 && LS.days && (diff || LS.had);
  const stopped = !add && (changeOf(d, LS.feed, LS.item) || {}).op === 'remove';
  const left = stopped ? `<button class="az-btn az-btn--outline" onclick="undoChange(${LS.feed},${LS.item})">${I('undo', 20)}Give it again</button>` : !add ? `<button class="az-btn az-btn--ghost" onclick="setChange({op:'remove',feed:${LS.feed},item:${LS.item}})">${I('do_not_disturb_on', 20)}Stop giving it</button>` : LS.had ? `<button class="az-btn az-btn--ghost" onclick="undoAdd(${LS.wasFeed},${LS.was})">Remove</button>` : `<button class="az-btn az-btn--outline" onclick="closeSheet()">Cancel</button>`;
  /* one clean form: time (when adding), item, the amount as one field with − and + inside, the days as one row, preparation and cut side by side */
  const units = it ? unitsFor(it) : [];
  const amount = it ? `<div class="qtyf"><button class="qtyf__b" aria-label="Less" onclick="stepQty(-1)">${I('remove')}</button><input id="ls-qty" type="number" inputmode="decimal" min="0" step="any" value="${LS.qty ?? ''}" oninput="LS.qty=+this.value;redrawSheet()" aria-label="Daily amount per animal"><button class="qtyf__u" onclick="unitSheet()" ${units.length > 1 ? '' : 'disabled'} aria-label="Unit: ${LS.unit}">${LS.unit}${units.length > 1 ? I('keyboard_arrow_down', 18) : ''}</button><button class="qtyf__b" aria-label="More" onclick="stepQty(1)">${I('add')}</button></div>`
    : `<div class="qtyf qtyf--off"><span>Choose the item first</span></div>`;
  /* how often, as Kitchen & Diet: days of the week, every few days from a first feed, or one day a month */
  const rep = LS.cad ? (LS.cad.every ? 'every' : 'monthly') : 'week';
  const repSeg = `<div class="az-segment az-segment--sm" role="tablist" aria-label="Repeats">${thumb()}${[['week', 'Days of week'], ['every', 'Every few days'], ['monthly', 'Monthly']].map(([k, l]) => `<button role="tab" aria-selected="${rep === k}" onclick="setRepeat('${k}')">${l}</button>`).join('')}</div>`;
  const days = repSeg + (rep === 'week' ? `<div class="dsel" role="group" aria-label="Days"><button class="dsel__all" aria-pressed="${LS.days === EVERY_DAY}" onclick="setDays(-1)">Daily</button>${DAYS.map((x, i) => `<button aria-pressed="${LS.days !== EVERY_DAY && !!(LS.days & (1 << i))}" aria-label="${x}" onclick="setDays(${i})">${x[0]}</button>`).join('')}</div>`
    : rep === 'every' ? `<div class="az-two"><label class="az-field"><span class="az-label">Every (days)</span><span class="az-input az-input--text"><input id="ls-every" type="number" min="2" max="60" value="${LS.cad.every}" oninput="if(+this.value>=2){LS.cad.every=+this.value;redrawSheet()}" aria-label="Every how many days"></span></label><label class="az-field"><span class="az-label">First feed</span><span class="az-input az-input--text"><input id="ls-from" type="date" value="${LS.cad.from}" onchange="if(this.value){LS.cad.from=this.value;redrawSheet()}" aria-label="First feed"></span></label></div><span class="hint">Next: ${nextFeeds({ cad: LS.cad }, 3).map(s => `${wday(s)} ${fmtDay(s)}`).join(' · ')}</span>`
    : select('Day of the month', LS.cad.monthly === 'last' ? 'Last day' : `Day ${LS.cad.monthly}`, `optionSheet('Day of the month',[...Array.from({length:28},(_,i)=>[i+1,'Day '+(i+1)]),['last','Last day']],LS.cad.monthly,'pickMonthDay')`));
  return { title: add ? 'Add item' : `Change ${esc(item(LS.item).name)}`, sub: add ? '' : bandText(feed(LS.feed)), form: true,
    body: (add ? select('Time', bandText(feed(LS.feed)), `optionSheet('Time',FEEDS.map(f=>[f.id,bandText(f)]),LS.feed,'pickLsFeed')`, { req: true }) : '')
    + select('Item', it ? it.name : '', 'pickItem()', { req: true, placeholder: 'Choose item' })
    + `<div class="az-field"><span class="az-label">${LS.cad ? 'Amount per feed' : 'Daily amount'}, per animal <span class="az-req">*</span></span>${amount}</div>`
    + `<div class="az-field"><span class="az-label">How often</span>${days}</div>`
    + `<div class="az-two">${select('Preparation', LS.prep, `optionSheet('Preparation',[['','None'],...PREPS.map(p=>[p,p])],LS.prep,'pickPrep')`, { placeholder: 'None' })}${select('Cut size', LS.cut, `optionSheet('Cut size',[['','None'],...CUTS.map(p=>[p,p])],LS.cut,'pickCut')`, { placeholder: 'None' })}</div>`
    + (st !== 'ok' ? `<div class="az-warnline">${I('warning', 20)}<span>${st === 'out' ? `<b>${esc(it.name)} is out of stock.</b>` : `<b>Only ${stockText(it)} ${esc(it.name)} in stock.</b> It needs ${need} a day.`}</span></div>` : ''),
    foot: `${left}<button class="az-btn"${ok ? '' : ' disabled'} onclick="saveLine()">${add ? 'Add' : diff || !LS.had ? 'Save change' : 'Undo change'}</button>` };
}
function pickPrep(v) { LS.prep = v; SH.pop(); redrawSheet(); }
function pickLsFeed(v) { LS.feed = +v; if (LS.to && itemsAt(LS.feed).has(LS.to)) LS.to = null; SH.pop(); redrawSheet(); }
function pickCut(v) { LS.cut = v; SH.pop(); redrawSheet(); }
function unitSheet() { optionSheet('Unit', unitsFor(item(LS.to)).map(u => [u, u]), LS.unit, 'pickUnit'); }
function pickUnit(u) { if (LS.unit !== u) { LS.qty = round(toBase(LS.qty || 0, LS.unit) / BASE[u][1]); LS.unit = u; } SH.pop(); redrawSheet(); }
function setRepeat(k) { LS.cad = k === 'week' ? null : k === 'every' ? { every: LS.cad && LS.cad.every || 10, from: LS.cad && LS.cad.from || TODAY } : { monthly: LS.cad && LS.cad.monthly || 1 }; redrawSheet(); }
function pickMonthDay(v) { LS.cad = { monthly: v === 'last' ? 'last' : +v }; SH.pop(); redrawSheet(); }
function setDays(i) { if (i < 0) LS.days = EVERY_DAY; else { const m = LS.days === EVERY_DAY ? 0 : LS.days; LS.days = m ^ (1 << i); } redrawSheet(); }
function stepQty(dir) { LS.qty = Math.max(0, round((+LS.qty || 0) + dir * STEP_BY[LS.unit])); redrawSheet(); }
function saveLine() {
  const d = S.draft, L = LS, c = { feed: L.feed, to: L.to, qty: L.qty, unit: L.unit, prep: L.prep, cut: L.cut, days: L.cad ? EVERY_DAY : L.days, cad: L.cad || null };
  if (L.mode === 'add') { if (L.was) d.changes = d.changes.filter(x => !(x.op === 'add' && x.feed === L.wasFeed && x.to === L.was)); setChange({ op: 'add', ...c }); return; }
  if (!Object.values(lineDiff(entryOf(diet(d.base), L.feed, L.item), c)).some(Boolean)) { undoChange(L.feed, L.item); return; }
  setChange({ op: 'change', item: L.item, ...c });
}
/* choose the item: search, then in stock and low stock */
let IP = { q: '' };
function pickItem() { IP = { q: '' }; openSheet(ipHtml, true); }
function ipHtml() {
  const n = animalsIn(S.draft).length, taken = itemsAt(LS.feed), q = IP.q.trim().toLowerCase();
  const list = D.items.filter(i => !taken.has(i.id) && (!q || i.name.toLowerCase().includes(q))).sort((a, b) => a.name.localeCompare(b.name));
  const ok = list.filter(i => stockFor(i, LS.qty, LS.unit, n) === 'ok'), low = list.filter(i => stockFor(i, LS.qty, LS.unit, n) !== 'ok');
  const chips = (h, xs, warn) => xs.length ? `<p class="cap">${h}</p><div class="itemchips">${xs.map(i => `<button class="${warn ? 'warn' : ''}" aria-pressed="${i.id === LS.to}" onclick="chooseItem(${i.id})">${esc(i.name)}</button>`).join('')}</div>` : '';
  return { title: 'Choose item', body: `<label class="az-search" style="background:var(--white)">${I('search', 20)}<input id="ip-q" placeholder="Search items" value="${esc(IP.q)}" oninput="IP.q=this.value;redrawSheet()" aria-label="Search items"></label>${chips('In stock', ok)}${chips('Low stock', low, true)}${list.length ? '' : '<div class="nodiet">No item matches</div>'}` };
}
function chooseItem(id) {
  const it = item(id), dim = BASE[it.unit][0];
  if (!LS.unit || BASE[LS.unit][0] !== dim) { LS.unit = dim; LS.qty = dim === 'pcs' ? 1 : dim === 'ml' ? 50 : 100; }
  if (LS.to !== id && LS.mode === 'add') { LS.prep = it.preps.find(p => PREPS.includes(p)) || ''; LS.cut = it.preps.find(p => CUTS.includes(p)) || ''; }
  LS.to = id; SH.pop(); redrawSheet();
}
/* which new diet */
function dietSec(d) {
  const list = D.diets.filter(x => x.sp === d.sp && x.id !== d.base);
  const pick = list.length ? list.map(x => `<button class="az-pickrow" role="radio" aria-checked="${d.diet === x.id}" onclick="S.draft.diet='${x.id}';render()"><span class="az-pickrow__t"><b>${esc(x.name)}</b><span>${KINDTYPE[x.type]}</span></span><span class="lnk" onclick="event.stopPropagation();dietSheet('${x.id}')">View</span>${I(d.diet === x.id ? 'radio_button_checked' : 'radio_button_unchecked', 24, d.diet === x.id)}</button>`).join('') : `<div class="az-hintline">${I('info', 18)}<span>There is no other diet for ${esc(species(d.sp).name)} yet.</span></div>`;
  return section('swap_horiz', 'Which new diet?', pick + (d.diet ? `<p class="cap">What changes</p>${linesView(dietDiffGroups(diet(d.base), diet(d.diet)))}` : ''), true);
}
/* no diet: which day, which feeds */
function skipSec(d) {
  const w = currentDiet(d), meals = w ? w.diet.meals : FEEDS.map(f => ({ feed: f.id, items: [] })), all = d.feeds === 'all', t1 = addDays(TODAY, 1);
  return section('event_busy', 'Which day and feeds?', `<div class="daychips"><button aria-pressed="${d.date === TODAY}" onclick="S.draft.date='${TODAY}';render()">Today · ${fmtDay(TODAY)}</button><button aria-pressed="${d.date === t1}" onclick="S.draft.date='${t1}';render()">Tomorrow · ${fmtDay(t1)}</button></div>
    <label class="az-field"><span class="az-label">Or pick a day</span><span class="az-input az-input--text">${I('calendar_month')}<input type="date" id="s-date" min="${TODAY}" value="${d.date}" onchange="if(this.value)S.draft.date=this.value;render()"></span></label>
    <div class="daychips"><button aria-pressed="${all}" onclick="S.draft.feeds='all';render()">All feeds</button>${meals.map(m => `<button aria-pressed="${!all && d.feeds.includes(m.feed)}" onclick="toggleFeed(${m.feed})">${bandText(feed(m.feed))}</button>`).join('')}</div>${skipView(asReq(d))}`, true);
}
function toggleFeed(f) { const d = S.draft, w = currentDiet(d), every = w ? w.diet.meals.map(m => m.feed) : FEEDS.map(x => x.id); let list = d.feeds === 'all' ? [] : [...d.feeds]; list = list.includes(f) ? list.filter(x => x !== f) : [...list, f].sort(); d.feeds = every.every(x => list.includes(x)) ? 'all' : list; render(); }
const whenSec = d => section('event', 'When and why', `<div class="az-two"><label class="az-field"><span class="az-label">Start <span class="az-req">*</span></span><span class="az-input az-input--text"><input type="date" id="p-start" min="${TODAY}" value="${d.start}" onchange="S.draft.start=this.value;render()"></span></label>
  <label class="az-field"><span class="az-label">End</span><span class="az-input az-input--text"${d.endMode === 'open' ? ' aria-disabled="true"' : ''}><input type="date" id="p-end" min="${d.start}" value="${d.endMode === 'open' ? '' : d.end}"${d.endMode === 'open' ? ' disabled' : ''} onchange="S.draft.end=this.value;render()"></span></label></div>
  <button class="az-checkrow" role="checkbox" aria-checked="${d.endMode === 'open'}" onclick="S.draft.endMode=S.draft.endMode==='open'?'date':'open';render()">${I(d.endMode === 'open' ? 'check_box' : 'check_box_outline_blank', 24, d.endMode === 'open')}No end date</button>` + reasonNote(d), true);
const reasonNote = d => select('Reason', d.reason, `optionSheet('Reason',REASONS[S.draft.kind].map(t=>[t,t]),S.draft.reason,'pickReason')`, { req: true })
  + `<label class="az-field"><span class="az-label">Note to kitchen (optional)</span><span class="az-input az-input--text az-textarea"><textarea id="d-note" rows="3" placeholder="Preparation, timing, serving" oninput="S.draft.note=this.value">${esc(d.note)}</textarea></span></label>`;
function pickReason(v) { S.draft.reason = v; closeAll(); render(); }
/* the department's own questions (DEPT_FORMS in data.js) */
function pickF(k, v) { S.draft.f[k] = v; closeAll(); render(); }
function deptSection(d) {
  const form = DEPT_FORMS[d.dept]; if (!form) return '';
  const field = x => {
    const v = d.f[x.k], lab = `${x.label}${x.req ? ' <span class="az-req">*</span>' : ''}`;
    if (x.type === 'select') return select(x.label, v, `optionSheet('${x.label}',${JSON.stringify(x.opts.map(o => [o, o])).replace(/"/g, '&quot;')},S.draft.f['${x.k}']||'','pickF.bind(null,\'${x.k}\')')`, { req: x.req });
    if (x.type === 'text') return `<label class="az-field"><span class="az-label">${lab}</span><span class="az-input az-input--text"><input id="f-${x.k}" placeholder="${esc(x.placeholder || '')}" value="${esc(v || '')}" oninput="S.draft.f['${x.k}']=this.value;redrawFoot()"></span></label>`;
    if (x.type === 'date') return `<label class="az-field"><span class="az-label">${lab}</span><span class="az-input az-input--text">${I('calendar_month')}<input type="date" id="f-${x.k}" min="${TODAY}" value="${v || ''}" onchange="S.draft.f['${x.k}']=this.value;render()"></span></label>`;
    if (x.type === 'money') return `<label class="az-field"><span class="az-label">${lab}</span><span class="az-input az-input--text"><span class="az-unit" style="margin:0">₹</span><input id="f-${x.k}" type="number" inputmode="decimal" min="0" placeholder="0" value="${v ?? ''}" oninput="S.draft.f['${x.k}']=this.value===''?null:+this.value;redrawFoot()"></span></label>`;
    if (x.type === 'switch') return `<button class="az-checkrow swrow" role="switch" aria-checked="${!!v}" onclick="S.draft.f['${x.k}']=!S.draft.f['${x.k}'];render()"><span class="grow">${x.label}</span><span class="az-switch" aria-checked="${!!v}"></span></button>`;
    if (x.type === 'items') { const items = d.f.items || [];
      return `<div class="az-field"><span class="az-label">${lab}</span>${items.map((it, i) => `<div class="itemrow"><span class="az-input az-input--text grow"><input id="f-it-${i}" placeholder="Item" value="${esc(it.name)}" oninput="S.draft.f.items[${i}].name=this.value;redrawFoot()" aria-label="Item ${i + 1}"></span><span class="az-input az-input--text itemrow__q"><input id="f-iq-${i}" type="number" min="1" value="${it.qty}" oninput="S.draft.f.items[${i}].qty=+this.value;redrawFoot()" aria-label="Quantity"></span>${items.length > 1 ? `<button class="az-iconbtn" onclick="S.draft.f.items.splice(${i},1);render()" aria-label="Remove item">${I('close')}</button>` : ''}</div>`).join('')}
        <button class="az-btn az-btn--add az-btn--compact" onclick="S.draft.f.items.push({name:'',qty:1});render()">${I('add')}Add another</button></div>`; }
    return '';
  };
  return section(dept(d.dept).icon, form.title, form.fields.map(field).join(''));
}
/* attachments (sample files in the prototype) */
const SAMPLE_FILES = [{ name: 'Vet note.pdf', kind: 'pdf', size: '320 KB' }, { name: 'Photo of the enclosure.jpg', kind: 'image', size: '1.4 MB' }, { name: 'Weight chart.xlsx', kind: 'doc', size: '42 KB' }];
function addFile() { const d = S.draft, f = SAMPLE_FILES.find(x => !d.files.some(y => y.name === x.name)); if (f) d.files.push(f); render(); }
const attachSec = d => section('attach_file', 'Add Attachments If Any', `${d.files.length ? `<div class="files">${d.files.map((f, i) => `<span class="file">${I(f.kind === 'image' ? 'image' : f.kind === 'pdf' ? 'picture_as_pdf' : 'description', 20)}${esc(f.name)}<button class="az-iconbtn" style="width:28px;height:28px" onclick="S.draft.files.splice(${i},1);render()" aria-label="Remove ${esc(f.name)}">${I('close', 18)}</button></span>`).join('')}</div>` : ''}
  <button class="az-upload" onclick="addFile()"><i class="az-i" aria-hidden="true">add_photo_alternate</i><b>Add photos or files</b><span>PDF, images or documents</span></button>`);
/* priority sits at the top right, as the Help Desk app: the Antz flag */
function prioSheet() { optionSheet('Priority', Object.entries(PRIO).map(([k, [, l]]) => [k, l, PRI_TEXT[k]]), S.draft.prio, 'pickFormPrio'); }
function pickFormPrio(v) { S.draft.prio = v; closeAll(); render(); }
function formFoot(d) { const e = err(d); return `<div class="az-actionbar"><button class="az-btn"${e ? ' disabled' : ''} onclick="submitDraft()">${d.edit ? 'Save and Submit' : 'Submit Request'}</button></div>`; }
function redrawFoot() { const f = $('#form-foot'); if (f && S.draft) f.innerHTML = formFoot(S.draft); }
function paneForm(q) {
  const d = initDraft(q), close = d.edit ? `#/requests/${d.edit}` : S.back;
  if (d.blocked) return pane('pane--fill', topbar({ back: close, title: 'Edit request' }), empty1('This request can no longer be edited'));
  if (d.ent) return paneEntity(d);
  const secs = [requestDetails(d)];
  if (d.dept === 'diet') {
    secs.push(dietPick(d));
    const ready = d.kind === 'skip' ? !!d.sp : byDiet(d) ? !!d.slot : d.kind === 'diet' && !!d.sp;
    if (ready && !(d.kind === 'items' && !d.base)) secs.push(d.kind === 'items' ? itemsSec(d) : d.kind === 'diet' ? dietSec(d) : skipSec(d));
    const changed = ready && (d.kind === 'items' ? d.changes.length : d.kind === 'diet' ? d.diet : true);
    if (changed) secs.push(d.kind === 'skip' ? section('label', 'Why', reasonNote(d), true) : whenSec(d));
  }
  if (DEPT_FORMS[d.dept]) secs.push(deptSection(d));
  secs.push(attachSec(d));
  const prio = `<button class="prio prio--${d.prio}" onclick="prioSheet()" aria-label="Priority: ${PRIO[d.prio][1]}" title="Priority: ${PRIO[d.prio][1]}">${d.prio === 'emergency' ? I('local_fire_department', 22, true) : PRIO[d.prio][0]}</button>`;
  return pane('pane--fill form-page', topbar({ back: close, title: d.edit ? `Edit ${d.edit}` : 'New Request', actions: prio }), `<div class="body">${secs.join('')}</div>`, `<div id="form-foot">${formFoot(d)}</div>`, `form-${d.key}`);
}
function submitDraft() {
  const d = S.draft;
  if (!d || d.blocked || err(d)) return;
  const fields = { dept: d.dept, title: titleOf(d).trim(), text: d.text.trim(), site: d.site, approver: d.approver, prio: d.prio, files: [...d.files], note: d.note.trim() };
  if (DEPT_FORMS[d.dept]) fields.f = { ...d.f, ...(d.f.items ? { items: d.f.items.filter(i => i.name.trim()) } : {}) };
  if (d.dept === 'diet') {
    Object.assign(fields, { kind: d.kind, sp: d.sp, level: d.level, ref: d.ref, reason: d.reason });
    if (d.kind === 'skip') Object.assign(fields, { date: d.date, feeds: d.feeds === 'all' ? 'all' : [...d.feeds] });
    else Object.assign(fields, { slot: byDiet(d) ? d.slot : null, base: d.base, start: d.start, end: d.endMode === 'open' ? null : d.end }, d.kind === 'items' ? { changes: d.changes.map(c => ({ ...c })) } : { diet: d.diet });
  }
  let r;
  if (d.edit) {
    r = by('requests', d.edit);
    if (!r || r.by !== S.user || !isOpen(r)) { toast(`Can't edit ${d.edit} now`); return; }
    const was = r.state;
    ['date', 'feeds', 'slot', 'base', 'start', 'end', 'changes', 'diet'].forEach(k => delete r[k]);
    Object.assign(r, fields, { state: 'pending', delay: null });
    r.events.push({ kind: 'edited', by: S.user, at: nowStamp(), note: was === 'delayed' ? 'Changed after the delay. Back for approval.' : '' });
  } else {
    r = { id: newRequestId(), ...fields, by: S.user, state: 'pending', events: [{ kind: 'raised', by: S.user, at: nowStamp() }] };
    D.requests.push(r);
  }
  S.draft = null; S.rTab = 'pending'; S.rDept = 'all'; storeSave();
  toast(`${d.edit ? 'Saved and sent' : 'Sent to ' + first(user(r.approver).name)} · ${r.id}`); go(`#/requests/${r.id}`);
}
