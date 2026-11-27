// js/form.js — Help Desk › New Request (and Edit, by the person who raised it while it is open), as the Help Desk app:
// Request Details (title, description, requested by, requesting to, site, approver) · Attachments · Submit Request, priority at the top right.
// When "Requesting To" is Diet (anybody), Request is a Diet request (in words: skip a feed, extra feed, medicine with food …) or a Diet change
// (the diet's configuration: change item values, another diet, a new diet); then For, the type's few questions, and the request's own words.
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
  const editId = q.get('edit'), asg = q.get('asg'), dq = q.get('dept'), spq = +q.get('sp') || null, kq = q.get('kind'), key = [S.user, editId || (q.get('clone') ? 'clone-' + q.get('clone') : 'new'), asg || '', dq || '', spq || '', kq || ''].join(':');
  if (S.draft && S.draft.key === key) return S.draft;
  const blank = { key, edit: null, dept: null, f: {}, title: '', titleEdited: false, text: '', site: null, approver: null, prio: 'normal', files: [],
    dgroup: null, dtype: null, days: 14, from: 1, season: 'Winter', kind: 'items', targets: [], group: null, base: null, startFrom: 'now', changes: [], rules: [], diet: null, ends: [], how: 'once', start: addDays(TODAY, 1), end: addDays(TODAY, 14), stop: addDays(TODAY, 1),
    date: TODAY, feeds: 'all', reason: null, note: '', name: '', nameEdited: false, forAll: null };
  /* Clone, as the Help Desk app: a new request with the same answers (not the diet; that is suggest.js) */
  const cl = q.get('clone') && by('requests', q.get('clone'));
  if (cl && isDiet(cl)) { const d = (S.draft = { ...blank, dept: 'diet', approver: cl.approver, prio: cl.prio, text: cl.text || '', files: [...(cl.files || [])], site: cl.site }); dfLoad(d, cl); return d; }
  if (cl && !isDiet(cl)) return (S.draft = { ...blank, dept: cl.dept, f: JSON.parse(JSON.stringify(cl.f || {})), title: cl.title, titleEdited: true, text: cl.text || '', site: cl.site, approver: cl.approver, prio: cl.prio, files: [...(cl.files || [])] });
  if (editId) {
    const r = by('requests', editId);
    if (!r || !ownsReq(r, S.user) || !isOpen(r)) return (S.draft = { key, blocked: true });
    const d = { ...blank, edit: r.id, dept: r.dept, f: JSON.parse(JSON.stringify(r.f || {})), title: r.title, titleEdited: true, text: r.text, site: r.site, approver: r.approver, prio: r.prio, files: [...(r.files || [])], note: r.note || '' };
    if (isDiet(r)) {
      const ts = targetsOf(r), full = s => s && s.length === 5 ? nextMd(s) : s;
      Object.assign(d, { kind: r.kind, targets: ts.map(t => ({ sp: t.sp, level: t.level, ref: t.ref ?? null })), group: (ts[0] || {}).group || null, base: r.base || null, changes: (r.changes || []).map(c => ({ ...c })), rules: (r.rules || []).map(u => ({ ...u })),
        diet: r.diet || null, ends: [...(r.ends || [])], how: r.how || 'once', start: full(r.start) || d.start, end: full(r.end) || d.end, stop: r.stop || d.stop, date: r.date || TODAY, feeds: r.feeds === 'all' || !r.feeds ? 'all' : [...r.feeds],
        reason: r.reason, name: r.name || '', nameEdited: !!r.name, forAll: r.forAll || null });
      if (d.how === 'yearly' && d.end < d.start) d.end = `${+d.end.slice(0, 4) + 1}${d.end.slice(4)}`;
      if (r.kind === 'new') d.startFrom = !r.base ? 'empty' : (eatOf(d).list[0] || { diet: {} }).diet.id === r.base ? 'now' : 'other';
      dfLoad(d, r);
    }
    return (S.draft = d);
  }
  const d = (S.draft = blank);
  if (dq && deptsFor(me()).some(x => x.id === dq)) setDept(dq, false);
  const a = asg && by('assigns', asg);
  if (a && d.dept === 'diet') { d.targets = [{ sp: a.sp, level: a.level, ref: a.ref ?? null }]; d.base = a.diet; sync(d); }
  else if (spq && d.dept === 'diet' && by('species', spq)) { d.targets = [{ sp: spq, level: 'species', ref: null }]; if (KTABS.some(([k]) => k === kq)) d.kind = kq; sync(d); }
  /* a link that says what kind (a species with no diet: "Request a diet" = a new diet) */
  const dk = d.dept === 'diet' && kq && dtOfKind(kq);
  if (dk) { d.dgroup = dk[5]; d.dtype = dk[0]; }
  if (d.dept === 'diet' && d.targets[0]) { const e = dfEat(d)[0]; d.base = a ? a.diet : e ? e.diet.id : null; d.site = sgSite(d.targets[0]); }
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
function setDept(id, draw = true) { const d = S.draft; if (id === 'diet' && d.dept !== 'diet') Object.assign(d, { dgroup: null, dtype: null, targets: [], changes: [], f: {} }); if (d.dept !== id) d.f = id === 'procurement' ? { items: [{ name: '', qty: 1 }] } : {}; d.dept = id; d.approver = id === 'diet' ? dietApprover() : dept(id).head; if (draw) { closeAll(); render(); } }
const pickDept = v => setDept(v);
/* Select Department, as the Help Desk app's sheet (owner's screenshot, 18 Nov 2026): search, the count, then one outlined row per
   department with a radio; a tap picks it and closes. Diet is for Biologists (they suggest diet changes) */
let DQ = '';
function deptSheet() {
  DQ = '';
  openSheet(() => {
    const u = me(), cur = S.draft && S.draft.dept, q = DQ.trim().toLowerCase(), list = DEPTS.filter(x => !q || x.name.toLowerCase().includes(q));
    return { title: 'Select Department', bottom: true, body: `<label class="az-input az-input--text deptsel__q">${I('search')}<input id="dq" type="search" placeholder="Search" value="${esc(DQ)}" oninput="DQ=this.value;redrawSheet()" autocomplete="off" aria-label="Search departments"></label>
      <p class="deptsel__n">Departments - ${list.length}</p>
      <div class="deptsel" role="radiogroup" aria-label="Departments">${list.map(x => { const locked = x.id === 'diet' && !canRaise(u), on = cur === x.id;
        return `<button class="deptsel__r${locked ? ' deptsel__r--locked' : ''}" role="radio" aria-checked="${on}" onclick="${locked ? `asBiologist('#/new?dept=diet')` : `pickDept('${x.id}')`}"><span class="grow"><b>${esc(x.name)}</b>${locked ? `<small>Only biologists raise diet requests · tap to view as ${esc(user('u-kiran').name)}</small>` : ''}</span>${locked ? I('lock', 22) : `<span class="deptsel__radio${on ? ' on' : ''}" aria-hidden="true"></span>`}</button>`; }).join('') || '<p class="deptsel__none">No department by that name</p>'}</div>` };
  });
}
function pickReqSite(v) { S.draft.site = +v; closeAll(); render(); }
function pickApprover(v) { S.draft.approver = v; closeAll(); render(); }
const askFields = d => `<span class="az-label">What are you requesting?</span>
    <label class="az-input az-input--text"><input id="f-title" placeholder="Title" value="${esc(titleOf(d))}" oninput="S.draft.title=this.value;S.draft.titleEdited=true;redrawFoot()" aria-label="Title"></label>
    <label class="az-input az-input--text az-textarea"><textarea id="f-text" rows="4" placeholder="Description / Justification" oninput="S.draft.text=this.value;redrawFoot()" aria-label="Description Or Justification">${esc(d.text)}</textarea></label>`;
function requestDetails(d) {
  const deptName = d.dept ? dept(d.dept).name : '', to = select('Requesting To', deptName, 'deptSheet()', { placeholder: 'Select Department', disabled: !!d.edit });
  /* a diet request: who sends it, from which site and who approves are fixed, so they move to Your request at the end (owner, 3 Nov: "think more") */
  if (d.dept === 'diet') return d.fixed || d.edit ? '' : section('category', 'Requesting To', select('', deptName, 'deptSheet()'), true);
  return section('category', 'Request Details', `${to}
    ${askFields(d)}
    <div class="az-field"><span class="az-label">Requested By</span>${d.edit ? personCard(reqBy(d)) : whoCard(reqBy(d), 'dfReqSheet()', 'Requested By')}</div>
    ${d.site ? `<div class="az-field"><span class="az-label">Requesting Site</span><div class="az-site az-site--picked"><span class="az-site__thumb" style="display:grid;place-items:center;color:var(--Outline)">${I('location_on', 20)}</span><span class="grow"><span class="az-site__name">${esc(by('sites', d.site).name)}</span></span>${d.dept === 'diet' && d.targets.length ? '' : `<button class="az-iconbtn" onclick="S.draft.site=null;render()" aria-label="Remove site">${I('cancel')}</button>`}</div></div>`
      : select('Requesting Site', '', `optionSheet('Requesting Site',D.sites.map(s=>[s.id,s.name]),S.draft.site,'pickReqSite')`, { placeholder: 'Choose Site', icon: 'add_circle' })}
    ${d.approver ? `<div class="az-field"><span class="az-label">To Be Approved By</span>${personCard(d.approver, d.dept === 'diet' ? '' : 'S.draft.approver=null;render()')}</div>`
      : select('To Be Approved By', '', `personSheet('To Be Approved By',D.users.filter(u=>u.id!==reqBy(S.draft)&&(!VIEWERS.includes(u.id)||u.id==='u-suresh')).map(u=>u.id),S.draft.approver,'pickApprover')`, { placeholder: 'Add Approver', icon: 'add_circle' })}`, true);
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
          : '<div class="nodiet nodiet--seal">No species matches</div>'),
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
  const more = few.length < ts.length ? `<button class="forrow forrow--more" onclick="targetsSheet()"><span class="eav">${I('more_horiz', 22)}</span><span class="grow"><b>${ts.length - 3} more ${ts.slice(3).every(t => t.level === 'species') ? 'species' : ts.length === 4 ? 'place' : 'places'}</b><small>${esc(placesText(ts))} in all</small></span><span class="lnk">View All</span></button>` : '';
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
  return `<div class="forrow forrow--pick">${select('Only For', GROUP_OPTS.find(o => o[0] === v)[1], `optionSheet('Only For',${JSON.stringify(GROUP_OPTS).replace(/"/g, '&quot;')},'${v}','pickGroup')`)}${g && g.kind !== 'sex' ? `<div class="az-two">${num('From', 'min', g.min)}${num('To, optional', 'max', g.max)}</div>` : ''}</div>`;
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
    body = !secs.length && !encs.length && !ans.length ? `<div class="nodiet nodiet--seal">Nothing called “${esc(e.q)}”. Try another name, or choose step by step.</div>`
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
  return `<section class="az-section"><h2 class="az-section__title">${I('edit_note', 20)}<span class="grow">What should change<span class="az-req">*</span></span>${n ? `<span class="chgcount">${plural(n, 'change')}</span>` : ''}</h2>${groups.length ? mealTable(groups, isTab(), true, { add: f => `addSheet(${f})` }) : ''}${groups.length ? '' : `<button class="az-btn az-btn--add az-btn--compact" onclick="addSheet()">${I('add')}Add Item</button>`}${n ? kitchenNote(d) : ''}</section>`;
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
/* a food's sheet, after the Figma's Quantity sheet (Diet, Quantity Details Bottom Sheet): the feed time on top, the daily amount big in the
   middle with − and +, quick steps of a quarter or a half, what it was; then the food, preparation, cut and days as plain rows; Stop Giving It
   and Save at the foot */
function lsHtml() {
  const d = S.draft, n = animalsIn(asReq(d)).length || 1, add = LS.mode === 'add', was = add ? null : entryOf(baseOf(d), LS.feed, LS.item), it = LS.to ? item(LS.to) : null;
  const line = { to: LS.to, qty: LS.qty, unit: LS.unit, prep: LS.prep, cut: LS.cut, days: LS.cad ? EVERY_DAY : LS.days, cad: LS.cad }, diff = was && it && LS.qty > 0 ? Object.values(lineDiff(was, line)).some(Boolean) : true;
  const st = it && LS.qty > 0 ? stockFor(it, LS.qty, LS.unit, n) : 'ok', need = it && LS.qty > 0 ? qtyText(toBase(LS.qty, LS.unit) * n, BASE[LS.unit][0]) : '';
  const ok = it && LS.qty > 0 && LS.days && (diff || LS.had);
  const stopped = !add && (changeOf(d, LS.feed, LS.item) || {}).op === 'remove';
  const left = stopped ? `<button class="az-btn az-btn--outline" onclick="undoChange(${LS.feed},${LS.item})">${I('undo', 20)}Give It Again</button>` : !add ? `<button class="az-btn az-btn--ghost ls-stop" onclick="setChange({op:'remove',feed:${LS.feed},item:${LS.item}})">${I('do_not_disturb_on', 20)}Stop Giving It</button>` : LS.had ? `<button class="az-btn az-btn--ghost ls-stop" onclick="undoAdd(${LS.wasFeed},${LS.was})">Remove</button>` : `<button class="az-btn az-btn--outline" onclick="closeSheet()">Cancel</button>`;
  const units = it ? unitsFor(it) : [];
  const big = it ? `<div class="qbig"><button class="qbig__b" aria-label="Less" onclick="stepQty(-1)">${I('remove', 28)}</button><span class="qbig__v"><input id="ls-qty" type="number" inputmode="decimal" min="0" step="any" value="${LS.qty ?? ''}" oninput="LS.qty=+this.value;redrawSheet()" aria-label="Daily amount per animal"><button class="qbig__u" onclick="unitSheet()" ${units.length > 1 ? '' : 'disabled'} aria-label="Unit: ${LS.unit}">${LS.unit}${units.length > 1 ? I('keyboard_arrow_down', 18) : ''}</button></span><button class="qbig__b" aria-label="More" onclick="stepQty(1)">${I('add', 28)}</button></div>`
    : `<button class="qpick" onclick="pickItem()">${I('add_circle', 24)}<span>Choose The Food</span></button>`;
  const wasQ = was ? qtyText(was.qty, was.unit) : '', changedQ = was && it && LS.qty > 0 && toBase(LS.qty, LS.unit) !== toBase(was.qty, was.unit);
  const pcts = was && it ? `<div class="qpct">${[-50, -25, 25, 50].map(p => `<button class="az-chip" onclick="lsPct(${p})">${p > 0 ? '+' : '−'}${Math.abs(p)}%</button>`).join('')}</div>` : '';
  const qhead = `<div class="qhead"><span class="az-label">${LS.cad ? 'Amount Per Feed' : 'Daily Amount'} · Per Animal</span>${big}${was ? `<p class="qwas">${changedQ ? `Was <s>${wasQ}</s> · now <b>${qtyText(LS.qty, LS.unit)}</b>` : `Today ${wasQ}`}</p>` : ''}${pcts}</div>`;
  const row = (l, v, js, dis = false) => `<button class="qrow" onclick="${js}"${dis ? ' disabled' : ''}><span class="qrow__l">${l}</span><span class="qrow__v">${v}</span>${dis ? '' : I('chevron_right', 20)}</button>`;
  /* how often, as Kitchen & Diet: days of the week, every few days from a first feed, or one day a month (opened from its row) */
  const rep = LS.cad ? (LS.cad.every ? 'every' : 'monthly') : 'week';
  const repSeg = `<div class="az-segment az-segment--sm" role="tablist" aria-label="Repeats">${thumb()}${[['week', 'Days Of Week'], ['every', 'Every Few Days'], ['monthly', 'Monthly']].map(([k, l]) => `<button role="tab" aria-selected="${rep === k}" onclick="setRepeat('${k}')">${l}</button>`).join('')}</div>`;
  const days = repSeg + (rep === 'week' ? `<div class="dsel" role="group" aria-label="Days"><button class="dsel__all" aria-pressed="${LS.days === EVERY_DAY}" onclick="setDays(-1)">Daily</button>${DAYS.map((x, i) => `<button aria-pressed="${LS.days !== EVERY_DAY && !!(LS.days & (1 << i))}" aria-label="${x}" onclick="setDays(${i})">${x[0]}</button>`).join('')}</div>`
    : rep === 'every' ? `<div class="az-two"><label class="az-field"><span class="az-label">Every (days)</span><span class="az-input az-input--text"><input id="ls-every" type="number" min="2" max="60" value="${LS.cad.every}" oninput="if(+this.value>=2){LS.cad.every=+this.value;redrawSheet()}" aria-label="Every how many days"></span></label><label class="az-field"><span class="az-label">First Feed</span><span class="az-input az-input--text"><input id="ls-from" type="date" value="${LS.cad.from}" onchange="if(this.value){LS.cad.from=this.value;redrawSheet()}" aria-label="First feed"></span></label></div><span class="hint">Next: ${nextFeeds({ cad: LS.cad }, 3).map(s1 => `${wday(s1)} ${fmtDay(s1)}`).join(' · ')}</span>`
    : select('Day Of The Month', LS.cad.monthly === 'last' ? 'Last Day' : `Day ${LS.cad.monthly}`, `optionSheet('Day Of The Month',[...Array.from({length:28},(_,i)=>[i+1,'Day '+(i+1)]),['last','Last Day']],LS.cad.monthly,'pickMonthDay')`));
  const rows = `<div class="qrows">${add ? row('Time', bandText(feed(LS.feed)), `optionSheet('Time',FEEDS.map(f=>[f.id,bandText(f)]),LS.feed,'pickLsFeed')`) : ''}
    ${row(add ? 'Food' : 'Food', it ? `${esc(it.name)}${!add && LS.to !== LS.item ? ` <small>was ${esc(item(LS.item).name)}</small>` : ''}` : '<span class="qrow__ph">Choose</span>', 'pickItem()')}
    ${row('Preparation', esc(LS.prep || 'None'), `optionSheet('Preparation',[['','None'],...PREPS.map(p=>[p,p])],LS.prep,'pickPrep')`)}
    ${row('Cut Size', esc(LS.cut || 'None'), `optionSheet('Cut Size',[['','None'],...CUTS.map(p=>[p,p])],LS.cut,'pickCut')`)}
    ${row('Days', esc(lineDays({ days: LS.days, cad: LS.cad })), 'LS.showDays=!LS.showDays;redrawSheet()')}
    ${LS.showDays ? `<div class="qdays">${days}</div>` : ''}</div>`;
  const warn = st !== 'ok' ? `<div class="az-warnline">${I('warning', 20)}<span>${st === 'out' ? `<b>${esc(it.name)} is out of stock.</b>` : `<b>Only ${stockText(it)} ${esc(it.name)} in stock.</b> It needs ${need} a day.`}</span></div>` : '';
  return { title: add ? 'Add Food' : esc(item(LS.item).name), sub: `${I('schedule', 16)}${bandText(feed(LS.feed))} feed`, form: true, step: `ls:${add ? 'add' : LS.item}`,
    body: (add && !it ? '' : qhead) + rows + warn,
    foot: `${left}<button class="az-btn"${ok ? '' : ' disabled'} onclick="saveLine()">${add ? 'Add' : diff || !LS.had ? 'Save' : 'Undo Change'}</button>` };
}
/* a quarter or a half more or less than today's amount */
function lsPct(p) { const w = entryOf(baseOf(S.draft), LS.feed, LS.item); if (!w) return; LS.qty = Math.max(0, round(toBase(w.qty, w.unit) * (1 + p / 100) / BASE[LS.unit][1])); redrawSheet(); }
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
  return { title: 'Choose Item', body: `<label class="az-search" style="background:var(--white)">${I('search', 20)}<input id="ip-q" placeholder="Search items" value="${esc(IP.q)}" oninput="IP.q=this.value;redrawSheet()" aria-label="Search items"></label>${chips('In stock', ok)}${chips('Low stock', low, true)}${list.length ? '' : '<div class="nodiet nodiet--seal">No item matches</div>'}` };
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
  const other = d.startFrom === 'other' ? select('Diet To Start From', d.base ? diet(d.base).name : '', 'otherDietSheet()', { req: true, placeholder: 'Choose diet', id: 'f-from' }) : '';
  return section('add_circle', 'The New Diet', `<div class="az-field"><span class="az-label">Start From</span><div class="daychips">${chips.map(([k, l]) => `<button aria-pressed="${d.startFrom === k}" onclick="setStart('${k}')">${l}</button>`).join('')}</div></div>${other}
    <label class="az-field"><span class="az-label">Diet name <span class="az-req">*</span></span><span class="az-input az-input--text"><input id="f-name" value="${esc(dietNameOf(d))}" oninput="S.draft.name=this.value;S.draft.nameEdited=true;redrawFoot()" aria-label="Diet name"></span></label>`, true) + itemsSec(d);
}
function setStart(k) { const d = S.draft; d.startFrom = k; if (k === 'other') { d.base = null; d.changes = []; render(); otherDietSheet(); return; } sync(d); render(); }
function otherDietSheet() {
  openSheet(() => { const d = S.draft, sps = new Set(d.targets.map(t => t.sp)), list = D.diets.filter(x => D.assigns.some(a => a.diet === x.id && !ended(a))).sort((x, y) => sps.has(y.sp) - sps.has(x.sp) || x.name.localeCompare(y.name));
    return { title: 'Start From', bottom: true, body: list.map(x => `<button class="az-pickrow" role="radio" aria-checked="${d.base === x.id}" onclick="pickFrom('${x.id}')"><span class="az-pickrow__t"><b>${esc(x.name)}</b><span>${esc(species(x.sp).name)} · ${plural(dietItems(x), 'item')}</span></span>${I(d.base === x.id ? 'radio_button_checked' : 'radio_button_unchecked', 24, d.base === x.id)}</button>`).join('') };
  });
}
function pickFrom(id) { const d = S.draft; if (d.base !== id) { d.base = id; d.changes = []; } closeAll(); render(); }
/* End a diet early: its last day */
const stopSec = d => section('event_busy', 'Last Day', `<div class="daychips">${[[0, 'Today'], [1, 'Tomorrow']].map(([n, l]) => `<button aria-pressed="${d.stop === addDays(TODAY, n)}" onclick="S.draft.stop='${addDays(TODAY, n)}';render()">${l} · ${fmtDay(addDays(TODAY, n))}</button>`).join('')}</div>
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
  return section('event', 'How Long', `${seg}<div class="howtag">${ktag(HOW_KIND[d.how])}<span>${d.how === 'always' ? 'Starts when approved' : yr ? 'Comes back every year' : 'Runs once, then they go back'}</span></div>${dates}`, true);
}
function setHow(k) { const d = S.draft; d.how = k; if (k === 'once' && (!d.start || d.start < TODAY)) { d.start = addDays(TODAY, 1); d.end = addDays(TODAY, 14); } render(); }
/* When approved: what Kitchen & Diet will do, worked out from its rules (plan.js), before anyone sends it */
function effectSec(d, p) {
  const sps = new Set(d.targets.map(t => t.sp));
  const rows = p.lines.map(l => { const tag = l.view ? 'button' : 'div';
    return `<${tag} class="forrow${l.view ? '' : ' forrow--static'}"${l.view ? ` onclick="reachSheet('${l.view}')"` : ''}><span class="eav">${I(l.icon, 20)}</span><span class="grow"><b>${esc(l.b)}</b>${l.small ? `<small>${esc(l.small)}</small>` : ''}${l.x ? `<small>${esc(l.x)}</small>` : ''}</span>${l.tag ? ktag(l.tag) : l.view ? I('chevron_right', 20) : ''}</${tag}>`; }).join('');
  const ask = p.shared ? `<div class="az-field effect__ask"><span class="az-label">Also fed to ${esc(p.shared.map(s => s.name).join(', '))}. Change it for <span class="az-req">*</span></span><div class="az-segment" role="tablist">${thumb()}${[['all', 'All species'], ['only', sps.size === 1 ? `Only ${species([...sps][0]).name}` : 'Only these species']].map(([k, l]) => `<button role="tab" aria-selected="${d.forAll === k}" onclick="S.draft.forAll='${k}';render()">${esc(l)}</button>`).join('')}</div></div>` : '';
  const warn = p.block ? `<div class="az-warnline az-warnline--bad">${I('error', 18)}<span>${esc(p.block)}</span></div>` : '';
  return section('task_alt', 'When Approved', `${warn}${rows ? `<div class="forcard effect">${rows}</div>` : ''}${ask}`);
}
/* the animals behind a line of When approved: who gets it, who moves, who keeps their own diet; or every diet that changes */
function reachSheet(view, id = '') {
  openSheet(() => { const r = id ? by('requests', id) : asReq(S.draft), p = planOf(r);
    if (view === 'ops') return { title: 'Diets That Change', sub: plural(p.ops.length, 'diet'), bottom: true, body: p.ops.map(o => eatGrp(`<span class="davatar">${I(o.type === 'edit' ? 'edit' : o.type === 'share' ? 'swap_horiz' : 'add')}</span>`, o.type === 'edit' ? diet(o.diet).name : o.name || diet(o.diet).name, o.type === 'edit' ? `Changed · ${plural(o.changes.length, 'change')}` : `New · for ${placesText(o.slots)}`, '', [])).join('') };
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
  return `<section class="az-section"><h2 class="az-section__title">${I('edit_note', 20)}<span class="grow">What should change<span class="az-req">*</span></span>${n ? `<span class="chgcount">${plural(n, 'change')}</span>` : ''}</h2><div class="forcard rulecard">${rows}<button class="forrow" onclick="ruleSheet()"><span class="eav">${I('add_circle', 22)}</span><span class="grow"><b>Add A Change</b><small>Said once, for each of their diets</small></span>${I('chevron_right', 20)}</button></div>${n ? kitchenNote(d) : ''}</section>`;
}
function ruleSheet() { LS = { mode: 'add', rule: true, op: 'add', feed: FEEDS[0].id, to: null, item: null, qty: null, unit: null, prep: '', cut: '', days: EVERY_DAY, cad: null, pct: -10, had: false }; openSheet(ruleHtml); }
function ruleHtml() {
  const seg = `<div class="az-segment" role="tablist" aria-label="Change">${thumb()}${RULE_OPS.map(([k, l]) => `<button role="tab" aria-selected="${LS.op === k}" onclick="LS.op='${k}';redrawSheet()">${l}</button>`).join('')}</div>`;
  const foot = ok => `<button class="az-btn az-btn--outline" onclick="closeSheet()">Cancel</button><button class="az-btn"${ok ? '' : ' disabled'} onclick="saveRule()">Add</button>`;
  if (LS.op === 'add') { const h = lsHtml(); return { title: 'Add A Change', form: true, body: seg + h.body, foot: foot(LS.to && LS.qty > 0) }; }
  const cnt = {}; eatOf(S.draft).list.forEach(e => new Set(e.diet.meals.flatMap(m => m.items.map(i => i.item))).forEach(id => { cnt[id] = (cnt[id] || 0) + 1; }));
  const opts = Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(([id, n]) => [+id, item(+id).name, `In ${plural(n, 'diet')}`]);
  const body = select('Item', LS.item ? item(LS.item).name : '', `optionSheet('Item',${JSON.stringify(opts).replace(/"/g, '&quot;')},LS.item,'pickRuleItem')`, { req: true, placeholder: 'Choose Item' })
    + (LS.op === 'replace' ? select('Replace With', LS.to ? item(LS.to).name : '', 'pickItem()', { req: true, placeholder: 'Choose Item' }) : '')
    + (LS.op === 'amount' ? `<div class="az-field"><span class="az-label">Change The Amount By <span class="az-req">*</span></span><div class="qtyf"><button class="qtyf__b" aria-label="Less" onclick="LS.pct=Math.max(-90,(LS.pct||0)-10);redrawSheet()">${I('remove')}</button><input id="ls-pct" type="number" value="${LS.pct ?? 0}" oninput="LS.pct=+this.value;redrawSheet()" aria-label="Percent"><span class="qtyf__u">%</span><button class="qtyf__b" aria-label="More" onclick="LS.pct=Math.min(200,(LS.pct||0)+10);redrawSheet()">${I('add')}</button></div></div>` : '');
  return { title: 'Add A Change', form: true, body: seg + body, foot: foot(LS.item && (LS.op === 'stop' || (LS.op === 'replace' && LS.to && LS.to !== LS.item) || (LS.op === 'amount' && LS.pct && LS.pct > -100))) };
}
function pickRuleItem(v) { LS.item = +v; SH.pop(); redrawSheet(); }
function saveRule() { const L0 = LS; S.draft.rules.push(L0.op === 'add' ? { op: 'add', item: L0.to, feed: L0.feed, qty: L0.qty, unit: L0.unit, prep: L0.prep, cut: L0.cut, days: L0.cad ? EVERY_DAY : L0.days, cad: L0.cad || null } : L0.op === 'amount' ? { op: 'amount', item: L0.item, pct: L0.pct } : { op: L0.op, item: L0.item, to: L0.to || null }); closeAll(); render(); }
const kitchenNote = d => `<label class="az-field"><span class="az-label">Note To Kitchen (optional)</span><span class="az-input az-input--text az-textarea"><textarea id="d-note" rows="2" placeholder="Preparation, timing, serving" oninput="S.draft.note=this.value">${esc(d.note)}</textarea></span></label>`;
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
const attachSec = d => section('attach_file', 'Attachments If Any', d.files.length ? `<div class="ftiles">${d.files.map((f, i) => `<span class="ftile ftile--${f.kind}"><span class="ftile__p">${I(f.kind === 'image' ? 'image' : f.kind === 'pdf' ? 'picture_as_pdf' : 'description', 32)}</span><b>${esc(f.name)}</b><small>${esc(f.size || '')}</small><button class="ftile__x" onclick="S.draft.files.splice(${i},1);render()" aria-label="Remove ${esc(f.name)}">${I('cancel', 22, true)}</button></span>`).join('')}</div><button class="lnk att-more" onclick="addFile()">${I('add_circle', 20)}Add More</button>`
  : `<button class="az-upload" onclick="addFile()"><i class="az-i" aria-hidden="true">add_photo_alternate</i><b>Upload Files</b><span>Supported: JPEG, PNG, PDF, MP4 (Max 50 MB)</span></button>`);
/* Priority as the Figma Help Desk form (Request Module, Priority Section): Normal · High · Emergency, one tap */
const prioSec = d => section('error', 'Priority', `<div class="prio-opts" role="radiogroup" aria-label="Priority">${Object.entries(PRIO).map(([k, [g, l]]) => `<button class="prio-opt${d.prio === k ? ' on' : ''}" role="radio" aria-checked="${d.prio === k}" onclick="S.draft.prio='${k}';render()" title="${esc(PRI_TEXT[k])}"><span class="prio-opt__c prio-opt__c--${k}">${k === 'emergency' ? I('local_fire_department', 20, true) : g}</span>${l}</button>`).join('')}</div>`);
/* (the top-right priority pill: kept for the sheet, the form now has the Priority section) */
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
  return section('send', 'Your Request', title + `<div class="rsec">${[ap ? row('how_to_reg', 'To Be Approved By', `${esc(ap.name)} · ${esc(ap.title)}`) : '',
    row('person', 'Requested By', `${youName(S.user)} · ${esc(u.title)}`), d.site ? row('location_on', 'Requesting Site', esc(by('sites', d.site).name)) : ''].join('')}</div>`);
}
/* ---------- a diet request in steps, one question at a time (as Kitchen & Diet's create-diet wizard), owner 3 Nov: "Full scroll… rethink".
   Phone: a progress bar, the answers so far as chips, the step, Back | Next. iPad: the steps down the left with their answers (tap one to go
   back); in landscape, When approved stays on the right as you answer ---------- */
const STEP_NAME = { what: 'What', for: 'For', change: 'Changes', how: 'How Long', day: 'Day And Feeds', last: 'Last Day', send: 'Check And Send' };
const stepsOf = d => d.kind === 'skip' ? ['what', 'for', 'day', 'send'] : d.kind === 'end' ? ['what', 'for', 'last', 'send'] : ['what', 'for', 'change', 'how', 'send'];
const stepName = (d, s) => s === 'change' ? (d.kind === 'new' ? 'The New Diet' : d.kind === 'diet' ? 'Which diet' : 'Changes') : STEP_NAME[s];
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
  if (d.dept === 'diet') { const e = dfErr(d); return `<div class="az-actionbar"><button class="az-btn${e ? ' az-btn--disabled' : ''}" aria-disabled="${!!e}" onclick="submitDraft()">${d.edit ? 'Update Request' : 'Submit Request'}</button></div>`; }
  const e = err(d);
  return `<div class="az-actionbar"><button class="az-btn${e ? ' az-btn--disabled' : ''}" aria-disabled="${!!e}" onclick="submitDraft()">${d.edit ? 'Update Request' : 'Submit Request'}</button></div>`;
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
  if (d.blocked) return pane('pane--fill', topbar({ back: close, title: 'Edit Request' }), empty1('This request can no longer be edited', '', 'sloth'));
  if (d.pick) return whoPage(d.pick, 'S.draft.pick', { back: 'S.draft.pick=null;render()', done: 'dfWhoDone()' });
  if (d.ent) return paneEntity(d);
  const top = topbar({ close: `go('${close}')`, title: d.edit ? 'Edit Request' : 'New Request', actions: prioBtn(d.prio, "prioMenu(this,S.draft.prio,'setFormPrio')") }), foot = `<div id="form-foot">${formFoot(d)}</div>`;
  if (d.dept === 'diet') return pane('pane--fill form-page', top, `<div class="body">${dietForm(d)}</div>`, foot, `form-${d.key}`);
  const secs = [requestDetails(d)];
  if (DEPT_FORMS[d.dept]) secs.push(deptSection(d));
  secs.push(attachSec(d));
  return pane('pane--fill form-page', top, `<div class="body">${secs.join('')}</div>`, foot, `form-${d.key}`);
}
const DIET_KEYS = ['targets', 'group', 'date', 'feeds', 'slot', 'base', 'start', 'end', 'changes', 'rules', 'diet', 'ends', 'stop', 'how', 'name', 'forAll'];
function submitDraft() {
  const d = S.draft;
  if (!d || d.blocked) return;
  if (d.dept === 'diet') return dfSubmit(d);
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
    if (!r || !ownsReq(r, S.user) || !isOpen(r)) { toast(`Can't edit ${d.edit} now`); return; }
    const was = r.state;
    DIET_KEYS.forEach(k => delete r[k]);
    Object.assign(r, fields, { state: 'pending', delay: null });
    r.events.push({ kind: 'edited', by: S.user, at: nowStamp(), note: was === 'delayed' ? 'Changed after the delay. Back for approval.' : '' });
  } else {
    r = { id: newRequestId(), ...fields, by: reqBy(d), ...(reqBy(d) !== S.user ? { raisedBy: S.user } : {}), state: 'pending', events: [{ kind: 'raised', by: S.user, at: nowStamp() }] };
    D.requests.push(r);
  }
  S.draft = null; S.rTab = 'pending'; S.rDept = 'all'; storeSave();
  toast(`${d.edit ? 'Saved and sent' : 'Request sent'} · ${r.id}`); go(`#/requests/${r.id}`);
}
/* a form whose draft is gone (sent, closed or reset while it leaves the screen) takes no more taps or typing */
['click', 'input', 'change'].forEach(t => document.addEventListener(t, e => { if (!S.draft && e.target.closest && e.target.closest('.form-page')) { e.stopPropagation(); e.preventDefault(); } }, true));

/* ---------- a Diet request in New Request (owner, 18 Nov 2026: "variations for the Diet changes, and different requests also in Diet").
   The Help Desk app's form stays; Request type picks one of nine, and each asks only its own few questions. Five change a diet through
   Kitchen & Diet's rules (plan.js); four are jobs for the dietician or the kitchen (JOB_KINDS) ---------- */
/* (owner, 19 Nov 2026: "two versions: one for a normal text diet request, one for Diet items changes") two kinds of diet request:
   - Diet request: said in words for the kitchen (skip a feed, an extra feed, medicine with food …); the diet itself stays as it is;
   - Diet change: the diet's configuration (change item values, another diet, a new diet); approving it changes the diet.
   Anybody can raise either; the Dietician approves; approving applies it, and the kitchen works from the diet as it now is */
const DGROUPS = [['request', 'Diet Request', 'Skip a feed, extra feed, medicine with food', 'chat'], ['change', 'Diet Change', 'Change item values, another diet or a new diet', 'tune']];
const DTYPES = [
  ['skip', 'skip', 'Skip A Feed', 'Fasting, a vet procedure or a transfer', 'no_meals', 'request'],
  ['extra', 'extra', 'Extra Feed', 'Treats, enrichment or an event', 'cookie', 'request'],
  ['medicine', 'medicine', 'Medicine With Food', 'Mix a medicine into a feed', 'medication', 'request'],
  ['quality', 'quality', 'Food Quality', 'Spoiled, wrong cut or wrong amount', 'report', 'request'],
  ['other', 'other', 'Something Else', 'Anything else for the diet team', 'more_horiz', 'request'],
  ['change', 'items', 'Change Item Values', 'More, less, swap, add or stop a food', 'tune', 'change'],
  ['move', 'diet', 'Another Diet', 'Move them to a diet that already exists', 'restaurant', 'change'],
  ['newdiet', 'new', 'New Diet', 'Start from a diet and set its foods', 'add_circle', 'change'],
  ['end', 'end', 'End A Diet Early', 'Back to their usual diet sooner', 'event_busy', 'change'],
];
const dtOf = k => DTYPES.find(x => x[0] === k);
/* a request's type from its kind ('ask' is a new diet with nothing to start from: the dietician builds it) */
const dtOfKind = k => DTYPES.find(x => x[1] === (k === 'ask' ? 'new' : k));
const dgOf = k => DGROUPS.find(x => x[0] === k);
/* the dietician who approves: the Diet head, or the next approver when the head raises it */
const dietApprover = () => S.user === dept('diet').head ? DIET_APPROVERS.find(id => id !== S.user && user(id).role === 'dietician') || DIET_APPROVERS.find(id => id !== S.user) : dept('diet').head;
const JOB_KINDS = ['ask', 'extra', 'medicine', 'quality', 'other'];
Object.assign(KIND, { ask: ['New diet', 'add_circle'], extra: ['Extra feed', 'cookie'], medicine: ['Medicine with food', 'medication'], quality: ['Food quality', 'report'], other: ['Something else', 'more_horiz'] });
/* one icon per request type everywhere (owner, 20 Nov 2026: "see all the icons"): the request page's tile uses the type's own icon from Select Request Type */
DTYPES.forEach(x => { if (KIND[x[1]]) KIND[x[1]] = [KIND[x[1]][0], x[4]]; });
/* a request that changes a diet (the rules engine); the others are said in words for the kitchen */
const changesDiet = r => isDiet(r) && !JOB_KINDS.includes(r.kind);
/* which of the two a diet request is: 'request' (in words: Skip a feed, Extra feed …) or 'change' (the diet's configuration) */
const dgroupOf = r => (dtOfKind(r.kind) || DTYPES[5])[5];
/* the request's kind as sent: a new diet with nothing to start from is 'ask' (the dietician builds it) */
const dfKind = d => d.dtype === 'newdiet' && !d.base ? 'ask' : dtOf(d.dtype)[1];
const DAY_WORD = n => n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n === -1 ? 'Yesterday' : wday(addDays(TODAY, n));
/* what a request in words asks, said as rows on its request (kept when it is sent) */
function dfRows(d) {
  const f = d.f || {}, feeds = l => l === 'all' || !(l || []).length ? 'Whole day' : l.map(x => bandText(feed(x))).join(', '), day = n => `${DAY_WORD(n)} · ${fmtDay(addDays(TODAY, n))}`;
  switch (d.dtype) {
    case 'newdiet': return [['Needed from', day(f.from ?? 1)]];
    case 'extra': { const ds = extraDays(f); return [['When', ds.length > 1 ? `${cap(datesText(ds))} · ${ds.length} days` : day(daysBetween(TODAY, ds[0]))], ['Feed', feeds(f.feed)]]; }
    case 'medicine': return [['From', day(f.from ?? 0)], ['Feed', feeds(f.feed)], ['For', `${f.days ?? 5} days`]];
    case 'quality': return [['Which day', day(f.day ?? 0)], ['Feed', feeds(f.feed)]];
    default: return [];
  }
}
/* what the details box asks for, by type */
const DT_HINT = { change: 'Why the food has to change, for example weight loss', move: 'Why they should move to this diet, and anything the kitchen should know', skip: 'Why the feed is skipped, for example a vet procedure', extra: 'Which food, how much and why', medicine: 'Which medicine, the dose and how to mix it', quality: 'What was wrong, and with which food', other: 'What the diet team should do', newdiet: 'What the new diet is for' };
/* choice chips: the picked one shows a tick; a day chip says its date, a feed chip its clock (owner, 18 Nov: "other things also some work") */
const dchips = (opts, on, js, icon = '') => `<div class="sg-chips dchips">${opts.map(([v, l, sub]) => `<button class="az-chip" aria-selected="${on(v)}" onclick="${js(v)}">${on(v) ? I('check', 18) : icon ? I(icon, 18) : ''}<span>${esc(l)}${sub ? `<small>${esc(sub)}</small>` : ''}</span></button>`).join('')}</div>`;
const dayOpt = (n, l) => [n, l, `${wday(addDays(TODAY, n))} ${+addDays(TODAY, n).slice(8)} ${MON[+addDays(TODAY, n).slice(5, 7) - 1]}`];
const dfield = (label, body, req = false, id = '') => `<div class="az-field"${id ? ` id="${id}"` : ''}><span class="az-label">${label}${req ? ' <span class="az-req">*</span>' : ''}</span>${body}</div>`;
const dfEat = d => d.targets[0] ? eatNow([d.targets[0]]).list : [];
/* every feed time of the kitchen, in time order (owner, 20 Nov 2026: "feed time also can be more"), not only the two of their diet */
const dfFeeds = d => [...FEEDS].sort((a, b) => a.from.localeCompare(b.from)).map(f => f.id);
/* When (owner, 20 Nov 2026: "the When container looks very hard; day and feed selection not satisfying"): a field is its label with the answer
   on the right, then one row to choose from.
   - Day: a strip of the next three weeks, one cell per day (weekday, date, month), today marked; the calendar cell at the end picks any other
     date. A past day (food quality) runs back from today.
   - Feeds: the kitchen's feed times as equal tiles, the start big and the end under it; tap one or more. */
const dayLong = n => { const iso = addDays(TODAY, n); return `${n === 0 ? 'Today · ' : n === 1 ? 'Tomorrow · ' : n === -1 ? 'Yesterday · ' : ''}${wday(iso)} ${fmtDay(iso)}`; };
const wfield = (label, answer, body, { req = false, ph = false, id = '' } = {}) => `<div class="wf"${id ? ` id="${id}"` : ''}><div class="wf__h"><span>${label}${req ? ' <span class="az-req">*</span>' : ''}</span><b${ph ? ' class="ph"' : ''}>${answer}</b></div>${body}</div>`;
/* (owner, 26 Nov 2026) a day is a field: a tap opens the calendar popup (js/calpick.js); the strip is gone */
function dayStrip(cur, key, { past = false, days = 21, max = 365, label = 'Select Date' } = {}) {
  const lo = past ? addDays(TODAY, -60) : TODAY, hi = past ? TODAY : addDays(TODAY, max), iso = typeof cur === 'number' ? addDays(TODAY, cur) : null;
  return calField({ dates: iso ? [iso] : [], open: `calOpen({title:'${label}',sel:${iso ? `['${iso}']` : '[]'},lo:'${lo}',hi:'${hi}',cb:'dfCalDay',key:'${key}'})` });
}
function dfCalDay(ds) { dfSetDay(CALP.key, daysBetween(TODAY, ds[0])); }
/* a strip keeps its picked day in view (a date picked from the calendar lands at its end) */
function stripView() { document.querySelectorAll('.dstrip, .hdpills').forEach(row => { const c = row.querySelector('.on, [aria-selected="true"]'); if (c && (c.offsetLeft < row.scrollLeft || c.offsetLeft + c.offsetWidth > row.scrollLeft + row.clientWidth)) row.scrollTo({ left: c.offsetLeft - 12, behavior: calm() ? 'auto' : 'smooth' }); }); }
/* Days (owner, 20 Nov 2026, again: "only one date could be chosen; I want a particular week or different dates; Every Day For A Week in its
   proper place; give the container some space"). First how many, as the design system's segment, then:
   - One Day: the strip, one tap;
   - Several Days: the same strip, each tap adds or takes away a day;
   - A Week: the weeks as cards (This Week, Next Week, the ones after; the calendar card picks the week of any date).
   A skip keeps its days on the draft (d.dates), an extra feed in its answers (d.f.dates) */
const DMODES = [['one', 'One Day'], ['some', 'Several Days'], ['week', 'A Week']];
const dstate = k => k === 'skip' ? S.draft : S.draft.f;
const skipDays = d => (d.dates && d.dates.length ? d.dates : d.dates ? [] : [d.date]).filter(Boolean);
/* an extra feed's days; older drafts kept an offset (f.when) and a week switch */
function extraDays(f) { if (f.dates) return f.dates; const n = typeof f.when === 'number' ? f.when : 1, a = addDays(TODAY, n); return f.week || f.when === 'week' ? Array.from({ length: 7 }, (_, i) => addDays(a, i)) : [a]; }
/* the week (Monday to Sunday) a day is in, from today on */
const weekOf = iso => { const mon = addDays(iso, -((new Date(iso + 'T00:00:00').getDay() + 6) % 7)); return Array.from({ length: 7 }, (_, i) => addDays(mon, i)).filter(x => x >= TODAY); };
const isWeek = ds => ds.length > 1 && JSON.stringify(weekOf(ds[0])) === JSON.stringify([...ds].sort());
const dmodeOf = ds => ds.length <= 1 ? 'one' : isWeek(ds) ? 'week' : 'some';
function dfSetDates(k, ds, m) { const o = dstate(k); o.dates = [...new Set(ds)].sort(); if (m) o.dmode = m; if (k === 'skip' && o.dates[0]) S.draft.date = o.dates[0]; render(); }
function dfDmode(k, m) { const o = dstate(k), ds = o.dates || [], first = ds[0] || addDays(TODAY, 1); if ((o.dmode || 'one') === m) return; dfSetDates(k, m === 'week' ? weekOf(first) : [first], m); playFx($(`#wd-${k} [data-fx]`), 'sh-swap'); }
function dfTapDay(k, iso) { const o = dstate(k), ds = o.dates || [], m = o.dmode || 'one';
  if (m === 'one') dfSetDates(k, [iso]); else if (m === 'some') dfSetDates(k, ds.includes(iso) ? ds.filter(x => x !== iso) : [...ds, iso]); else dfSetDates(k, weekOf(iso)); }
/* Days: one field; a tap opens Select Days (One day · Several days · A week, then the month); the days come back as chips */
function daysField(k, label, req) {
  const o = dstate(k), m = o.dmode || 'one', ds = (k === 'skip' ? skipDays(o) : extraDays(o)).slice().sort(), n = ds.length;
  const answer = !n ? 'Choose the days' : m === 'week' ? 'A week' : plural(n, 'Day');
  const field = calField({ dates: ds, ph: 'Choose the days', id: `wd-${k}-f`, remove: k === 'skip' ? 'dfDropSkip' : 'dfDropExtra',
    open: `calOpen({title:'Select ${label}',modes:true,mode:'${m}',sel:${JSON.stringify(ds).replace(/"/g, "'")},cb:'dfCalDays',key:'${k}'})` });
  return `<div class="wf wd" id="wd-${k}"><div class="wf__h"><span>${label}${req ? ' <span class="az-req">*</span>' : ''}</span><b${n ? '' : ' class="ph"'}>${answer}</b></div>${field}</div>`;
}
function dfCalDays(ds, mode) { dfSetDates(CALP.key, ds, mode); }
const dfDropDay = (k, iso) => { const o = dstate(k), ds = (k === 'skip' ? skipDays(o) : extraDays(o)).filter(x => x !== iso); dfSetDates(k, ds, ds.length <= 1 ? 'one' : o.dmode === 'week' ? 'some' : o.dmode); };
function dfDropSkip(iso) { dfDropDay('skip', iso); }
function dfDropExtra(iso) { dfDropDay('extra', iso); }
/* the kitchen's feed times as tiles; on(f) says if one is picked, js(f) what a tap does */
const feedTiles = (on, js) => `<div class="feedts" role="group" aria-label="Feeds">${dfFeeds().map(f => { const x = feed(f), y = on(f);
  return `<button class="feedt${y ? ' on' : ''}" role="checkbox" aria-checked="${y}" onclick="${js(f)}"><b>${x.from}</b><small>to ${x.to}</small></button>`; }).join('')}</div>`;
const feedsText = l => l === 'all' ? 'Whole Day' : (l || []).length ? (l.length > 2 ? plural(l.length, 'Feed') : l.map(f => feed(f).from).join(', ')) : 'Choose one or more';
function dfSetDay(k, n) { const d = S.draft; if (k.startsWith('f.')) d.f[k.slice(2)] = n; else if (k === 'date' || k === 'stop') d[k] = addDays(TODAY, n); else d[k] = n; render(); }
function dfToggleF(k, f) { const d = S.draft, l = Array.isArray(d.f[k]) ? d.f[k] : []; d.f[k] = (l.includes(f) ? l.filter(x => x !== f) : [...l, f]).sort((a, b) => feed(a).from.localeCompare(feed(b).from)); render(); }
const dfPlace = d => d.targets[0] ? sgName(d.targets[0]) : '';
function dfDates(d) {
  if (d.how === 'yearly') { const s = SG_SEASONS.find(x => x[0] === d.season) || SG_SEASONS[2]; return { start: s[1], end: s[2] }; }
  const start = addDays(TODAY, d.from); return d.how === 'once' ? { start, end: addDays(start, d.days - 1) } : { start, end: null };
}
/* the request as it would be sent */
function dfReq(d) {
  const t = d.targets[0], kind = dfKind(d), x = dfEat(d).find(e => e.diet.id === d.base) || dfEat(d)[0];
  const r = { dept: 'diet', kind, targets: [{ ...t }], sp: t.sp, level: t.level, ref: t.ref ?? null, reason: d.reason || '', approver: d.approver, by: S.user };
  if (kind === 'items') Object.assign(r, { base: d.base, slot: x ? topSlot(x).id : null, changes: d.changes.map(c => ({ ...c })), how: d.how || 'always', ...dfDates(d) });
  if (kind === 'new') Object.assign(r, { base: d.base, changes: d.changes.map(c => ({ ...c })), how: d.how || 'always', name: (d.name || '').trim(), ...dfDates(d) });
  if (kind === 'diet') Object.assign(r, { base: x ? x.diet.id : null, diet: d.diet, how: d.how || 'always', ...dfDates(d) });
  if (kind === 'end') Object.assign(r, { ends: [...d.ends], stop: d.stop });
  if (kind === 'skip') { const ds = skipDays(d); Object.assign(r, { date: ds[0] || d.date, ...(ds.length > 1 ? { dates: ds } : {}), feeds: d.feeds === 'all' ? 'all' : [...d.feeds] }); }
  if (JOB_KINDS.includes(kind)) r.f = JSON.parse(JSON.stringify(d.f || {}));
  return r;
}
/* the name a new diet gets when nobody types one (Kitchen & Diet's naming, plan.js) */
const dfNewName = d => d.targets[0] && d.base ? ((planOf(dfReq(d)).ops.find(o => o.type === 'new') || {}).name || '') : '';
function dfAuto(d) {
  if (!d.dtype || !d.targets[0]) return '';
  const p = dfPlace(d), r = dfReq(d);
  switch (d.dtype) {
    case 'change': return d.changes.length ? autoTitle(r) : '';
    case 'newdiet': return d.base && ((d.name || '').trim() || dfNewName(d)) ? `New diet: ${(d.name || '').trim() || dfNewName(d)}` : `New diet for ${p}`;
    case 'move': return d.diet ? `Move ${p} to ${diet(d.diet).name}` : '';
    case 'end': return d.ends.length ? `End ${diet(by('assigns', d.ends[0]).diet).name} early` : '';
    case 'skip': { const ds = skipDays(d), on = ds.length > 1 ? `on ${datesText(ds)}` : dayText(ds[0] || d.date);
      return d.feeds === 'all' ? `No feed ${on} · ${p}` : d.feeds.length ? `Skip the ${d.feeds.map(f => feed(f).from).join(' and ')} feed ${on} · ${p}` : ''; }
    case 'extra': return `Extra feed for ${p}`;
    case 'medicine': return `Medicine with food for ${p}`;
    case 'quality': return `Food quality issue · ${p}`;
    default: return '';
  }
}
const dfTitle = d => d.titleEdited ? d.title : dfAuto(d);
/* a title from the description when nothing else names the request: its first line, cut at a word near 60 letters */
const firstWords = t => { const l = (t || '').trim().split('\n')[0]; return l.length <= 60 ? l : l.slice(0, 60).replace(/\s+\S*$/, '') + '…'; };
function dfErr(d) {
  if (!d.dgroup) return 'Choose a diet request or a diet change';
  if (!d.dtype) return 'Choose the type';
  if (!d.targets[0]) return 'Choose who it is for';
  const k = d.dtype, kind = dfKind(d), words = dtOf(k)[5] === 'request';
  if (k === 'change') { if (!d.base) return 'They have no diet to change'; if (!d.changes.length) return 'Change a food'; if (!d.how) return 'Choose how long'; }
  if (k === 'newdiet' && d.base && !d.how) return 'Choose how long';
  if (k === 'move') { if (!d.diet) return 'Choose the diet to move to'; if (!d.how) return 'Choose how long'; }
  if (k === 'end' && !d.ends.length) return 'Choose the diet to end';
  if (k === 'skip' && !skipDays(d).length) return 'Choose the days';
  if (k === 'extra' && !extraDays(d.f).length) return 'Choose the days';
  if (k === 'skip' && d.feeds !== 'all' && !d.feeds.length) return 'Choose the feeds to skip';
  if (!words && !['move', 'change'].includes(d.dtype) && !d.reason) return 'Choose why';
  if (!d.text.trim()) return 'Add the details';
  if (['items', 'diet', 'end', 'skip', 'new'].includes(kind)) { const p = planOf(dfReq(d)); if (p.block) return p.block; }
  return '';
}
/* the changed foods, as Item requests' review: Food | Was | Now, the old value struck through */
const dfFoods = (d, label) => d.changes.length ? `<div class="dfh">${I('restaurant', 20)}<span class="grow"><b>${esc(diet(d.base).name)}</b><small>${plural(d.changes.length, 'change')}</small></span><button class="lnk" onclick="dfEditFood()">Edit Foods</button></div>${diffTable(d.changes, diet(d.base))}`
  : `<button class="az-btn az-btn--outline df-edit" id="f-name" onclick="dfEditFood()">${I('edit_note')}${label}</button>`;
/* What Changes, in the form itself (owner, 20 Nov 2026: "Change Item Values needs a proper UI, check the Figma"): the diet as the Figma's meal
   cards (Diet, Meal Details: the feed time on top, its foods under it), each food one row with its amount on the right. A tap opens the
   food's Quantity sheet; a changed food shows the old amount struck through, a stopped one is struck through, an added one says New */
function foodEditor(d) {
  const base = baseOf(d), n = d.changes.length, feeds = [...new Set([...base.meals.map(m => m.feed), ...d.changes.filter(c => c.op === 'add').map(c => c.feed)])].sort((a, b) => a - b);
  const amt = (q, u) => qtyText(q, u);
  const row = (f, l) => { const c = changeOf(d, f, l.item), stop = c && c.op === 'remove', chg = c && c.op === 'change', to = chg ? c.to : l.item, x = chg ? lineDiff(l, c) : {};
    const sub = [chg && x.item ? `was ${esc(item(l.item).name)}` : '', esc(garText(chg ? c : l))].filter(Boolean).join(' · ');
    const right = stop ? '<span class="fe-tag fe-tag--stop">Stopped</span>' : chg && (x.amount || x.item) ? `<span class="fe-amt">${x.amount ? `<s>${amt(l.qty, l.unit)}</s>` : ''}<b>${amt(c.qty, c.unit)}</b></span>` : `<span class="fe-amt"><b>${amt(chg ? c.qty : l.qty, chg ? c.unit : l.unit)}</b></span>`;
    return `<button class="fe-r${stop ? ' fe-r--stop' : chg ? ' fe-r--chg' : ''}" onclick="lineSheet(${f},${l.item})"><span class="grow"><b>${esc(item(to).name)}</b>${sub ? `<small>${sub}</small>` : ''}</span>${right}${I('chevron_right', 20)}</button>`; };
  const added = (f, c) => `<button class="fe-r fe-r--new" onclick="addSheet(${f},${c.to})"><span class="grow"><b>${esc(item(c.to).name)}<span class="fe-tag fe-tag--new">New</span></b>${garText(c) ? `<small>${esc(garText(c))}</small>` : ''}</span><span class="fe-amt"><b>${amt(c.qty, c.unit)}</b></span>${I('chevron_right', 20)}</button>`;
  const band = f => { const m = base.meals.find(x => x.feed === f) || { items: [] };
    return `<div class="fe-band"><p class="fe-bh">${I('schedule', 18)}<span class="grow">${bandText(feed(f))}</span><small>${plural(m.items.length + addsAt(d, f).length, 'food')}</small></p><div class="fe-rows">${m.items.map(l => row(f, l)).join('')}${addsAt(d, f).map(c => added(f, c)).join('')}</div><button class="fe-add" onclick="addSheet(${f})">${I('add', 20)}Add Food</button></div>`; };
  return `<div class="fe-diet"><span class="davatar davatar--s">${I('restaurant', 20)}</span><span class="grow"><b>${esc(base.name)}</b><small>${n ? plural(n, 'change') : 'Tap a food to change it'}</small></span>${n ? `<button class="lnk" onclick="S.draft.changes=[];render()">Undo All</button>` : ''}</div>`
    + `<div class="fe">${feeds.map(band).join('')}</div>`;
}
/* How Long (owner, 21 Nov 2026: "it is not proper components, also too much — redo"): the design system's segment, then one plain field per
   answer — a date row that opens the device's date picker — and one quiet line saying what it means. The day strips stay in When, where the
   owner asked for them; How Long is three fields and nothing else: no strip, no stepper, no timeline. */
const HOW_OPTS = [['always', 'From Now On'], ['once', 'Select Dates'], ['yearly', 'Every Year']];
/* How Long is written once and used twice: by the New Request form (the draft) and by the Review Request sheet (SG).
   c says which of the two a tap writes to, so both screens get the same days, the same calendar and the same dates. */
const HOW_CTX = {
  draft: { st: () => S.draft, base: () => baseOf(S.draft), draw: () => render() },
  sg: { st: () => SG, base: () => sgDiet(), draw: () => SH.length ? redrawSheet() : render() },
};
function hwSet(c, k, v) {
  const x = HOW_CTX[c], d = x && x.st(); if (!d) return;
  if (k === 'how') { if (d.how === v) return; d.how = v; if (v === 'once' && !d.days) d.days = 14; }
  /* the last day, picked as a date: before the first day it moves the start instead */
  else if (k === 'last') { if (v < d.from) { d.from = v; d.days = 1; } else d.days = Math.min(365, v - d.from + 1); d.dSet = true; }
  else if (k === 'days') { d.days = Math.min(365, Math.max(1, v)); d.dSet = true; }
  else d[k] = v;
  x.draw();
  if (typeof stripView === 'function') stripView();
  playFx($('.how-body'), k === 'how' ? 'sh-swap' : 'tl-in');
}
/* a date, in the design system's select field: the row says the day, a tap opens the device's own date picker */
const hwDate = (c, key, label, n, { lo = 0, hi = 365, sub = '' } = {}) => `<div class="az-field"><span class="az-label">${label}</span><label class="az-input az-input--select az-date"><span class="grow">${dayLong(n)}${sub ? `<small>${esc(sub)}</small>` : ''}</span>${I('calendar_month', 24)}<input type="date" value="${addDays(TODAY, n)}" min="${addDays(TODAY, lo)}" max="${addDays(TODAY, hi)}" onclick="try{this.showPicker()}catch(e){}" onchange="if(this.value)hwSet('${c}','${key}',daysBetween(TODAY,this.value))" aria-label="${label}"></label></div>`;
function howBlock(d, c = 'draft') {
  const seg = `<div class="az-segment rv-seg how-seg" role="tablist" aria-label="How long">${thumb()}${HOW_OPTS.map(([k, l]) => `<button role="tab" aria-selected="${d.how === k}" onclick="hwSet('${c}','how','${k}')">${l}</button>`).join('')}</div>`;
  if (!d.how) return seg + '<p class="how-none">Choose how long the change lasts</p>';
  const base = HOW_CTX[c].base(), bname = base ? base.name : 'their usual diet', days = Math.max(1, d.days || 1), last = d.from + days - 1;
  const starts = hwDate(c, 'from', d.how === 'once' ? 'From' : 'Starts', d.from);
  const ends = hwDate(c, 'last', 'To', last, { lo: d.from, sub: plural(days, 'day') });
  const season = dfield('Season', dchips(SG_SEASONS.map(([s1, a, b2]) => [s1, s1, `${mdText(a)} – ${mdText(b2)}`]), v => d.season === v, v => `hwSet('${c}','season','${v}')`));
  return seg + `<div class="how-body" data-fx>${d.how === 'yearly' ? season : starts + (d.how === 'once' ? ends : '')}</div>`;
}
/* Why (owner, 20 Nov 2026: "Reason, why also: remove the outline, I want a text box also"): the common reasons as chips, More Reasons searches
   all of Kitchen & Diet's reasons, and a text box for the rest */
const WHY_TOP = ['Health', 'Weight management', 'Post-op recovery', 'Seasonal change', 'Behavioral', 'Breeding'];
function whySec2(d) {
  const top = [...WHY_TOP]; if (d.reason && !top.includes(d.reason)) top.push(d.reason);
  const need = dfKind(d) === 'ask', js = t => `dfSetWhy(${JSON.stringify(t).replace(/"/g, '&quot;')})`;
  return section('label', 'Why', `<div class="why-chips" id="f-reason" role="radiogroup" aria-label="Reason">${top.map(t => `<button class="az-chip why-c" role="radio" aria-checked="${d.reason === t}" aria-selected="${d.reason === t}" onclick="${js(t)}">${d.reason === t ? I('check', 18) : ''}<span>${esc(tcase(t))}</span></button>`).join('')}<button class="az-chip why-c why-more" onclick="dfWhySheet()">${I('search', 18)}<span>More Reasons</span></button></div>
    <label class="az-input az-input--text az-textarea why-t"><textarea id="f-text" rows="3" placeholder="${need ? 'What the new diet is for *' : 'Tell the dietician more (optional)'}" oninput="S.draft.text=this.value;redrawFoot()" aria-label="Details">${esc(d.text)}</textarea></label>`, true);
}
/* the type's own questions */
function dtypeFields(d) {
  /* each part of the request is a section of the Help Desk form (owner, 20 Nov 2026: Iteration A of the form mockup) */
  const k = d.dtype, why = list => { DF_WHY = [...new Set([...list.filter(t => SG_REASONS.includes(t)), ...list])]; return whySec2(d); };
  const how = () => section('date_range', 'How Long', howBlock(d), true);
  const feedChips = (cur, js, all = true) => dchips([...(all ? [['all', 'Whole Day', 'All feeds']] : []), ...dfFeeds(d).map(f => [f, bandText(feed(f))])], v => v === 'all' ? cur === 'all' : cur !== 'all' && (cur || []).includes(v), js, 'schedule');
  /* one or more feed times */
  const feedsOf = (label, key = 'feed') => wfield(label, feedsText(d.f[key]), feedTiles(f => (d.f[key] || []).includes(f), f => `dfToggleF('${key}',${f})`), { ph: !(d.f[key] || []).length });
  const when = (...fs) => section('calendar_month', 'When', fs.join('')).replace('<section class="az-section">', '<section class="az-section az-section--when">');
  /* ---- a Diet request: when, which feed; what is asked goes in Describe Your Request ---- */
  if (k === 'skip') { const all = d.feeds === 'all';
    return when(daysField('skip', 'Days', true),
      /* every feed is picked to start with (the whole day); a tap leaves one out */
      wfield('Feeds', all ? 'Whole Day' : feedsText(d.feeds), feedTiles(f => all || d.feeds.includes(f), f => `dfToggleFeed(${f})`), { req: true, ph: !all && !d.feeds.length })); }
  if (k === 'extra') { if (!d.f.dates) { d.f.dates = extraDays(d.f); d.f.dmode = dmodeOf(d.f.dates); }
    return when(daysField('extra', 'Days', true), feedsOf('With Which Feeds')); }
  if (k === 'medicine') { const n = d.f.from ?? 0, dd = d.f.days ?? 5;
    return when(wfield('From', dayLong(n), dayStrip(n, 'f.from')), feedsOf('Mix Into'),
      `<div class="wf wf--row"><span class="wf__l">For</span><div class="mstep"><button class="how-step" onclick="S.draft.f.days=Math.max(1,${dd}-1);render()" aria-label="One day less"${dd <= 1 ? ' disabled' : ''}>${I('remove')}</button><b>${plural(dd, 'Day')}</b><button class="how-step" onclick="S.draft.f.days=Math.min(60,${dd}+1);render()" aria-label="One day more">${I('add')}</button></div></div>`); }
  if (k === 'quality') { const n = d.f.day ?? 0; return when(wfield('Which Day', dayLong(n), dayStrip(n, 'f.day', { past: true, days: 14 })), feedsOf('Which Feeds')); }
  /* ---- a Diet change: the diet's configuration ---- */
  if (k === 'change') return section('tune', 'What Changes', !d.base ? '<p class="sg-none sg-hint">No diet here yet. Choose New Diet instead.</p>' : foodEditor(d), true)
    + (d.changes.length ? how() : '');
  if (k === 'newdiet') return section('add_circle', 'New Diet', select('Start From', d.base ? diet(d.base).name : 'Nothing · the dietician builds it', 'dfStartSheet()', { id: 'f-from', icon: 'search' })
      + (d.base ? `<label class="az-field"><span class="az-label">Diet Name</span><span class="az-input az-input--text"><input id="df-name" placeholder="${esc(dfNewName(d) || 'Name the diet')}" value="${esc(d.name || '')}" oninput="S.draft.name=this.value;redrawFoot()"></span></label>${dfield('Foods', foodEditor(d))}`
        : wfield('Needed From', dayLong(d.f.from ?? 1), dayStrip(d.f.from ?? 1, 'f.from'))), true)
    + (d.base ? how() : '') + why(REASONS.items);
  if (k === 'move') { const opts = dfMoveOpts(d);
    return section('restaurant', 'Move To', opts.length ? select('', d.diet ? diet(d.diet).name : '', 'dfMoveSheet()', { placeholder: 'Search and choose a diet', id: 'f-move', icon: 'search' }) : '<p class="sg-none sg-hint">No other diet for this species</p>', true) + how(); }
  if (k === 'end') { const es = endable(d);
    return section('event_busy', 'Diet To End', (es.length ? select('', d.ends[0] ? diet(by('assigns', d.ends[0]).diet).name : '', 'dfEndSheet()', { placeholder: 'Search and choose a diet', id: 'f-end', icon: 'search' }) : '<p class="sg-none sg-hint">No diet here ends early: only Seasonal, Time-bound or place diets do</p>')
      + wfield('Last Day', dayLong(daysBetween(TODAY, d.stop)), dayStrip(daysBetween(TODAY, d.stop), 'stop'), { req: true }), true) + why(REASONS.items); }
  return '';
}
function dfToggleFeed(f) { const d = S.draft, every = dfFeeds(); let l = d.feeds === 'all' ? every : [...d.feeds]; l = l.includes(f) ? l.filter(x => x !== f) : [...l, f].sort((a, b) => feed(a).from.localeCompare(feed(b).from)); d.feeds = l.length === every.length ? 'all' : l; render(); }
/* the form, as the Help Desk form in the Figma (Request Module, 15 Jul 2025; owner, 20 Nov 2026: "Iteration A · The Help Desk Form"):
   Request Details (Requesting To, Request Type that opens Select Request Type) · For (the Figma Animal Card For Selection) · the type's own
   sections · Describe Your Request · Attachments If Any · Priority · Approval (Requester and Approver) */
function dietForm(d) {
  const descSec = d => section('subject', 'Describe Your Request', `<label class="az-input az-input--text az-textarea"><textarea id="f-text" rows="4" placeholder="${esc(DT_HINT[d.dtype] || 'Details')}" oninput="S.draft.text=this.value;redrawFoot()" aria-label="Details">${esc(d.text)}</textarea></label>`, true);
  const t = d.targets[0], dt = d.dtype && dtOf(d.dtype), g = dt && dgOf(dt[5]), words = d.dgroup === 'request', needText = words || (dt && dfKind(d) === 'ask');
  const typeIn = dt ? `<span class="dtsel__ic">${I(dt[4])}</span><span class="grow"><b>${esc(dt[2])}</b><small>${esc(g[1])}</small></span>` : '<span class="grow">What do you need?</span>';
  const type = `<div class="az-field" id="f-dtype"><span class="az-label">Request Type <span class="az-req">*</span></span>${d.edit && dt ? `<div class="az-input az-input--select dtsel" aria-disabled="true">${typeIn}</div>`
    : `<button class="az-input az-input--select dtsel${dt ? '' : ' az-input--placeholder'}" onclick="dtypeSheet()" aria-haspopup="dialog">${typeIn}${I('keyboard_arrow_down')}</button>`}</div>`;
  /* requests are raised inside the Diet module only (owner, 26 Nov 2026): Requesting To is Diet and cannot change */
  const out = [section('category', 'Request Details', select('Requesting To', 'Diet', '', { disabled: true }) + type, true)];
  if (!dt) return out.join('');
  /* (owner, 27 Nov 2026) Describe Your Request comes right after the type, for every type */
  out.push(descSec(d));
  out.push(section('pets', 'Diet Applies To', t ? forPick(d) : select('', '', 'dfWho()', { placeholder: 'Choose an animal, a place or the species', id: 'f-sp', icon: 'search' }), true));
  if (t) out.push(dtypeFields(d));
  /* a Diet request is said in words: one box, left empty for the requester (owner, 27 Nov 2026: no Title, nothing filled in by itself).
     The request's title in the lists is still made from what is asked (dfAuto), or from the first words of the box */

  out.push(attachSec(d), approvalSec(d));
  return out.join('');
}
/* who or where it is for, as the Figma Animal Card For Selection (Animal Card Redesign): tap it to choose again, the red mark to clear it */
const forPick = d => `<div class="forpick"><button class="forpick__b" onclick="dfWho()" aria-label="Change who it is for">${forCard(d)}</button>${d.edit ? '' : `<button class="az-iconbtn forpick__x" onclick="S.draft.targets=[];S.draft.base=null;S.draft.changes=[];render()" aria-label="Remove">${I('cancel')}</button>`}</div>`;
/* Approval, as the Figma form: the Requester and the Approver, each a card that opens its people (owner, 20 Nov 2026: "Requester also I can change") */
const whoCard = (id, js, label) => `<button class="az-picked dfappr" onclick="${js}" aria-label="${label}: ${esc(user(id).name)}. Change">${avatar(user(id).name)}<span class="grow"><span class="az-who__name">${youName(id)}</span><span class="az-who__sub">${esc(user(id).title)}</span></span><span class="dfappr__c">Change</span></button>`;
const reqBy = d => d.by || (d.edit ? by('requests', d.edit).by : S.user);
function approvalSec(d) {
  const ap = d.approver && user(d.approver), who = reqBy(d);
  return section('how_to_reg', 'Approval', `<div class="az-field"><span class="az-label">Requester</span>${d.edit ? personCard(who) : whoCard(who, 'dfReqSheet()', 'Requester')}</div>
    <div class="az-field"><span class="az-label">Approver</span>${ap ? whoCard(d.approver, 'dfApprSheet()', 'Approver') : ''}</div>`, true);
}
/* anyone may be the requester (raised for them); the approver is one of the diet's approvers, never the requester */
const PEOPLE = () => D.users.map(u => u.id);
function dfReqSheet() { personSheet('Requester', PEOPLE(), reqBy(S.draft), 'dfSetBy'); }
function dfSetBy(id) { const d = S.draft; d.by = id; if (d.dept === 'diet' && d.approver === id) d.approver = DIET_APPROVERS.find(x => x !== id); closeAll(); render(); }
function dfApprSheet() { const d = S.draft; personSheet('Approver', (d.dept === 'diet' ? DIET_APPROVERS : PEOPLE()).filter(id => id !== reqBy(d)), d.approver, 'pickApprover'); }
function setFormPrio(k) { S.draft.prio = k; render(); playFx($('.prio-hd'), 'pop'); }
/* Select Request Type, as the Figma's Select Department sheet: search, then the two groups with their types */
let DTQ = '';
function dtypeSheet() { DTQ = ''; openSheet(dtypeHtml); }
/* (owner, 27 Nov 2026) four types to choose: Skip A Feed, Extra Feed, Medicine With Food, Another Diet; the rest is said in words */
const DT_ON = ['skip', 'extra', 'medicine', 'change', 'move'];   /* owner, 27 Nov 2026: Change Item Values back, with its food editor */
function dtypeHtml() {
  const d = S.draft, q = DTQ.trim().toLowerCase();
  const grp = g => { const xs = DTYPES.filter(x => DT_ON.includes(x[0]) && x[5] === g[0] && (!q || `${x[2]} ${x[3]}`.toLowerCase().includes(q)));
    return xs.length ? `${pkList(xs.map(x => pkRow(`dfType('${x[0]}')`, pkIc(x[4]), esc(x[2]), esc(x[3]), undefined, d.dtype === x[0])).join(''))}` : ''; };
  return { title: 'Select Request Type', bottom: true, body: pkSearch('dt-q', DTQ, 'Search', 'DTQ=this.value;redrawSheet()') + (DGROUPS.map(grp).join('') || '<p class="sg-none">No type by that name</p>') };
}
/* Request: a Diet request or a Diet change; Type: one of its few kinds (chips) */
function dfGroup(k) { const d = S.draft; if (d.dgroup === k) return; d.dgroup = k; if (d.dtype && dtOf(d.dtype)[5] !== k) dfType(null); else render(); }
function dfType(k) {
  const d = S.draft;
  if (d.dtype !== k) Object.assign(d, { dtype: k, changes: [], diet: null, ends: [], f: {}, reason: null, titleEdited: false, title: '', name: '', how: k === 'move' ? 'once' : null, feeds: 'all', date: addDays(TODAY, 1), dates: [addDays(TODAY, 1)], dmode: 'one', stop: addDays(TODAY, 1) });
  if (k) d.dgroup = dtOf(k)[5];
  if (d.targets[0]) { const e = dfEat(d)[0]; d.base = e ? e.diet.id : null; }
  /* the type sheet moves on to Select Species in the same sheet (a step forward), rather than closing and opening another */
  if (k && !d.targets[0] && SH.length) { render(); drawOverlay.dir = 'fwd'; dfWho(); return; }
  closeAll(); render(); if (k && !d.targets[0]) setTimeout(dfWho, 120);
}
/* For (owner, 19 Nov 2026): the species sheet with search, not a page */
function dfWho() { applyPick('dfPickT', S.draft.targets[0] || null); }
function dfPickT(sp, level, ref) { dfPick({ sp, level, ref }); }
function dfWhoDone() { const t = S.draft.pick.sel; S.draft.pick = null; dfPick(t); }
function dfPick(t) { const d = S.draft; d.targets = [{ sp: t.sp, level: t.level, ref: t.ref ?? null }]; d.site = sgSite(d.targets[0]); const e = dfEat(d)[0]; d.base = e ? e.diet.id : null; d.changes = []; d.diet = null; d.ends = []; closeAll(); render(); }
/* the diet fields' sheets (owner, 19 Nov 2026: "Move diet also like a bottom sheet, I can search and select"); no animal counts */
const dfMoveOpts = d => { const now = dfEat(d)[0]; return [...new Set(D.assigns.filter(a => a.sp === d.targets[0].sp && !ended(a)).map(a => a.diet))].filter(id => !now || id !== now.diet.id); };
function dfStartSheet() { const d = S.draft, sp = d.targets[0].sp; dietPickSheet({ title: 'Start From', sub: esc(species(sp).name), none: ['Nothing', 'The dietician builds it'], list: [...new Set(D.assigns.filter(a => a.sp === sp && !ended(a)).map(a => a.diet))].map(id => ({ id, d: diet(id), sub: dietWhere(id, sp) })), cur: d.base || '', cb: 'dfSetStart' }); }
function dfSetStart(id) { const d = S.draft; if ((d.base || '') !== id) { d.base = id || null; d.changes = []; } render(); }
function dfMoveSheet() { const d = S.draft, sp = d.targets[0].sp; dietPickSheet({ title: 'Move to', sub: esc(species(sp).name), list: dfMoveOpts(d).map(id => ({ id, d: diet(id), sub: dietWhere(id, sp) })), cur: d.diet, cb: 'dfSetMove' }); }
function dfSetMove(id) { S.draft.diet = id; render(); }
function dfEndSheet() { const d = S.draft; dietPickSheet({ title: 'Diet To End', sub: esc(dfPlace(d)), list: endable(d).map(a => ({ id: a.id, d: diet(a.diet), sub: `Set for ${whereSet(a)}${a.end ? ` · till ${fmtDay(a.end)}` : ''}` })), cur: d.ends[0], cb: 'dfSetEnd' }); }
function dfSetEnd(id) { S.draft.ends = [id]; render(); }
let DF_WHY = [];
function dfWhySheet() { textPickSheet({ title: 'Why', items: DF_WHY, cur: S.draft.reason, cb: 'dfSetWhy' }); }
function dfSetWhy(v) { S.draft.reason = v; render(); }
/* Change item values, or a new diet's foods: the diet opens in the Suggest a change editor; Done brings the changes back to this form */
function dfEditFood() {
  const d = S.draft;
  SG = { key: 'form', form: true, edit: null, t: { ...d.targets[0] }, base: d.base, changes: d.changes.map(c => ({ ...c })), skip: null, skipDay: 1, how: d.how, days: d.days, from: d.from, season: d.season, reason: d.reason, more: false, text: '', note: false, files: [], prio: d.prio, q: '', aq: '', approver: d.approver, kind: d.dtype === 'newdiet' ? 'new' : 'items', name: d.name || '' };
  S.sgBack = location.hash; go('#/suggest?form=1');
}
/* load a diet request into the form, for Edit Request or Clone request */
function dfLoad(d, r) {
  const t = targetsOf(r)[0], dt = dtOfKind(r.kind) || DTYPES[5];
  Object.assign(d, { dgroup: dt[5], dtype: dt[0], name: r.name || '', targets: [{ sp: t.sp, level: t.level, ref: t.ref ?? null }], base: r.base || null, changes: (r.changes || []).map(c => ({ ...c })), diet: r.diet || null, ends: [...(r.ends || [])], stop: r.stop || addDays(TODAY, 1),
    date: r.date || addDays(TODAY, 1), dates: reqDates(r).length ? reqDates(r) : [addDays(TODAY, 1)], dmode: dmodeOf(reqDates(r)), feeds: r.feeds === 'all' || !r.feeds ? 'all' : [...r.feeds], reason: r.reason || null, f: JSON.parse(JSON.stringify(r.f || {})), how: r.how || null, days: 14, from: 1, season: 'Winter' });
  if (r.how === 'once' && r.start) { d.from = Math.max(0, daysBetween(TODAY, r.start)); d.days = Math.max(1, daysBetween(r.start, r.end) + 1); }
  if (r.how === 'yearly') d.season = (SG_SEASONS.find(s => s[1] === r.start) || SG_SEASONS[2])[0];
}
function dfSubmit(d) {
  const e = dfErr(d);
  if (e) { toast(e); const at = { 'Choose a diet request or a diet change': '#f-dgroup', 'Choose the type': '#f-dtype', 'Choose who it is for': '#f-sp', 'Choose why': '#f-reason', 'Add a title': '#f-title', 'Add the details': '#f-text' }[e], el = at && document.querySelector(at); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
  const x = dfReq(d); delete x.by;
  Object.assign(x, { title: dfTitle(d).trim() || firstWords(d.text), text: d.text.trim(), note: '', files: [...d.files], prio: d.prio, site: d.site });
  /* a request in words changes no diet: who it is for is kept now */
  if (JOB_KINDS.includes(x.kind)) { x.outcome = { lines: [], get: tAnimals(x.targets[0]).map(a => a.id) }; x.f.rows = dfRows(d); }
  let r;
  if (d.edit) {
    r = by('requests', d.edit);
    if (!r || !ownsReq(r, S.user) || !isOpen(r)) { toast(`Can't edit ${d.edit} now`); return; }
    [...DIET_KEYS, 'f', 'outcome', 'scope', 'asked'].forEach(k => delete r[k]);
    Object.assign(r, x, { state: 'pending', delay: null }); r.events.push({ kind: 'edited', by: S.user, at: nowStamp(), note: '' });
  } else { r = { id: newRequestId(), ...x, by: reqBy(d), ...(reqBy(d) !== S.user ? { raisedBy: S.user } : {}), state: 'pending', events: [{ kind: 'raised', by: S.user, at: nowStamp() }] }; D.requests.push(r); }
  S.draft = null; S.rTab = 'pending'; S.rDept = 'all'; storeSave();
  toast(`${d.edit ? 'Request updated' : 'Request sent'} · ${r.id}`); go(`#/requests/${r.id}`);
}
