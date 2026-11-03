// js/form.js — Help Desk › New Request (and Edit, by the person who raised it while it is open), as the Help Desk app:
// Request Details (title, description, requested by, requesting to, site, approver) · Attachments · Submit Request, priority at the top right.
// When "Requesting to" is Diet (Dieticians only), the diet sections come in: what you need · which diet · for which animals · what should change · when · reason.
// Full screen on the phone, a window on the iPad.

const PREPS = ['Raw', 'Washed', 'Fresh', 'Peeled', 'Steamed', 'Boiled', 'Mashed', 'Soaked', 'Cooked'];
const CUTS = ['Whole', 'Halved', 'Chunks 5 cm', 'Cubes 2 cm', 'Diced 1 cm', 'Shredded', 'Leaves'];
const STEP_BY = { g: 10, kg: 0.1, ml: 10, ltr: 0.1, pcs: 1 };
/* a diet request is for targets: one per species and place, so it can be for many species, or many places of one species */
const EMPTY_DIET = { id: null, name: '', meals: [] };
const baseOf = d => (d.base && d.base !== 'many' && diet(d.base)) || EMPTY_DIET;
const noDiet = d => d.targets.some(t => !slotsOf(t.sp).length);
const deptsFor = u => DEPTS.filter(x => x.id !== 'diet' || canRaise(u));
/* the request as it would be sent; a group (females, an age, a weight) only on a whole species and only for a new diet */
function asReq(d) {
  const ts = d.targets.map(t => ({ sp: t.sp, level: t.level, ref: t.ref ?? null, group: d.kind === 'new' && t.level === 'species' ? d.group : null })), md = s => s ? s.slice(5) : s;
  return { id: d.edit || null, kind: d.kind, targets: ts, sp: ts.length ? ts[0].sp : null, level: ts.length ? ts[0].level : 'species', ref: ts.length ? ts[0].ref : null, base: d.base, changes: d.changes, rules: d.rules, diet: d.diet, ends: d.ends,
    how: d.how, start: d.how === 'yearly' ? md(d.start) : d.start, end: d.how === 'yearly' ? md(d.end) : d.end, stop: d.stop, date: d.date, feeds: d.feeds, name: d.nameEdited ? d.name : '', forAll: d.forAll, reason: d.reason };
}
const eatOf = d => eatNow(asReq(d).targets, TODAY, d.edit || null);
const topSlot = x => by('assigns', [...x.slots.entries()].sort((a, b) => b[1] - a[1])[0][0]);
const kindWord = a => a.start || a.end ? (a.recur ? 'Seasonal' : 'Time-bound') : 'Year-round';
/* what a request can end: a Seasonal, Time-bound, group or place diet inside its targets, never the species' base (Kitchen & Diet) */
const isBase = a => a.level === 'species' && !a.start && !a.end && !a.group;
const endable = d => D.assigns.filter(a => !ended(a) && !a.stop && !isBase(a) && d.targets.some(t => within(t, a))).sort((x, y) => LEVELS.indexOf(x.level) - LEVELS.indexOf(y.level) || kindRank(x) - kindRank(y));
/* keep the draft true to the rules after its targets or its kind change */
function sync(d) {
  if (!noDiet(d) && d.want && d.kind !== d.want && !(d.want === 'end' && !endable(d).length)) d.kind = d.want;
  if (noDiet(d)) { if (!['new', 'diet'].includes(d.kind)) d.kind = 'new'; d.how = 'always'; d.group = null; d.targets = d.targets.map(t => ({ sp: t.sp, level: 'species', ref: null })).filter((t, i, a) => a.findIndex(x => x.sp === t.sp) === i); }
  if (!d.targets.some(t => t.level === 'species')) d.group = null;
  const ids = eatOf(d).list.map(e => e.diet.id), was = d.base;
  if (d.kind === 'items' && d.base !== 'many' && !ids.includes(d.base)) d.base = ids.length > 1 && new Set(d.targets.map(t => t.sp)).size > 1 ? 'many' : ids[0] || null;
  if (d.kind === 'items' && d.base === 'many' && ids.length < 2) d.base = ids[0] || null;
  if (d.kind === 'new') { if (d.startFrom === 'now' && !ids.length) d.startFrom = 'empty'; if (d.startFrom === 'now') d.base = ids[0]; if (d.startFrom === 'empty') d.base = null; }
  if (d.kind === 'diet') d.base = ids[0] || null;
  if (d.base !== was && d.kind !== 'diet') d.changes = [];
  if (d.kind === 'end') { const ok = endable(d).map(a => a.id); d.ends = d.ends.filter(id => ok.includes(id)); if (!d.ends.length && ok.length === 1) d.ends = [ok[0]]; }
  if (d.targets.length) { const t = d.targets[0], p = pathOf(t); d.site = p.site || (d.site && spAnimals(t.sp, d.site).length ? d.site : pathOfAnimal(spAnimals(t.sp)[0]).site); }
}
function pickKind(k) { const d = S.draft; d.want = k; if (d.kind !== k) { d.reach = 0; Object.assign(d, { kind: k, changes: [], rules: [], diet: null, ends: [], base: null, startFrom: 'now' }); sync(d); } render(); }

/* ---------- the draft ---------- */
function initDraft(q) {
  const editId = q.get('edit'), asg = q.get('asg'), dq = q.get('dept'), spq = +q.get('sp') || null, kq = q.get('kind'), key = [S.user, editId || 'new', asg || '', dq || '', spq || '', kq || ''].join(':');
  if (S.draft && S.draft.key === key) return S.draft;
  const blank = { key, edit: null, dept: null, f: {}, title: '', titleEdited: false, text: '', site: null, approver: null, prio: 'normal', files: [],
    kind: 'items', targets: [], group: null, base: null, startFrom: 'now', changes: [], rules: [], diet: null, ends: [], how: 'once', start: addDays(TODAY, 1), end: addDays(TODAY, 14), stop: addDays(TODAY, 1),
    date: TODAY, feeds: 'all', reason: null, note: '', name: '', nameEdited: false, forAll: null };
  if (editId) {
    const r = by('requests', editId);
    if (!r || r.by !== S.user || !isOpen(r)) return (S.draft = { key, blocked: true });
    const d = { ...blank, edit: r.id, dept: r.dept, f: JSON.parse(JSON.stringify(r.f || {})), title: r.title, titleEdited: true, text: r.text, site: r.site, approver: r.approver, prio: r.prio, files: [...(r.files || [])], note: r.note || '' };
    if (isDiet(r)) {
      const ts = targetsOf(r), full = s => s && s.length === 5 ? nextMd(s) : s;
      Object.assign(d, { kind: r.kind, targets: ts.map(t => ({ sp: t.sp, level: t.level, ref: t.ref ?? null })), group: (ts[0] || {}).group || null, base: r.base || null, changes: (r.changes || []).map(c => ({ ...c })), rules: (r.rules || []).map(u => ({ ...u })),
        diet: r.diet || null, ends: [...(r.ends || [])], how: r.how || 'once', start: full(r.start) || d.start, end: full(r.end) || d.end, stop: r.stop || d.stop, date: r.date || TODAY, feeds: r.feeds === 'all' || !r.feeds ? 'all' : [...r.feeds],
        reason: r.reason, name: r.name || '', nameEdited: !!r.name, forAll: r.forAll || null });
      if (d.how === 'yearly' && d.end < d.start) d.end = `${+d.end.slice(0, 4) + 1}${d.end.slice(4)}`;
      if (r.kind === 'new') d.startFrom = !r.base ? 'empty' : (eatOf(d).list[0] || { diet: {} }).diet.id === r.base ? 'now' : 'other';
      d.step = d.reach = stepsOf(d).length - 1;
    }
    return (S.draft = d);
  }
  const d = (S.draft = blank);
  if (dq && deptsFor(me()).some(x => x.id === dq)) setDept(dq, false);
  const a = asg && by('assigns', asg);
  if (a && d.dept === 'diet') { d.targets = [{ sp: a.sp, level: a.level, ref: a.ref ?? null }]; d.base = a.diet; sync(d); }
  else if (spq && d.dept === 'diet' && by('species', spq)) { d.targets = [{ sp: spq, level: 'species', ref: null }]; if (KTABS.some(([k]) => k === kq)) d.kind = kq; sync(d); }
  d.fixed = d.dept === 'diet' && !!(a || spq);
  return d;
}
/* a diet request is ready to say what it does once it has its change */
const ready = d => !!d.targets.length && !!(d.kind === 'items' ? (d.base === 'many' ? d.rules.length : d.changes.length) : d.kind === 'new' ? applyChanges(baseOf(d).meals, d.changes).length : d.kind === 'diet' ? d.diet : d.kind === 'end' ? d.ends.length : true);
const dietNameOf = d => d.nameEdited ? d.name : ((planOf(asReq(d)).ops.find(o => o.type === 'new') || {}).name || '');
/* a diet request suggests its own title until the person types one */
const titleOf = d => d.titleEdited || d.dept !== 'diet' ? d.title : ready(d) ? autoTitle(asReq(d)) : '';
function err(d) {
  if (!d.dept) return 'Choose the department';
  if (d.dept === 'diet') {
    if (!d.targets.length) return 'Choose the species';
    if (d.kind === 'items' && d.base !== 'many' && !d.base) return 'There is no diet here to change';
    if (d.kind === 'items' && d.base !== 'many' && !d.changes.length) return 'Change at least one item';
    if (d.kind === 'items' && d.base === 'many' && !d.rules.length) return 'Add at least one item change';
    if (d.kind === 'new' && d.startFrom === 'other' && !d.base) return 'Choose the diet to start from';
    if (d.kind === 'new' && !applyChanges(baseOf(d).meals, d.changes).length) return 'Add at least one item';
    if (d.kind === 'new' && !dietNameOf(d).trim()) return 'Name the diet';
    if (d.kind === 'new' && d.group && d.group.kind !== 'sex' && !(d.group.min >= 0 && (d.group.max == null || d.group.max > d.group.min))) return 'Check the age or weight range';
    if (d.kind === 'diet' && !d.diet) return 'Choose the diet to use';
    if (d.kind === 'end' && !d.ends.length) return 'Choose the diet to end';
    if (d.kind === 'end' && (!d.stop || d.stop < TODAY)) return 'Check the last day';
    if (d.kind === 'end' && d.ends.some(id => { const a = by('assigns', id); return !a.recur && a.end && d.stop >= a.end; })) return 'Check the last day: pick one before it ends';
    if (d.kind === 'skip' && (d.date < TODAY || (d.feeds !== 'all' && !d.feeds.length))) return 'Choose the day and the feeds';
    if (['items', 'new', 'diet'].includes(d.kind) && d.how === 'once' && (!d.start || d.start < TODAY || !d.end || d.end <= d.start)) return 'Check the dates';
    if (['items', 'new', 'diet'].includes(d.kind) && d.how === 'yearly' && (!d.start || !d.end || d.start.slice(5) === d.end.slice(5))) return 'Check the dates';
    const p = planOf(asReq(d));
    if (p.block) return p.block;
    if (p.shared && !d.forAll) return 'Choose who gets the change';
    if (!d.reason) return 'Choose a reason';
  }
  const form = DEPT_FORMS[d.dept];
  if (form) for (const x of form.fields) if (x.req && !(x.type === 'items' ? (d.f.items || []).some(i => i.name.trim() && i.qty > 0) : d.f[x.k])) return `Add ${x.label.toLowerCase()}`;
  if (!titleOf(d).trim()) return 'Add a title';
  if (d.dept !== 'diet' && d.text.trim().length < 5) return 'Add a description';
  if (!d.site) return 'Choose the site';
  if (!d.approver) return 'Add the approver';
  return '';
}

/* ---------- form parts (Antz fields: labels above, 56 tall) ---------- */
const section = (icon, title, body, req = false) => `<section class="az-section"><h2 class="az-section__title">${I(icon, 20)}<span class="grow">${title}${req ? '<span class="az-req">*</span>' : ''}</span></h2>${body}</section>`;
const select = (label, value, js, { req = false, placeholder = 'Select', disabled = false, icon = 'keyboard_arrow_down', id = '' } = {}) => `<div class="az-field">${label ? `<span class="az-label">${label}${req ? ' <span class="az-req">*</span>' : ''}</span>` : ''}<button${id ? ` id="${id}"` : ''} class="az-input az-input--select${value ? '' : ' az-input--placeholder'}" ${disabled ? 'aria-disabled="true" disabled' : `onclick="${js}"`}><span class="grow">${value ? esc(value) : placeholder}</span>${I(icon, 24)}</button></div>`;
const personCard = (id, remove = '') => { const u = user(id); return `<div class="az-picked">${avatar(u.name)}<span class="grow"><span class="az-who__name">${youName(id)}</span><span class="az-who__sub">${esc(u.title)}</span></span>${remove ? `<button class="az-iconbtn" onclick="${remove}" aria-label="Remove ${esc(u.name)}" style="color:var(--Tertiary)">${I('cancel')}</button>` : ''}</div>`; };
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
const askFields = d => `<span class="az-label">What are you requesting?</span>
    <label class="az-input az-input--text"><input id="f-title" placeholder="Title" value="${esc(titleOf(d))}" oninput="S.draft.title=this.value;S.draft.titleEdited=true;redrawFoot()" aria-label="Title"></label>
    <label class="az-input az-input--text az-textarea"><textarea id="f-text" rows="4" placeholder="Description / Justification" oninput="S.draft.text=this.value;redrawFoot()" aria-label="Description or justification">${esc(d.text)}</textarea></label>`;
function requestDetails(d) {
  const deptName = d.dept ? dept(d.dept).name : '', to = select('Requesting to', deptName, 'deptSheet()', { placeholder: 'Select department', disabled: !!d.edit });
  /* a diet request: who sends it, from which site and who approves are fixed, so they move to Your request at the end (owner, 3 Nov: "think more") */
  if (d.dept === 'diet') return d.fixed || d.edit ? '' : section('category', 'Requesting to', select('', deptName, 'deptSheet()'), true);
  return section('category', 'Request details', `${to}
    ${askFields(d)}
    <div class="az-field"><span class="az-label">Requested by</span>${personCard(S.user)}</div>
    ${d.site ? `<div class="az-field"><span class="az-label">Requesting site</span><div class="az-site az-site--picked"><span class="az-site__thumb" style="display:grid;place-items:center;color:var(--Outline)">${I('location_on', 20)}</span><span class="grow"><span class="az-site__name">${esc(by('sites', d.site).name)}</span></span>${d.dept === 'diet' && d.targets.length ? '' : `<button class="az-iconbtn" onclick="S.draft.site=null;render()" aria-label="Remove site">${I('cancel')}</button>`}</div></div>`
      : select('Requesting site', '', `optionSheet('Requesting site',D.sites.map(s=>[s.id,s.name]),S.draft.site,'pickReqSite')`, { placeholder: 'Choose site', icon: 'add_circle' })}
    ${d.approver ? `<div class="az-field"><span class="az-label">To be approved by</span>${personCard(d.approver, d.dept === 'diet' ? '' : 'S.draft.approver=null;render()')}</div>`
      : select('To be approved by', '', `optionSheet('To be approved by',D.users.filter(u=>u.id!==S.user&&!VIEWERS.includes(u.id)||u.id==='u-suresh').map(u=>[u.id,u.name,u.title]),S.draft.approver,'pickApprover')`, { placeholder: 'Add approver', icon: 'add_circle' })}`, true);
}
/* What do you want to do: the design system's choice tiles. A species with no diet starts with a whole-species Year-round diet
   (Kitchen & Diet's base-first rule), so only New diet and Use another diet are open for it */
const KTABS = [['items', 'Change items', 'Add, stop or change items in what they eat'], ['new', 'New diet', 'A diet for a species, a place or a group'], ['diet', 'Use another diet', 'Move them to a diet that already exists'],
  ['end', 'End a diet early', 'Stop a Seasonal, Time-bound or place diet'], ['skip', 'No feed on a day', 'A note to the kitchen; no diet changes']];
function kindTiles(d) {
  const none = noDiet(d), noEnd = !!d.targets.length && !endable(d).length;
  return section('checklist', 'What do you want to do?', `<div class="az-tiles ktiles" role="radiogroup" aria-label="What do you want to do?">${KTABS.map(([k, l, sub]) => {
    const locked = (none && !['new', 'diet'].includes(k)) || (k === 'end' && noEnd), on = d.kind === k && !locked;
    const say = locked ? (none ? 'No diet yet' : 'Nothing to end here') : none && k === 'new' ? 'Start with a Year-round diet for the whole species' : none && k === 'diet' ? "Start with another species' diet" : sub;
    return `<button class="az-tile${locked ? ' az-tile--locked' : ''}" role="radio" aria-checked="${on}" ${locked ? 'aria-disabled="true" disabled' : `onclick="pickKind('${k}')"`}><span class="az-tile__t"><b>${l}</b><span>${say}</span></span>${I(locked ? 'lock' : on ? 'radio_button_checked' : 'radio_button_unchecked', 24, on)}</button>`; }).join('')}</div>`, true);
}

/* ---------- For: the targets. Species are chosen many at a time (search, class, select all); each one is the whole species or one place ---------- */
let SPQ = '', SPC = 'all', SPSEL = new Set();
const SP_CLS = ['all', 'Mammalia', 'Aves', 'Reptilia', 'Other'];
const clsOf = s => ['Mammalia', 'Aves', 'Reptilia'].includes(s.cls) ? s.cls : 'Other';
const spShown = () => { const q = SPQ.trim().toLowerCase(); return D.species.filter(s => (SPC === 'all' || clsOf(s) === SPC) && (!q || s.name.toLowerCase().includes(q) || s.sci.toLowerCase().includes(q) || String(s.id).includes(q))).sort((a, b) => a.name.localeCompare(b.name)); };
function spMultiSheet() {
  SPQ = ''; SPC = 'all'; SPSEL = new Set(S.draft.targets.map(t => t.sp));
  openSheet(() => {
    const list = spShown(), all = list.length > 0 && list.every(s => SPSEL.has(s.id)), n = SPSEL.size;
    return { title: 'Species', sub: n ? `${plural(n, 'species', 'species')} chosen` : '', bottom: true,
      body: `<label class="az-search sheet-search">${I('search', 20)}<input id="spq-f" placeholder="Search species or taxonomy ID" value="${esc(SPQ)}" oninput="SPQ=this.value;redrawSheet()" aria-label="Search species"></label>`
        + `<div class="az-chips sheet-chips" role="tablist" aria-label="Class">${SP_CLS.map(c => `<button class="az-chip" role="tab" aria-selected="${SPC === c}" onclick="SPC='${c}';redrawSheet()">${c === 'all' ? 'All' : c}</button>`).join('')}</div>`
        + (list.length ? `<button class="az-checkrow spall" role="checkbox" aria-checked="${all}" onclick="spAll()">${I(all ? 'check_box' : 'check_box_outline_blank', 24, all)}Select all ${list.length}</button>`
          + list.map(s => { const on = SPSEL.has(s.id), k = slotsOf(s.id).length;
            return `<button class="sprow" role="checkbox" aria-checked="${on}" onclick="spToggle(${s.id})">${spThumb(s)}<span class="sprow__t"><b>${esc(s.name)}</b><span class="sub sci">${esc(s.sci)}</span><span class="meta">${s.cls} · ${k ? plural(k, 'diet') : 'No diet'}</span></span>${I(on ? 'check_box' : 'check_box_outline_blank', 24, on)}</button>`; }).join('')
          : '<div class="nodiet">No species matches</div>'),
      foot: `<button class="az-btn"${n ? '' : ' disabled'} onclick="spDone()">Done${n ? ` · ${plural(n, 'species', 'species')}` : ''}</button>` };
  });
  setTimeout(() => { const i = document.getElementById('spq-f'); if (i && !matchMedia('(pointer: coarse)').matches) i.focus(); }, 60);
}
function spToggle(id) { if (SPSEL.has(id)) SPSEL.delete(id); else SPSEL.add(id); redrawSheet(); }
function spAll() { const list = spShown(), all = list.every(s => SPSEL.has(s.id)); list.forEach(s => all ? SPSEL.delete(s.id) : SPSEL.add(s.id)); redrawSheet(); }
function spDone() { const d = S.draft; d.targets = d.targets.filter(t => SPSEL.has(t.sp)); SPSEL.forEach(sp => { if (!d.targets.some(t => t.sp === sp)) d.targets.push({ sp, level: 'species', ref: null }); }); closeAll(); sync(d); render(); }
function dropTarget(i) { const d = S.draft; d.targets.splice(i, 1); sync(d); render(); if (SH.length) redrawSheet(); }
function addPlace() { const sps = [...new Set(S.draft.targets.map(t => t.sp))]; if (sps.length === 1) return entOpen(-1, sps[0]); optionSheet('Which species?', sps.map(sp => [sp, species(sp).name]), '', 'addPlaceFor'); }
function addPlaceFor(v) { closeAll(); entOpen(-1, +v); }
const tWhere = t => t.level === 'species' ? 'Whole species' : `${LEVEL[t.level]} · ${targetName(t)}`;
function tRow(d, t, i) {
  const sp = species(t.sp), n = tAnimals(t).length, fixed = noDiet(d);
  return `<div class="forrow forrow--t"><button class="forrow__main" onclick="entOpen(${i})"${fixed ? ' disabled' : ''}>${spThumb(sp)}<span class="grow"><b>${esc(sp.name)}</b><small>${esc(tWhere(t))} · ${plural(n, 'animal')}</small></span>${fixed ? '' : '<span class="lnk">Change</span>'}</button>${d.targets.length > 1 ? `<button class="az-iconbtn" onclick="dropTarget(${i})" aria-label="Remove ${esc(sp.name)}">${I('close', 20)}</button>` : ''}</div>`;
}
function targetsSheet() { openSheet(() => ({ title: 'For', sub: plural(S.draft.targets.length, 'place'), bottom: true, body: `<div class="forcard">${S.draft.targets.map((t, i) => tRow(S.draft, t, i)).join('')}</div>` })); }
/* the For card: the targets (three, then View all), add a species or a place, Only for (a new diet on a whole species), and what they eat today */
function forSec(d) {
  if (!d.targets.length) return section('restaurant', 'For', select('Species', '', 'spMultiSheet()', { req: true, placeholder: 'Choose species', id: 'f-sp' }), true);
  const ts = d.targets, few = ts.length > 4 ? ts.slice(0, 3) : ts, none = noDiet(d);
  const more = few.length < ts.length ? `<button class="forrow forrow--more" onclick="targetsSheet()"><span class="eav">${I('more_horiz', 22)}</span><span class="grow"><b>${ts.length - 3} more ${ts.slice(3).every(t => t.level === 'species') ? 'species' : ts.length === 4 ? 'place' : 'places'}</b><small>${esc(placesText(ts))} in all</small></span><span class="lnk">View all</span></button>` : '';
  const add = `<div class="foradd"><button class="lnk" onclick="spMultiSheet()">${I('add', 20)}Species</button>${none ? '' : `<button class="lnk" onclick="addPlace()">${I('add', 20)}Place or animal</button>`}</div>`;
  const grp = d.kind === 'new' && !none && ts.some(t => t.level === 'species') ? groupRow(d) : '';
  return section('restaurant', 'For', `<div class="forcard">${few.map((t, i) => tRow(d, t, i)).join('')}${more}${add}${grp}${eatRow(d)}</div>${dupNote(d)}`, true);
}
const dupNote = d => { const open = D.requests.filter(r => isDiet(r) && isOpen(r) && r.id !== d.edit && targetsOf(r).some(x => d.targets.some(t => samePlace(x, t)))); return open.length ? `<div class="az-warnline">${I('info', 18)}<span>Already open here: ${open.map(r => `<a class="lnk" href="#/requests/${r.id}">${r.id}</a>`).join(', ')}</span></div>` : ''; };
/* Only for: a new diet on a whole species can be for the females, the males, an age or a weight (Kitchen & Diet: species level only) */
const GROUP_OPTS = [['all', 'All animals'], ['F', 'Females'], ['M', 'Males'], ['age', 'An age group'], ['weight', 'A weight group']];
const groupOf = (kind, min, max) => { const u = kind === 'age' ? 'months' : 'kg'; return { kind, min, max, label: max == null ? `${min} ${u} and over` : `${min}–${max} ${u}` }; };
function groupRow(d) {
  const g = d.group, v = !g ? 'all' : g.kind === 'sex' ? g.sex : g.kind, u = g && g.kind === 'age' ? 'months' : 'kg';
  const num = (lab, k, val) => `<label class="az-field"><span class="az-label">${lab} (${u})</span><span class="az-input az-input--text"><input id="g-${k}" type="number" min="0" inputmode="decimal" value="${val ?? ''}" onchange="setRange('${k}',this.value)" aria-label="${lab}"></span></label>`;
  return `<div class="forrow forrow--pick">${select('Only for', GROUP_OPTS.find(o => o[0] === v)[1], `optionSheet('Only for',${JSON.stringify(GROUP_OPTS).replace(/"/g, '&quot;')},'${v}','pickGroup')`)}${g && g.kind !== 'sex' ? `<div class="az-two">${num('From', 'min', g.min)}${num('To, optional', 'max', g.max)}</div>` : ''}</div>`;
}
function pickGroup(v) { const d = S.draft; d.group = v === 'all' ? null : v === 'F' || v === 'M' ? { kind: 'sex', sex: v, label: v === 'F' ? 'Female' : 'Male' } : groupOf(v, v === 'age' ? 0 : 9, v === 'age' ? 12 : null); closeAll(); render(); }
function setRange(k, v) { const g = S.draft.group; g[k] = v === '' ? null : +v; if (g.min == null) g.min = 0; Object.assign(g, groupOf(g.kind, g.min, g.max)); render(); }
/* what they eat today, the Kitchen & Diet way (each animal: the diet of the narrowest place with one); for a change, the diet it changes */
function eatRow(d) {
  const e = eatOf(d), N = e.n, top = e.list[0], dav = `<span class="davatar">${I('restaurant')}</span>`;
  const row = (js, name, sub, end, id = '') => `<button class="forrow"${id ? ` id="${id}"` : ''} onclick="${js}">${dav}<span class="grow"><b>${esc(name)}</b><small>${esc(sub)}</small></span>${end}</button>`;
  if (!top) return `<div class="forrow forrow--static"><span class="davatar davatar--none">${I('no_meals')}</span><span class="grow"><b>No diet yet</b><small>${plural(N, 'animal')}</small></span></div>`;
  if (d.kind === 'items') {
    if (d.base === 'many') return row('changeDietSheet()', 'All their diets', `Diets to change · ${plural(e.list.length, 'diet')}, changed by item`, '<span class="lnk">Change</span>', 'f-from');
    const x = e.list.find(z => z.diet.id === d.base) || top;
    return row(e.list.length > 1 ? 'changeDietSheet()' : 'eatSheet()', x.diet.name, `Diet to change · ${x.animals.length} of ${N} eat it · set for ${whereSet(topSlot(x))}`, e.list.length > 1 ? '<span class="lnk">Change</span>' : I('chevron_right', 20), 'f-from');
  }
  if (d.kind === 'end') { const es = d.ends.map(id => by('assigns', id)).filter(Boolean);
    return row('endSheet()', es.length ? (es.length === 1 ? diet(es[0].diet).name : plural(es.length, 'diet')) : 'Choose the diet', es.length ? `Diet to end · ${es.slice(0, 2).map(slotText).join(' · ')}` : `${plural(endable(d).length, 'diet')} can end here`, '<span class="lnk">Change</span>', 'f-from'); }
  return row('eatSheet()', top.diet.name, `What they eat today · ${top.animals.length} of ${N}${e.list.length > 1 ? ` · ${plural(e.list.length - 1, 'other diet')}` : ''}`, '<span class="lnk">View</span>');
}
const animalChips = (as, max = 40) => `<div class="echips">${as.slice(0, max).map(a => `<span class="echip">${esc(animalName(a))} · ${esc(by('enclosures', a.enc).name)}</span>`).join('')}${as.length > max ? `<span class="echip">+${as.length - max} more</span>` : ''}</div>`;
const eatGrp = (lead, name, sub, tag, as) => `<div class="eatgrp"><div class="eatgrp__h">${lead}<span class="grow"><b>${esc(name)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span>${tag}<b class="eatgrp__n">${as.length}</b></div>${animalChips(as)}</div>`;
function eatSheet() {
  openSheet(() => { const d = S.draft, e = eatOf(d);
    return { title: 'What they eat today', sub: esc(placesText(d.targets)), bottom: true,
      body: e.list.map(x => eatGrp(`<span class="davatar">${I('restaurant')}</span>`, x.diet.name, `Set for ${whereSet(topSlot(x))}`, ktag(kindWord(topSlot(x))), x.animals)).join('')
        + (e.none.length ? eatGrp(`<span class="davatar davatar--none">${I('no_meals')}</span>`, 'No diet', '', '', e.none) : '') };
  });
}
function changeDietSheet() {
  openSheet(() => { const d = S.draft, e = eatOf(d), N = e.n;
    const opt = (v, name, sub, tag = '') => `<button class="az-pickrow" role="radio" aria-checked="${d.base === v}" onclick="pickBase('${v}')"><span class="az-pickrow__t"><b>${esc(name)}</b><span>${esc(sub)}</span></span>${tag}${I(d.base === v ? 'radio_button_checked' : 'radio_button_unchecked', 24, d.base === v)}</button>`;
    return { title: 'Which diet to change?', sub: esc(placesText(d.targets)), pick: true,
      body: e.list.map(x => opt(x.diet.id, x.diet.name, `${x.animals.length} of ${N} eat it · set for ${whereSet(topSlot(x))}`, ktag(kindWord(topSlot(x))))).join('')
        + (e.list.length > 1 ? opt('many', 'All their diets', `${plural(e.list.length, 'diet')} · say the change once, by item`) : '') };
  });
}
function pickBase(v) { const d = S.draft; if (d.base !== v) { d.base = v; d.changes = []; d.rules = []; } closeAll(); render(); }
function endSheet() {
  openSheet(() => { const d = S.draft, list = endable(d);
    return { title: 'Which diet ends?', sub: esc(placesText(d.targets)), pick: true,
      body: list.map(a => { const on = d.ends.includes(a.id);
        return `<button class="az-pickrow" role="checkbox" aria-checked="${on}" onclick="toggleEnd('${a.id}')"><span class="az-pickrow__t"><b>${esc(diet(a.diet).name)}</b><span>Set for ${esc(whereSet(a))}${slotWhen(a) ? ' · ' + esc(slotWhen(a)) : ''}</span><span>${plural(followersOf(a).length, 'animal')}</span></span>${ktag(kindWord(a))}${I(on ? 'check_box' : 'check_box_outline_blank', 24, on)}</button>`; }).join(''),
      foot: `<button class="az-btn" onclick="closeAll();render()">Done</button>` };
  });
}
function toggleEnd(id) { const d = S.draft; d.ends = d.ends.includes(id) ? d.ends.filter(x => x !== id) : [...d.ends, id]; redrawSheet(); }

/* ---------- the entity page (as the Item requests form): search, the site, then Section › Enclosure › Animal, Done. It sets one target ---------- */
const entPool = e => D.animals.filter(a => a.sp === e.sp);
function entOpen(i, sp = null) {
  const d = S.draft, t = i >= 0 ? d.targets[i] : { sp, level: 'species', ref: null };
  d.ent = { i, sp: t.sp, ...(t.level === 'species' ? {} : pathOf(t)), lock: {}, q: '' };
  if (!d.ent.site) { const sites = placesUnder(t.sp, 'site', {}, entPool(d.ent)); if (sites.length === 1) { d.ent.site = sites[0].id; d.ent.autoSite = true; } }
  closeAll(); render();
}
function entBack() { S.draft.ent = null; render(); }
function entSet(o) {
  const e = S.draft.ent, deepest = ['animal', 'enclosure', 'section', 'site'].find(l => o[l]);
  if (deepest) Object.assign(e, pathOf({ sp: e.sp, level: deepest, ref: o[deepest] }));
  if (o.site) e.autoSite = false;
  Object.assign(e, o); closeAll(); render();
}
function entDone() {
  const d = S.draft, e = d.ent; let l = ['animal', 'enclosure', 'section', 'site'].find(k => e[k]);
  if (l === 'site' && e.autoSite) l = null;
  const t = { sp: e.sp, level: l || 'species', ref: l ? e[l] : null };
  if (e.i >= 0) d.targets[e.i] = t; else if (!d.targets.some(x => samePlace(x, t))) d.targets.push(t);
  d.ent = null; sync(d); render();
}
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
function entSheet(l) {
  const d = S.draft, e = d.ent, pool = entPool(e), opts = placesUnder(e.sp, l, entWithin(e, l), pool);
  openSheet(() => ({ title: `Select ${LEVEL[l]}`, sub: [e.enclosure && l === 'animal' ? `Encl: ${placeOf('enclosure', e.enclosure).name}` : '', e.section && l !== 'section' && l !== 'site' ? `Sec: ${placeOf('section', e.section).name}` : '', e.site && l !== 'site' ? `Site: ${placeOf('site', e.site).name}` : ''].filter(Boolean).join(' · '), bottom: true,
    body: l === 'animal' ? opts.map(o => `<button class="epick" onclick="entSet({animal:${o.id}})">${animalCard(by('animals', o.id))}</button>`).join('')
      : opts.map(o => pcardBtn(l, o.id, pool, `entSet({${l}:${o.id}${LEVELS.slice(LEVELS.indexOf(l) + 1).map(k => `,${k}:null`).join('')}})`, e[l] === o.id)).join('') }));
}
function paneEntity(d) {
  const e = d.ent, pool = entPool(e), q = e.q.trim().toLowerCase(), sites = placesUnder(e.sp, 'site', {}, pool), sp = species(e.sp);
  const search = `<div class="az-searchrow"><label class="az-search">${I('search', 20)}<input id="ent-q" placeholder="Search animal, enclosure, section" value="${esc(e.q)}" oninput="S.draft.ent.q=this.value;render()" aria-label="Search animal, enclosure or section"></label><button class="az-scanbtn" onclick="toast('Scan an enclosure or animal QR')" aria-label="Scan QR">${I('qr_code_scanner', 22)}</button></div>`;
  let body;
  if (q) {
    const secs = placesUnder(e.sp, 'section', {}, pool).filter(o => o.name.toLowerCase().includes(q)), encs = placesUnder(e.sp, 'enclosure', {}, pool).filter(o => o.name.toLowerCase().includes(q));
    const ans = pool.filter(a => `${animalName(a)} ${a.id}`.toLowerCase().includes(q));
    const pick = (l, id) => { const p = pathOf({ sp: e.sp, level: l, ref: id }); return `entSet({site:${p.site || 'null'},section:${p.section || 'null'},enclosure:${p.enclosure || 'null'},animal:${p.animal || 'null'},q:''})`; };
    body = !secs.length && !encs.length && !ans.length ? `<div class="nodiet">Nothing called “${esc(e.q)}”. Try another name, or choose step by step.</div>`
      : (secs.length ? `<p class="cap">Sections</p>${secs.map(o => pcardBtn('section', o.id, pool, pick('section', o.id))).join('')}` : '')
      + (encs.length ? `<p class="cap">Enclosures</p>${encs.map(o => pcardBtn('enclosure', o.id, pool, pick('enclosure', o.id))).join('')}` : '')
      + (ans.length ? `<p class="cap">Animals</p>${ans.map(a => `<button class="epick" onclick="${pick('animal', a.id)}">${animalCard(a)}</button>`).join('')}` : '');
  } else {
    const site = e.site ? placeOf('site', e.site) : null, step = (l, opt) => {
      const v = e[l], deeper = LEVELS.slice(LEVELS.indexOf(l) + 1).some(k => e[k]);
      if (v) { const clear = deeper ? '' : `<button onclick="entSet({${l}:null${LEVELS.slice(LEVELS.indexOf(l) + 1).map(k => `,${k}:null`).join('')}})">Clear</button>`;
        return `<div class="ebox"><div class="ebox__h"><span>Selected ${LEVEL[l]}</span>${clear}</div>${l === 'animal' ? animalCard(by('animals', v)) : `<div class="ebox__card">${placeCard2(l, v, pool)}</div>`}</div>`; }
      return `<button class="az-input az-input--select az-input--placeholder" onclick="entSheet('${l}')"><span class="grow">Select ${LEVEL[l]}${opt ? ' (optional)' : ''}</span>${I('keyboard_arrow_down')}</button>`;
    };
    body = `<p class="cap">Site</p>${sites.length > 1 ? `<button class="esite" onclick="entSheet('site')">${I('near_me', 22)}<span class="grow">${site ? esc(site.name) : 'All sites'}</span>${I('keyboard_arrow_down')}</button>` : `<div class="esite esite--fixed">${I('near_me', 22)}<span class="grow">${esc((site || placeOf('site', sites[0].id)).name)}</span></div>`}
      <p class="cap">Choose Section, Enclosure or Animal</p>${step('section')}${e.section ? step('enclosure') : ''}${e.enclosure ? step('animal', true) : ''}`;
  }
  let l = ['animal', 'enclosure', 'section', 'site'].find(k => e[k]); if (l === 'site' && e.autoSite) l = null;
  const t = l ? { sp: e.sp, level: l, ref: e[l] } : null, n = (t ? pool.filter(a => inScope(a, t)) : pool).length, words = t ? [targetPath(t), targetName(t)].filter(Boolean).join(' › ') : `Whole species · ${sp.name}`;
  const foot = `<div class="az-actionbar az-actionbar--row"><span class="grow entfoot"><b>${esc(words)}</b><small>${plural(n, 'animal')}</small></span><button class="az-btn" onclick="entDone()">Done</button></div>`;
  return pane('pane--fill form-page ent-page', topbar({ back: '', lead: `<button class="az-iconbtn" onclick="entBack()" aria-label="Back">${I('arrow_back')}</button>`, title: 'For which animals?', sub: esc(sp.name) }) + search, `<div class="body">${body}</div>`, foot, `ent-${d.key}`);
}
function dietSheet(id) { const d = diet(id); openSheet(() => ({ title: esc(d.name), sub: esc(species(d.sp).name), body: linesView(dietGroups(d)) }), SH.length > 0); }

/* what should change: the diet as Diet Details shows it; tap a line to change it; the Kitchen marks show what changed */
const changeOf = (d, f, it) => d.changes.find(x => x.op !== 'add' && x.feed === f && x.item === it);
const addsAt = (d, f) => d.changes.filter(c => c.op === 'add' && c.feed === f);
function itemsSec(d) {
  const base = baseOf(d), feeds = [...new Set([...base.meals.map(m => m.feed), ...d.changes.filter(c => c.op === 'add').map(c => c.feed)])].sort((a, b) => a - b);
  const groups = feeds.map(f => { const m = base.meals.find(x => x.feed === f) || { items: [] };
    return { feed: f, rows: m.items.map(i => ({ ...lineRow(i, changeOf(d, f, i.item)), click: `lineSheet(${f},${i.item})` })).concat(addsAt(d, f).map(c => ({ ...lineRow(null, c), click: `addSheet(${f},${c.to})` }))) }; });
  const n = d.changes.length;
  return `<section class="az-section"><h2 class="az-section__title">${I('edit_note', 20)}<span class="grow">What should change<span class="az-req">*</span></span>${n ? `<span class="chgcount">${plural(n, 'change')}</span>` : ''}</h2>${groups.length ? mealTable(groups, isTab(), true, { add: f => `addSheet(${f})` }) : ''}${groups.length ? '' : `<button class="az-btn az-btn--add az-btn--compact" onclick="addSheet()">${I('add')}Add item</button>`}${n ? kitchenNote(d) : ''}</section>`;
}
function setChange(c) { const d = S.draft; d.changes = d.changes.filter(x => !(c.op !== 'add' && x.op !== 'add' && x.feed === c.feed && x.item === c.item) && !(c.op === 'add' && x.op === 'add' && x.feed === c.feed && x.to === c.to)); d.changes.push(c); d.changes.sort((a, b) => a.feed - b.feed); closeAll(); render(); }
function undoChange(f, it) { const d = S.draft; d.changes = d.changes.filter(x => !(x.op !== 'add' && x.feed === f && x.item === it)); closeAll(); render(); }
function undoAdd(f, to) { const d = S.draft; d.changes = d.changes.filter(x => !(x.op === 'add' && x.feed === f && x.to === to)); closeAll(); render(); }

/* one diet line: time, item, daily amount, day, preparation, cut size */
let LS = {};
function lineSheet(f, it) {
  const was = entryOf(baseOf(S.draft), f, it), c = changeOf(S.draft, f, it), from = c && c.op === 'change' ? c : { ...was, to: was.item };
  LS = { mode: 'change', feed: f, item: it, to: from.to, qty: from.qty, unit: from.unit, prep: from.prep || '', cut: from.cut || '', days: from.days ?? EVERY_DAY, cad: from.cad ? { ...from.cad } : null, had: !!c };
  openSheet(lsHtml);
}
function addSheet(f = null, to = null) {
  const c = to ? addsAt(S.draft, f).find(x => x.to === to) : null;
  LS = c ? { mode: 'add', feed: f, wasFeed: f, to: c.to, was: c.to, qty: c.qty, unit: c.unit, prep: c.prep || '', cut: c.cut || '', days: c.days ?? EVERY_DAY, cad: c.cad ? { ...c.cad } : null, had: true }
    : { mode: 'add', feed: f ?? (baseOf(S.draft).meals[0] || FEEDS[0]).feed ?? FEEDS[0].id, to: null, was: null, qty: null, unit: null, prep: '', cut: '', days: EVERY_DAY, cad: null, had: false };
  openSheet(lsHtml);
}
function itemsAt(f) { const d = S.draft, m = baseOf(d).meals.find(x => x.feed === f), ids = new Set(m ? m.items.map(i => i.item) : []); addsAt(d, f).forEach(c => ids.add(c.to)); if (LS.item) ids.delete(LS.item); if (LS.was && LS.wasFeed === f) ids.delete(LS.was); return ids; }
function lsHtml() {
  const d = S.draft, n = animalsIn(asReq(d)).length || 1, add = LS.mode === 'add', was = add ? null : entryOf(baseOf(d), LS.feed, LS.item), it = LS.to ? item(LS.to) : null;
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
  if (!Object.values(lineDiff(entryOf(baseOf(d), L.feed, L.item), c)).some(Boolean)) { undoChange(L.feed, L.item); return; }
  setChange({ op: 'change', item: L.item, ...c });
}
/* choose the item: search, then in stock and low stock */
let IP = { q: '' };
function pickItem() { IP = { q: '' }; openSheet(ipHtml, true); }
function ipHtml() {
  const n = animalsIn(asReq(S.draft)).length || 1, taken = LS.rule && LS.op !== 'add' ? new Set([LS.item]) : itemsAt(LS.feed), q = IP.q.trim().toLowerCase();
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
/* Use another diet: their species' own diets first; a species with no diet borrows another species' diet (Kitchen & Diet: Adopt) */
function dietSec(d) {
  const sps = new Set(d.targets.map(t => t.sp)), eaten = new Set(eatOf(d).list.map(e => e.diet.id)), cls = species(d.targets[0].sp).cls;
  const live = D.diets.filter(x => D.assigns.some(a => a.diet === x.id && !ended(a)) && !(eaten.size === 1 && eaten.has(x.id))), own = live.filter(x => sps.has(x.sp));
  const list = own.length ? own : live.sort((x, y) => (species(y.sp).cls === cls) - (species(x.sp).cls === cls) || x.name.localeCompare(y.name));
  const pick = list.length ? list.map(x => `<button class="az-pickrow" role="radio" aria-checked="${d.diet === x.id}" onclick="S.draft.diet='${x.id}';render()"><span class="az-pickrow__t"><b>${esc(x.name)}</b><span>${KINDTYPE[x.type] || 'Diet'}${sps.has(x.sp) ? '' : ` · ${esc(species(x.sp).name)}`}</span></span><span class="lnk" onclick="event.stopPropagation();dietSheet('${x.id}')">View</span>${I(d.diet === x.id ? 'radio_button_checked' : 'radio_button_unchecked', 24, d.diet === x.id)}</button>`).join('')
    : `<div class="az-hintline">${I('info', 18)}<span>There is no other diet yet.</span></div>`;
  return section('swap_horiz', 'Which diet?', pick + (d.diet ? `<p class="cap">What changes</p>${linesView(dietDiffGroups(d.base && diet(d.base), diet(d.diet)))}${kitchenNote(d)}` : ''), true);
}
/* New diet: start from what they eat now, from another diet, or empty; it gets a name; then the Kitchen table */
function startSec(d) {
  const has = eatOf(d).list.length, chips = [['now', 'What they eat now'], ['other', 'Another diet'], ['empty', 'Empty']].filter(([k]) => k !== 'now' || has);
  const other = d.startFrom === 'other' ? select('Diet to start from', d.base ? diet(d.base).name : '', 'otherDietSheet()', { req: true, placeholder: 'Choose diet', id: 'f-from' }) : '';
  return section('add_circle', 'The new diet', `<div class="az-field"><span class="az-label">Start from</span><div class="daychips">${chips.map(([k, l]) => `<button aria-pressed="${d.startFrom === k}" onclick="setStart('${k}')">${l}</button>`).join('')}</div></div>${other}
    <label class="az-field"><span class="az-label">Diet name <span class="az-req">*</span></span><span class="az-input az-input--text"><input id="f-name" value="${esc(dietNameOf(d))}" oninput="S.draft.name=this.value;S.draft.nameEdited=true;redrawFoot()" aria-label="Diet name"></span></label>`, true) + itemsSec(d);
}
function setStart(k) { const d = S.draft; d.startFrom = k; if (k === 'other') { d.base = null; d.changes = []; render(); otherDietSheet(); return; } sync(d); render(); }
function otherDietSheet() {
  openSheet(() => { const d = S.draft, sps = new Set(d.targets.map(t => t.sp)), list = D.diets.filter(x => D.assigns.some(a => a.diet === x.id && !ended(a))).sort((x, y) => sps.has(y.sp) - sps.has(x.sp) || x.name.localeCompare(y.name));
    return { title: 'Start from', bottom: true, body: list.map(x => `<button class="az-pickrow" role="radio" aria-checked="${d.base === x.id}" onclick="pickFrom('${x.id}')"><span class="az-pickrow__t"><b>${esc(x.name)}</b><span>${esc(species(x.sp).name)} · ${plural(dietItems(x), 'item')}</span></span>${I(d.base === x.id ? 'radio_button_checked' : 'radio_button_unchecked', 24, d.base === x.id)}</button>`).join('') };
  });
}
function pickFrom(id) { const d = S.draft; if (d.base !== id) { d.base = id; d.changes = []; } closeAll(); render(); }
/* End a diet early: its last day */
const stopSec = d => section('event_busy', 'Last day', `<div class="daychips">${[[0, 'Today'], [1, 'Tomorrow']].map(([n, l]) => `<button aria-pressed="${d.stop === addDays(TODAY, n)}" onclick="S.draft.stop='${addDays(TODAY, n)}';render()">${l} · ${fmtDay(addDays(TODAY, n))}</button>`).join('')}</div>
  <label class="az-field"><span class="az-label">Or pick a day</span><span class="az-input az-input--text">${I('calendar_month')}<input type="date" id="p-stop" min="${TODAY}" value="${d.stop}" onchange="if(this.value)S.draft.stop=this.value;render()"></span></label>`, true);
/* no feed on a day: which day, which feeds (a note to the kitchen; Kitchen & Diet has no one-day diet) */
function skipSec(d) {
  const w = currentDiet(asReq(d)), meals = w ? w.diet.meals : FEEDS.map(f => ({ feed: f.id, items: [] })), all = d.feeds === 'all', t1 = addDays(TODAY, 1);
  return section('event_busy', 'Which day and feeds?', `<div class="daychips"><button aria-pressed="${d.date === TODAY}" onclick="S.draft.date='${TODAY}';render()">Today · ${fmtDay(TODAY)}</button><button aria-pressed="${d.date === t1}" onclick="S.draft.date='${t1}';render()">Tomorrow · ${fmtDay(t1)}</button></div>
    <label class="az-field"><span class="az-label">Or pick a day</span><span class="az-input az-input--text">${I('calendar_month')}<input type="date" id="s-date" min="${TODAY}" value="${d.date}" onchange="if(this.value)S.draft.date=this.value;render()"></span></label>
    <div class="daychips"><button aria-pressed="${all}" onclick="S.draft.feeds='all';render()">All feeds</button>${meals.map(m => `<button aria-pressed="${!all && d.feeds.includes(m.feed)}" onclick="toggleFeed(${m.feed})">${bandText(feed(m.feed))}</button>`).join('')}</div>${d.targets.length === 1 ? skipView(asReq(d)) : ''}${kitchenNote(d)}`, true);
}
function toggleFeed(f) { const d = S.draft, w = currentDiet(asReq(d)), every = w ? w.diet.meals.map(m => m.feed) : FEEDS.map(x => x.id); let list = d.feeds === 'all' ? [] : [...d.feeds]; list = list.includes(f) ? list.filter(x => x !== f) : [...list, f].sort(); d.feeds = every.every(x => list.includes(x)) ? 'all' : list; render(); }
/* How long, as Kitchen & Diet's kinds and their colours: From now on (Year-round), Every year (Seasonal), Once (Time-bound) */
function howSec(d) {
  const lock = noDiet(d), yr = d.how === 'yearly';
  const seg = `<div class="az-segment" role="tablist" aria-label="How long">${thumb()}${HOW.map(([k, l]) => `<button role="tab" aria-selected="${d.how === k}"${lock && k !== 'always' ? ' disabled aria-disabled="true"' : ` onclick="setHow('${k}')"`}>${l}</button>`).join('')}</div>`;
  const dates = d.how === 'always' ? '' : `<div class="az-two"><label class="az-field"><span class="az-label">${yr ? 'From, every year' : 'Start'} <span class="az-req">*</span></span><span class="az-input az-input--text"><input type="date" id="p-start"${yr ? '' : ` min="${TODAY}"`} value="${d.start}" onchange="S.draft.start=this.value;render()"></span></label>
    <label class="az-field"><span class="az-label">${yr ? 'To' : 'End'} <span class="az-req">*</span></span><span class="az-input az-input--text"><input type="date" id="p-end"${yr ? '' : ` min="${addDays(d.start, 1)}"`} value="${d.end}" onchange="S.draft.end=this.value;render()"></span></label></div>`;
  return section('event', 'How long', `${seg}<div class="howtag">${ktag(HOW_KIND[d.how])}<span>${d.how === 'always' ? 'Starts when approved' : yr ? 'Comes back every year' : 'Runs once, then they go back'}</span></div>${dates}`, true);
}
function setHow(k) { const d = S.draft; d.how = k; if (k === 'once' && (!d.start || d.start < TODAY)) { d.start = addDays(TODAY, 1); d.end = addDays(TODAY, 14); } render(); }
/* When approved: what Kitchen & Diet will do, worked out from its rules (plan.js), before anyone sends it */
function effectSec(d, p) {
  const sps = new Set(d.targets.map(t => t.sp));
  const rows = p.lines.map(l => { const tag = l.view ? 'button' : 'div';
    return `<${tag} class="forrow${l.view ? '' : ' forrow--static'}"${l.view ? ` onclick="reachSheet('${l.view}')"` : ''}><span class="eav">${I(l.icon, 20)}</span><span class="grow"><b>${esc(l.b)}</b>${l.small ? `<small>${esc(l.small)}</small>` : ''}${l.x ? `<small>${esc(l.x)}</small>` : ''}</span>${l.tag ? ktag(l.tag) : l.view ? I('chevron_right', 20) : ''}</${tag}>`; }).join('');
  const ask = p.shared ? `<div class="az-field effect__ask"><span class="az-label">Also fed to ${esc(p.shared.map(s => s.name).join(', '))}. Change it for <span class="az-req">*</span></span><div class="az-segment" role="tablist">${thumb()}${[['all', 'All species'], ['only', sps.size === 1 ? `Only ${species([...sps][0]).name}` : 'Only these species']].map(([k, l]) => `<button role="tab" aria-selected="${d.forAll === k}" onclick="S.draft.forAll='${k}';render()">${esc(l)}</button>`).join('')}</div></div>` : '';
  const warn = p.block ? `<div class="az-warnline az-warnline--bad">${I('error', 18)}<span>${esc(p.block)}</span></div>` : '';
  return section('task_alt', 'When approved', `${warn}${rows ? `<div class="forcard effect">${rows}</div>` : ''}${ask}`);
}
/* the animals behind a line of When approved: who gets it, who moves, who keeps their own diet; or every diet that changes */
function reachSheet(view, id = '') {
  openSheet(() => { const r = id ? by('requests', id) : asReq(S.draft), p = planOf(r);
    if (view === 'ops') return { title: 'Diets that change', sub: plural(p.ops.length, 'diet'), bottom: true, body: p.ops.map(o => eatGrp(`<span class="davatar">${I(o.type === 'edit' ? 'edit' : o.type === 'share' ? 'swap_horiz' : 'add')}</span>`, o.type === 'edit' ? diet(o.diet).name : o.name || diet(o.diet).name, o.type === 'edit' ? `Changed · ${plural(o.changes.length, 'change')}` : `New · for ${placesText(o.slots)}`, '', [])).join('') };
    const list = view === 'keep' ? p.keep : view === 'moved' ? p.moved || [] : p.get, bySp = {};
    list.forEach(a => (bySp[a.sp] = bySp[a.sp] || []).push(a));
    return { title: view === 'keep' ? 'Keep their own diet' : view === 'moved' ? 'Move from another diet' : 'Who gets it', sub: plural(list.length, 'animal'), bottom: true,
      body: Object.entries(bySp).map(([sp, as]) => eatGrp(spThumb(species(+sp)), species(+sp).name, '', '', as)).join('') || '<div class="nodiet">No animal</div>' };
  });
}
/* the same item change for many diets (many species): add an item, stop it, replace it, or change its amount */
const RULE_OPS = [['add', 'Add'], ['stop', 'Stop'], ['replace', 'Replace'], ['amount', 'Amount']];
const RULE_IC = { add: 'add', stop: 'do_not_disturb_on', replace: 'swap_horiz', amount: 'percent' };
function rulesSec(d) {
  const dts = eatOf(d).list.map(e => e.diet), n = d.rules.length;
  const rows = d.rules.map((u, i) => { const k = dts.filter(x => changesFor(x, [u]).length).length;
    return `<div class="forrow forrow--static"><span class="eav">${I(RULE_IC[u.op], 20)}</span><span class="grow"><b>${esc(ruleText(u))}</b><small>In ${k} of ${plural(dts.length, 'diet')}</small></span><button class="az-iconbtn" onclick="S.draft.rules.splice(${i},1);render()" aria-label="Remove">${I('close', 20)}</button></div>`; }).join('');
  return `<section class="az-section"><h2 class="az-section__title">${I('edit_note', 20)}<span class="grow">What should change<span class="az-req">*</span></span>${n ? `<span class="chgcount">${plural(n, 'change')}</span>` : ''}</h2><div class="forcard rulecard">${rows}<button class="forrow" onclick="ruleSheet()"><span class="eav">${I('add_circle', 22)}</span><span class="grow"><b>Add a change</b><small>Said once, for each of their diets</small></span>${I('chevron_right', 20)}</button></div>${n ? kitchenNote(d) : ''}</section>`;
}
function ruleSheet() { LS = { mode: 'add', rule: true, op: 'add', feed: FEEDS[0].id, to: null, item: null, qty: null, unit: null, prep: '', cut: '', days: EVERY_DAY, cad: null, pct: -10, had: false }; openSheet(ruleHtml); }
function ruleHtml() {
  const seg = `<div class="az-segment" role="tablist" aria-label="Change">${thumb()}${RULE_OPS.map(([k, l]) => `<button role="tab" aria-selected="${LS.op === k}" onclick="LS.op='${k}';redrawSheet()">${l}</button>`).join('')}</div>`;
  const foot = ok => `<button class="az-btn az-btn--outline" onclick="closeSheet()">Cancel</button><button class="az-btn"${ok ? '' : ' disabled'} onclick="saveRule()">Add</button>`;
  if (LS.op === 'add') { const h = lsHtml(); return { title: 'Add a change', form: true, body: seg + h.body, foot: foot(LS.to && LS.qty > 0) }; }
  const cnt = {}; eatOf(S.draft).list.forEach(e => new Set(e.diet.meals.flatMap(m => m.items.map(i => i.item))).forEach(id => { cnt[id] = (cnt[id] || 0) + 1; }));
  const opts = Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(([id, n]) => [+id, item(+id).name, `In ${plural(n, 'diet')}`]);
  const body = select('Item', LS.item ? item(LS.item).name : '', `optionSheet('Item',${JSON.stringify(opts).replace(/"/g, '&quot;')},LS.item,'pickRuleItem')`, { req: true, placeholder: 'Choose item' })
    + (LS.op === 'replace' ? select('Replace with', LS.to ? item(LS.to).name : '', 'pickItem()', { req: true, placeholder: 'Choose item' }) : '')
    + (LS.op === 'amount' ? `<div class="az-field"><span class="az-label">Change the amount by <span class="az-req">*</span></span><div class="qtyf"><button class="qtyf__b" aria-label="Less" onclick="LS.pct=Math.max(-90,(LS.pct||0)-10);redrawSheet()">${I('remove')}</button><input id="ls-pct" type="number" value="${LS.pct ?? 0}" oninput="LS.pct=+this.value;redrawSheet()" aria-label="Percent"><span class="qtyf__u">%</span><button class="qtyf__b" aria-label="More" onclick="LS.pct=Math.min(200,(LS.pct||0)+10);redrawSheet()">${I('add')}</button></div></div>` : '');
  return { title: 'Add a change', form: true, body: seg + body, foot: foot(LS.item && (LS.op === 'stop' || (LS.op === 'replace' && LS.to && LS.to !== LS.item) || (LS.op === 'amount' && LS.pct && LS.pct > -100))) };
}
function pickRuleItem(v) { LS.item = +v; SH.pop(); redrawSheet(); }
function saveRule() { const L0 = LS; S.draft.rules.push(L0.op === 'add' ? { op: 'add', item: L0.to, feed: L0.feed, qty: L0.qty, unit: L0.unit, prep: L0.prep, cut: L0.cut, days: L0.cad ? EVERY_DAY : L0.days, cad: L0.cad || null } : L0.op === 'amount' ? { op: 'amount', item: L0.item, pct: L0.pct } : { op: L0.op, item: L0.item, to: L0.to || null }); closeAll(); render(); }
const kitchenNote = d => `<label class="az-field"><span class="az-label">Note to kitchen (optional)</span><span class="az-input az-input--text az-textarea"><textarea id="d-note" rows="2" placeholder="Preparation, timing, serving" oninput="S.draft.note=this.value">${esc(d.note)}</textarea></span></label>`;
const whySec = d => section('label', 'Why', select('Reason', d.reason, `optionSheet('Reason',REASONS[S.draft.kind].map(t=>[t,t]),S.draft.reason,'pickReason')`, { req: true, id: 'f-reason' })
  + `<label class="az-field"><span class="az-label">Details (optional)</span><span class="az-input az-input--text az-textarea"><textarea id="f-text" rows="3" placeholder="What the approver should know" oninput="S.draft.text=this.value;redrawFoot()">${esc(d.text)}</textarea></span></label>`, true);
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
const attachSec = d => section('attach_file', 'Attachments', `${d.files.length ? `<div class="files">${d.files.map((f, i) => `<span class="file">${I(f.kind === 'image' ? 'image' : f.kind === 'pdf' ? 'picture_as_pdf' : 'description', 20)}${esc(f.name)}<button class="az-iconbtn" style="width:28px;height:28px" onclick="S.draft.files.splice(${i},1);render()" aria-label="Remove ${esc(f.name)}">${I('close', 18)}</button></span>`).join('')}</div>` : ''}
  <button class="az-upload" onclick="addFile()"><i class="az-i" aria-hidden="true">add_photo_alternate</i><b>Add photos or files</b><span>PDF, images or documents</span></button>`);
/* priority sits at the top right, as the Help Desk app: the Antz flag */
function prioSheet() { optionSheet('Priority', Object.entries(PRIO).map(([k, [, l]]) => [k, l, PRI_TEXT[k]]), S.draft.prio, 'pickFormPrio'); }
function pickFormPrio(v) { S.draft.prio = v; closeAll(); render(); }
/* Your request: what will be sent, said once before sending (design system: Review before sending). The title writes itself until the
   person edits it; who approves, who asks and the site are fixed for a diet request, so they are read here. How long and what it does
   are already in How long and When approved */
function reviewSec(d) {
  const t = titleOf(d), u = user(S.user), ap = d.approver && user(d.approver), editing = d.tEdit || (d.titleEdited && !t.trim());
  const title = editing ? `<label class="az-input az-input--text"><input id="f-title" placeholder="Title" value="${esc(t)}" oninput="S.draft.title=this.value;S.draft.titleEdited=true;redrawFoot()" aria-label="Title"></label>`
    : t ? `<div class="rvtitle"><b>${esc(t)}</b><button class="az-iconbtn" onclick="S.draft.tEdit=true;render();setTimeout(()=>{const i=document.getElementById('f-title');if(i)i.focus()},30)" aria-label="Edit title">${I('edit', 20)}</button></div>` : '';
  const row = (icon, k, v) => `<div class="rsec__r">${I(icon)}<span class="t"><span>${k}</span><b>${v}</b></span></div>`;
  return section('send', 'Your request', title + `<div class="rsec">${[ap ? row('how_to_reg', 'To be approved by', `${esc(ap.name)} · ${esc(ap.title)}`) : '',
    row('person', 'Requested by', `${youName(S.user)} · ${esc(u.title)}`), d.site ? row('location_on', 'Requesting site', esc(by('sites', d.site).name)) : ''].join('')}</div>`);
}
/* ---------- a diet request in steps, one question at a time (as Kitchen & Diet's create-diet wizard), owner 3 Nov: "Full scroll… rethink".
   Phone: a progress bar, the answers so far as chips, the step, Back | Next. iPad: the steps down the left with their answers (tap one to go
   back); in landscape, When approved stays on the right as you answer ---------- */
const STEP_NAME = { what: 'What', for: 'For', change: 'Changes', how: 'How long', day: 'Day and feeds', last: 'Last day', send: 'Check and send' };
const stepsOf = d => d.kind === 'skip' ? ['what', 'for', 'day', 'send'] : d.kind === 'end' ? ['what', 'for', 'last', 'send'] : ['what', 'for', 'change', 'how', 'send'];
const stepName = (d, s) => s === 'change' ? (d.kind === 'new' ? 'The new diet' : d.kind === 'diet' ? 'Which diet' : 'Changes') : STEP_NAME[s];
const stepAt = d => { const ss = stepsOf(d); d.step = Math.min(d.step || 0, ss.length - 1); d.reach = Math.min(Math.max(d.reach || 0, d.step), ss.length - 1); return ss[d.step]; };
/* what is still missing on a step (Next looks off and says it when tapped) */
function stepErr(d, s) {
  if (s === 'what') return d.dept ? '' : 'Choose the department';
  if (s === 'for') return !d.targets.length ? 'Choose the species' : d.kind === 'items' && d.base !== 'many' && !d.base ? 'There is no diet here to change' : d.kind === 'end' && !d.ends.length ? 'Choose the diet to end' : '';
  if (s === 'change') {
    if (d.kind === 'items') return d.base === 'many' ? (d.rules.length ? '' : 'Add at least one item change') : d.changes.length ? '' : 'Change at least one item';
    if (d.kind === 'diet') return d.diet ? '' : 'Choose the diet to use';
    if (d.startFrom === 'other' && !d.base) return 'Choose the diet to start from';
    if (!applyChanges(baseOf(d).meals, d.changes).length) return 'Add at least one item';
    if (d.group && d.group.kind !== 'sex' && !(d.group.min >= 0 && (d.group.max == null || d.group.max > d.group.min))) return 'Check the age or weight range';
    return dietNameOf(d).trim() ? '' : 'Name the diet';
  }
  if (s === 'how' && d.how === 'once' && (!d.start || d.start < TODAY || !d.end || d.end <= d.start)) return 'Check the dates';
  if (s === 'how' && d.how === 'yearly' && (!d.start || !d.end || d.start.slice(5) === d.end.slice(5))) return 'Check the dates';
  if (s === 'day' && (d.date < TODAY || (d.feeds !== 'all' && !d.feeds.length))) return 'Choose the day and the feeds';
  if (s === 'last' && (!d.stop || d.stop < TODAY || d.ends.some(id => { const a = by('assigns', id); return !a.recur && a.end && d.stop >= a.end; }))) return 'Check the last day';
  if (['how', 'day', 'last'].includes(s)) return planOf(asReq(d)).block || '';
  return s === 'send' ? err(d) : '';
}
/* each answer in a few words, for the chips (phone) and the steps (iPad) */
function stepSum(d, s) {
  if (s === 'what') return d.dept === 'diet' ? KTABS.find(k => k[0] === d.kind)[1] : '';
  if (s === 'for') { const ts = d.targets; return !ts.length ? '' : ts.length === 1 ? `${species(ts[0].sp).name} · ${tWhere(ts[0])}${d.kind === 'new' && d.group && ts[0].level === 'species' ? ` · ${GROUP_WORD(d.group)}` : ''}` : placesText(ts); }
  if (s === 'change') return d.kind === 'items' ? (d.base === 'many' ? (d.rules.length ? `${plural(d.rules.length, 'change')} · all their diets` : '') : d.changes.length ? `${plural(d.changes.length, 'change')} · ${baseOf(d).name}` : '')
    : d.kind === 'diet' ? (d.diet ? diet(d.diet).name : '') : stepErr(d, 'change') ? '' : dietNameOf(d);
  if (s === 'how') return d.how === 'always' ? 'From now on' : d.how === 'yearly' ? `Every year · ${fmtDay(d.start)} – ${fmtDay(d.end)}` : `Once · ${fmtDay(d.start)} – ${fmtDay(d.end)}`;
  if (s === 'day') return `${dayText(d.date)[0].toUpperCase() + dayText(d.date).slice(1)} · ${d.feeds === 'all' ? 'all feeds' : plural(d.feeds.length, 'feed')}`;
  if (s === 'last') return fmtDayY(d.stop);
  return '';
}
function goStep(i) { const d = S.draft; if (i > (d.reach || 0)) return; d.step = i; render(); }
function nextStep() {
  const d = S.draft, ss = stepsOf(d), e = stepErr(d, ss[d.step || 0]);
  if (e) { toast(e); const at = (ERR_AT.find(([re]) => re.test(e.toLowerCase())) || [])[1], el = at && document.querySelector(at); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
  d.step = Math.min((d.step || 0) + 1, ss.length - 1); d.reach = Math.max(d.reach || 0, d.step); render();
}
/* the step's own questions */
function stepBody(d, s) {
  if (s === 'what') return requestDetails(d) + kindTiles(d);
  if (s === 'for') return forSec(d);
  if (s === 'change') return d.kind === 'items' ? (d.base === 'many' ? rulesSec(d) : itemsSec(d)) : d.kind === 'new' ? startSec(d) : dietSec(d);
  if (s === 'how') return howSec(d);
  if (s === 'day') return skipSec(d);
  if (s === 'last') return stopSec(d);
  return (isLand() ? '' : effectSec(d, planOf(asReq(d)))) + whySec(d) + attachSec(d) + reviewSec(d);
}
/* Back | Next, and Send on the last step; Next and Send look off until the step is answered (design system), a tap says what is missing */
function formFoot(d) {
  if (d.dept === 'diet') {
    const ss = stepsOf(d), i = Math.min(d.step || 0, ss.length - 1), last = ss[i] === 'send', e = stepErr(d, ss[i]), n = d.kind === 'items' ? (d.base === 'many' ? d.rules.length : d.changes.length) : 0;
    const back = i > 0 ? `<button class="az-btn az-btn--outline" onclick="goStep(${i - 1})">Back</button>` : '';
    return `<div class="az-actionbar az-actionbar--row wiz-foot">${isTab() ? `<span class="wiz-foot__n">Step ${i + 1} of ${ss.length}</span>` : ''}${back}<button class="az-btn${e ? ' az-btn--disabled' : ''}" aria-disabled="${!!e}" onclick="${last ? 'submitDraft()' : 'nextStep()'}">${last ? (d.edit ? 'Save and send' : n ? `Send ${plural(n, 'change')}` : 'Send request') : `Next${I('arrow_forward', 20)}`}</button></div>`;
  }
  const e = err(d);
  return `<div class="az-actionbar"><button class="az-btn${e ? ' az-btn--disabled' : ''}" aria-disabled="${!!e}" onclick="submitDraft()">${d.edit ? 'Save and send' : 'Send request'}</button></div>`;
}
/* phone: a bar of steps and the answers so far as chips; iPad: the steps down the left, each with its answer */
function wizTop(d) {
  const ss = stepsOf(d), i = d.step, chips = ss.slice(0, i).map((s, k) => stepSum(d, s) ? `<button class="wiz-chip" onclick="goStep(${k})">${esc(stepSum(d, s))}</button>` : '').join('');
  return `<div class="wiz-top"><div class="wiz-bar" aria-hidden="true">${ss.map((s, k) => `<i class="${k < i ? 'done' : k === i ? 'on' : ''}"></i>`).join('')}</div><div class="wiz-t"><b>${stepName(d, ss[i])}</b><span>Step ${i + 1} of ${ss.length}</span></div>${chips ? `<div class="wiz-chips">${chips}</div>` : ''}</div>`;
}
function wizRail(d) {
  const ss = stepsOf(d);
  return `<nav class="wiz-rail" aria-label="Steps">${ss.map((s, k) => { const st = k < d.step ? 'done' : k === d.step ? 'on' : k <= d.reach ? 'open' : '', sum = k === d.step ? '' : stepSum(d, s);
    return `<button class="wiz-step wiz-step--${st || 'todo'}"${k <= d.reach && k !== d.step ? ` onclick="goStep(${k})"` : ' disabled'}${k === d.step ? ' aria-current="step"' : ''}><span class="wiz-step__n">${k < d.step || (k <= d.reach && k !== d.step && !stepErr(d, s)) ? I('check', 18) : k + 1}</span><span class="wiz-step__t"><b>${stepName(d, s)}</b>${sum ? `<small>${esc(sum)}</small>` : ''}</span></button>`; }).join('')}</nav>`;
}
/* where a missing answer is asked, to scroll to it; a rule of Kitchen & Diet shows in When approved */
const ERR_AT = [[/species/, '#f-sp'], [/^choose the diet|^there is no diet/, '#f-from'], [/name the diet/, '#f-name'], [/title/, '#f-title'], [/description/, '#f-text'], [/last day/, '#p-stop'], [/dates/, '#p-start'], [/reason/, '#f-reason'], [/range/, '#g-min'], [/item/, '.chgcount, .mtab-wrap, .rulecard'], [/./, '.effect, .az-warnline--bad']];
function redrawFoot() { const f = $('#form-foot'); if (f && S.draft) f.innerHTML = formFoot(S.draft); }
/* a diet request asks, in order: what to do (tiles), for which species and places (one card, with what they eat today), what changes,
   how long, then shows what approval will do, asks why, and shows Your request and Send. On the iPad in landscape, When approved and
   Your request stay beside the form */
function paneForm(q) {
  const d = initDraft(q), close = d.edit ? `#/requests/${d.edit}` : S.back;
  if (d.blocked) return pane('pane--fill', topbar({ back: close, title: 'Edit request' }), empty1('This request can no longer be edited'));
  if (d.ent) return paneEntity(d);
  const prio = `<button class="prio-pick" onclick="prioSheet()" aria-label="Priority: ${PRIO[d.prio][1]}"><span class="prio prio--${d.prio}">${d.prio === 'emergency' ? I('local_fire_department', 16, true) : PRIO[d.prio][0]}</span>${PRIO[d.prio][1]}${I('keyboard_arrow_down', 20)}</button>`;
  const top = topbar({ close: `go('${close}')`, title: d.edit ? `Edit ${d.edit}` : d.dept === 'diet' ? 'New diet request' : 'New request', actions: prio }), foot = `<div id="form-foot">${formFoot(d)}</div>`;
  if (d.dept === 'diet') {
    const s = stepAt(d), live = isLand() && d.targets.length ? `<aside class="wiz-live">${(p => p.lines.length || p.block ? effectSec(d, p) : section('task_alt', 'When approved', '<div class="nodiet">Shows here as you answer</div>'))(planOf(asReq(d)))}</aside>` : '';
    const body = isTab() ? `<div class="body wiz${live ? ' wiz--live' : ''}">${wizRail(d)}<div class="wiz-main">${stepBody(d, s)}</div>${live}</div>` : `<div class="body wiz-body">${stepBody(d, s)}</div>`;
    return pane('pane--fill form-page wiz-page', top + (isTab() ? '' : wizTop(d)), body, foot, `form-${d.key}-${s}`);
  }
  const secs = [requestDetails(d)];
  if (DEPT_FORMS[d.dept]) secs.push(deptSection(d));
  secs.push(attachSec(d));
  return pane('pane--fill form-page', top, `<div class="body">${secs.join('')}</div>`, foot, `form-${d.key}`);
}
const DIET_KEYS = ['targets', 'group', 'date', 'feeds', 'slot', 'base', 'start', 'end', 'changes', 'rules', 'diet', 'ends', 'stop', 'how', 'name', 'forAll'];
function submitDraft() {
  const d = S.draft;
  if (!d || d.blocked) return;
  const e = err(d);
  if (e) { toast(e); const at = (ERR_AT.find(([re]) => re.test(e.toLowerCase())) || [])[1], el = at && document.querySelector(at); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); if (el.focus) el.focus({ preventScroll: true }); } return; }
  const fields = { dept: d.dept, title: titleOf(d).trim(), text: d.text.trim(), site: d.site, approver: d.approver, prio: d.prio, files: [...d.files], note: d.note.trim() };
  if (DEPT_FORMS[d.dept]) fields.f = { ...d.f, ...(d.f.items ? { items: d.f.items.filter(i => i.name.trim()) } : {}) };
  if (d.dept === 'diet') {
    const r0 = asReq(d), x = d.kind === 'items' && d.base !== 'many' ? eatOf(d).list.find(z => z.diet.id === d.base) : null;
    Object.assign(fields, { kind: d.kind, targets: r0.targets, sp: r0.sp, level: r0.level, ref: r0.ref, reason: d.reason });
    if (d.kind === 'skip') Object.assign(fields, { date: d.date, feeds: d.feeds === 'all' ? 'all' : [...d.feeds] });
    else if (d.kind === 'end') Object.assign(fields, { ends: [...d.ends], stop: d.stop });
    else Object.assign(fields, { how: d.how, start: r0.start, end: r0.end, forAll: d.forAll || null },
      d.kind === 'items' ? (d.base === 'many' ? { base: 'many', rules: d.rules.map(u => ({ ...u })) } : { base: d.base, slot: x ? topSlot(x).id : null, changes: d.changes.map(c => ({ ...c })) })
        : d.kind === 'new' ? { base: d.base, changes: d.changes.map(c => ({ ...c })), name: dietNameOf(d).trim() } : { diet: d.diet, base: d.base });
  }
  let r;
  if (d.edit) {
    r = by('requests', d.edit);
    if (!r || r.by !== S.user || !isOpen(r)) { toast(`Can't edit ${d.edit} now`); return; }
    const was = r.state;
    DIET_KEYS.forEach(k => delete r[k]);
    Object.assign(r, fields, { state: 'pending', delay: null });
    r.events.push({ kind: 'edited', by: S.user, at: nowStamp(), note: was === 'delayed' ? 'Changed after the delay. Back for approval.' : '' });
  } else {
    r = { id: newRequestId(), ...fields, by: S.user, state: 'pending', events: [{ kind: 'raised', by: S.user, at: nowStamp() }] };
    D.requests.push(r);
  }
  S.draft = null; S.rTab = 'pending'; S.rDept = 'all'; storeSave();
  toast(`${d.edit ? 'Saved and sent' : 'Sent to ' + first(user(r.approver).name)} · ${r.id}`); go(`#/requests/${r.id}`);
}
/* a form whose draft is gone (sent, closed or reset while it leaves the screen) takes no more taps or typing */
['click', 'input', 'change'].forEach(t => document.addEventListener(t, e => { if (!S.draft && e.target.closest && e.target.closest('.form-page')) { e.stopPropagation(); e.preventDefault(); } }, true));
