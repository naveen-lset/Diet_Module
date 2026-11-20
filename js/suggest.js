// js/suggest.js — a diet change: anybody raises it, the Dietician approves it, and approving applies it (owner, 19 Nov 2026; on 18 Nov the
// Kitchen updated it after approval). The requester suggests the change on the diet itself (Google Docs "Suggesting", Maps "Suggest an edit"): who it is for →
// what they eat today, with − and + on every food → a bar that counts the changes (a cart) → one short sheet (how long, why, proof) → Send.
// The request then shows a tracker that fills in (Sent · Dietician · Kitchen · Live). The kitchen rules (a new diet or an edit, who gets it)
// are the Dietician's: "Save It As" on the request. Routes: #/suggest (?asg= a diet's place, ?sp= a species, ?edit= an open request).

const SG_REASONS = ['Weight management', 'Health', 'Post-op recovery', 'Breeding', 'Behavioral', 'Seasonal change', 'Senior', 'Recovery'];
const SG_SEASONS = [['Summer', '03-01', '05-31'], ['Monsoon', '06-15', '09-30'], ['Winter', '12-01', '02-28']];
const SG_STEP = { g: 10, kg: 0.05, ml: 10, ltr: 0.05, pcs: 1 };
const SG_PREPS = ['Raw', 'Washed', 'Fresh', 'Mashed', 'Boiled', 'Steamed'];
let SG = null;

/* ---------- the draft ---------- */
function sgInit(q) {
  /* Change food from the New Request form: the form's own draft, opened here (dfEditFood) */
  if (q.get('form') && SG && SG.form) return SG;
  const key = [S.user, q.get('edit') || '', q.get('clone') || '', q.get('asg') || '', q.get('sp') || ''].join(':');
  if (SG && SG.key === key) return SG;
  SG = { key, edit: null, t: null, base: null, changes: [], skip: null, skipDay: 1, how: null, days: 14, from: 1, season: 'Winter', reason: null, more: false, text: '', note: false, files: [], prio: 'normal', q: '', aq: '', approver: dietApprover(), kind: 'items', name: '' };
  const cl = q.get('clone') && by('requests', q.get('clone')), r = cl || (q.get('edit') && by('requests', q.get('edit'))), a = q.get('asg') && by('assigns', q.get('asg')), sp = +q.get('sp');
  /* Edit (the requester, while it waits) or Clone (anyone who may raise one: a new request with the same answers), as the Help Desk app */
  if (r && isDiet(r) && SG_KINDS.includes(r.kind) && (cl ? canRaise(me()) : r.by === S.user && isOpen(r))) {
    const t = targetsOf(r)[0];
    Object.assign(SG, { edit: cl ? null : r.id, t: { sp: t.sp, level: t.level, ref: t.ref ?? null, group: t.group || null }, kind: r.kind === 'new' ? 'new' : 'items', name: r.name || '', base: r.base || null, changes: (r.changes || []).map(c => ({ ...c })), reason: r.reason, text: r.text || '', note: !!r.text, files: [...(r.files || [])], prio: r.prio, approver: r.approver });
    if (r.kind === 'skip') SG.skip = { feeds: r.feeds, date: r.date };
    else if (r.how === 'yearly') { SG.how = 'yearly'; SG.season = (SG_SEASONS.find(s => s[1] === r.start) || SG_SEASONS[2])[0]; }
    else if (r.how === 'once') { SG.how = 'once'; SG.from = Math.max(0, daysBetween(TODAY, r.start)); SG.days = Math.max(1, daysBetween(r.start, r.end) + 1); }
    else SG.how = 'always';
  } else if (a) { SG.t = { sp: a.sp, level: a.level, ref: a.ref ?? null }; SG.base = a.diet; }
  else if (sp && by('species', sp)) SG.t = { sp, level: 'species', ref: null };
  sgFixBase();
  return SG;
}
const sgEat = () => SG.t ? eatNow([SG.t]).list : [];
function sgFixBase() { const ls = sgEat(); if (!ls.some(e => e.diet.id === SG.base)) { SG.base = ls.length ? ls[0].diet.id : null; SG.changes = []; } }
/* the kinds this screen edits; Use another diet and End a diet early keep the earlier form (paneForm) for Edit, and have no Clone */
const SG_KINDS = ['items', 'new', 'skip'];
const sgName = t => t.level === 'species' ? species(t.sp).name : targetName(t);
const sgWhere = t => t.level === 'species' ? (t.group ? `${GROUP_WORD(t.group)} only` : 'Whole species') : LEVEL[t.level];
const sgCount = () => SG.changes.length + (SG.skip ? 1 : 0);
const sgDiet = () => diet(SG.base);
const sgWas = (f, it) => entryOf(sgDiet(), f, it);
const sgCh = (f, it) => SG.changes.find(c => c.op !== 'add' && c.feed === f && c.item === it);
const sgAdded = (f, to) => SG.changes.find(c => c.op === 'add' && c.feed === f && c.to === to);
const sgLine = (f, it) => { const c = sgCh(f, it), w = sgWas(f, it); return c && c.op === 'change' ? c : { ...w, to: w.item }; };
const sgInFeed = (f, id) => { const m = sgDiet().meals.find(x => x.feed === f); return (!!m && m.items.some(i => { const c = sgCh(f, i.item); return (c ? (c.op === 'remove' ? null : c.to) : i.item) === id; })) || SG.changes.some(c => c.op === 'add' && c.feed === f && c.to === id); };
/* a change to one of the diet's lines; a line put back as it was is no change */
function sgPut(f, it, patch) {
  const w = sgWas(f, it), cur = sgLine(f, it), c = { op: 'change', feed: f, item: it, to: cur.to, qty: cur.qty, unit: cur.unit, prep: cur.prep || '', cut: cur.cut || '', days: cur.days ?? EVERY_DAY, cad: cur.cad || null, ...patch };
  SG.changes = SG.changes.filter(x => !(x.op !== 'add' && x.feed === f && x.item === it));
  if (Object.values(lineDiff(w, c)).some(Boolean)) SG.changes.push(c);
  SG.changes.sort((a, b) => a.feed - b.feed);
}
const sgStepOf = u => SG_STEP[u] || 1;
function sgStep(f, it, dir) { const cur = sgLine(f, it), s = sgStepOf(cur.unit); sgPut(f, it, { qty: Math.max(s, round(cur.qty + dir * s)) }); render(); }
function sgStepAdd(f, to, dir) { const c = sgAdded(f, to), s = sgStepOf(c.unit); c.qty = Math.max(s, round(c.qty + dir * s)); render(); }
function sgPct(f, it, p, add) { const c = add ? sgAdded(f, it) : sgLine(f, it), s = sgStepOf(c.unit), q = Math.max(s, round(Math.round(c.qty * (1 + p / 100) / s) * s)); if (add) c.qty = q; else sgPut(f, it, { qty: q }); render(); }
function sgPrep(f, it, v, add) { if (add) sgAdded(f, it).prep = v; else sgPut(f, it, { prep: v }); render(); }
function sgStop(f, it) { SG.changes = SG.changes.filter(x => !(x.op !== 'add' && x.feed === f && x.item === it)); SG.changes.push({ op: 'remove', feed: f, item: it }); closeAll(); render(); toast(`${item(it).name} stopped`); }
function sgUnstop(f, it) { SG.changes = SG.changes.filter(x => !(x.op === 'remove' && x.feed === f && x.item === it)); render(); }
function sgDrop(f, to) { SG.changes = SG.changes.filter(x => !(x.op === 'add' && x.feed === f && x.to === to)); closeAll(); render(); toast(`${item(to).name} taken out`); }
/* a swap keeps the amount when the units match (Instacart "replace"), otherwise starts from a usual amount */
function sgSwap(f, it, to) {
  const cur = sgLine(f, it), x = item(to), same = BASE[cur.unit][0] === BASE[x.unit][0];
  sgPut(f, it, { to, qty: same ? cur.qty : BASE[x.unit][0] === 'pcs' ? 1 : 50, unit: same ? cur.unit : BASE[x.unit][0], prep: (x.preps || [])[0] || cur.prep || '', cut: same ? cur.cut || '' : '' });
  closeAll(); render(); toast(`${item(it).name} swapped for ${x.name}`);
}
function sgAddItem(f, to) {
  const x = item(to), u = BASE[x.unit][0];
  SG.changes.push({ op: 'add', feed: f, to, qty: u === 'pcs' ? 1 : 50, unit: u, prep: (x.preps || [])[0] || 'Fresh', cut: '', days: EVERY_DAY, cad: null });
  SG.changes.sort((a, b) => a.feed - b.feed); SG.aq = ''; closeAll(); render(); toast(`Added ${x.name}`);
}
/* one-tap shortcuts for what biologists ask most; each fills in a sensible how long and why, which the sheet still shows */
function sgQuick(k) {
  if (k === 'skip') return sgSkipSheet();
  const meals = sgDiet().meals;
  meals.forEach(m => m.items.forEach(l => {
    const c = sgCh(m.feed, l.item); if (c && c.op === 'remove') return;
    if (k === 'soft') sgPut(m.feed, l.item, { prep: 'Mashed' });
    else { const cur = sgLine(m.feed, l.item), s = sgStepOf(cur.unit); sgPut(m.feed, l.item, { qty: Math.max(s, round(Math.round(cur.qty * (k === 'more' ? 1.1 : 0.9) / s) * s)) }); }
  }));
  SG.changes.filter(c => c.op === 'add').forEach(c => { if (k === 'soft') c.prep = 'Mashed'; else { const s = sgStepOf(c.unit); c.qty = Math.max(s, round(Math.round(c.qty * (k === 'more' ? 1.1 : 0.9) / s) * s)); } });
  if (k === 'soft') { SG.how = SG.how || 'once'; SG.days = SG.how === 'once' && !SG.dSet ? 7 : SG.days; SG.reason = SG.reason || 'Recovery'; }
  else { SG.how = SG.how || 'always'; SG.reason = SG.reason || 'Weight management'; }
  render(); toast(k === 'soft' ? 'Everything mashed' : k === 'more' ? 'Every food up by 10%' : 'Every food down by 10%');
}
function sgClear() { Object.assign(SG, { changes: [], skip: null }); render(); toast('Back to the diet as it is'); }
function sgPick(sp, level, ref) { SG.t = { sp, level, ref }; SG.q = ''; SG.changes = []; SG.skip = null; SG.base = null; sgFixBase(); render(); }
function sgScan() { const t = sgRecent()[0]; sgPick(t.sp, t.level, t.ref); toast(`Scanned the QR on ${sgName(t)}`); }
function sgBaseTo(id) { if (SG.base === id) return; SG.base = id; if (SG.changes.length) toast('Changes cleared for the other diet'); SG.changes = []; render(); }
/* back to the New Request form, with the changes (Done) or without (×) */
function sgFormBack(save) {
  const d = S.draft;
  if (save && d) { Object.assign(d, { base: SG.base, changes: SG.changes.map(c => ({ ...c })) }); if (!d.how && SG.how) d.how = SG.how; if (!d.reason && SG.reason) d.reason = SG.reason; if (SG.how === 'once' && SG.days) d.days = SG.days; }
  SG = null; closeAll(); go(S.sgBack || '#/new');
}
function sgClose() { const back = SG && SG.edit ? `#/requests/${SG.edit}` : S.back; SG = null; closeAll(); go(back && !back.startsWith('#/suggest') ? back : '#/diets'); }

/* ---------- who it is for: scan, recent places, search ---------- */
function sgRecent() {
  const c = [[135332, 'enclosure', 15224], [135332, 'enclosure', 15229], [135332, 'animal', 215920], [150254, 'enclosure', 19990], [360599, 'enclosure', 19981], [161818, 'section', 178]];
  return c.map(([sp, level, ref]) => ({ sp, level, ref })).filter(t => placeOf(t.level, t.ref) && tAnimals(t).length);
}
function sgFind(q) {
  q = q.trim().toLowerCase(); if (!q) return [];
  const out = [], spOf = list => [...new Set(list.map(a => a.sp))];
  D.species.forEach(s => { if (s.name.toLowerCase().includes(q)) out.push({ sp: s.id, level: 'species', ref: null }); });
  D.sections.forEach(x => { if (x.name.toLowerCase().includes(q)) spOf(D.animals.filter(a => pathOfAnimal(a).section === x.id)).forEach(sp => out.push({ sp, level: 'section', ref: x.id })); });
  D.enclosures.forEach(x => { if (x.name.toLowerCase().includes(q)) spOf(D.animals.filter(a => a.enc === x.id)).forEach(sp => out.push({ sp, level: 'enclosure', ref: x.id })); });
  D.animals.forEach(a => { if (animalName(a).toLowerCase().includes(q) || String(a.id).includes(q)) out.push({ sp: a.sp, level: 'animal', ref: a.id }); });
  return out.slice(0, 12);
}
/* ---------- the diet as they eat it today, to change in place ---------- */
/* (19 Nov 2026, owner: "refer the Hub and do it; it all looks AI-designed") the editor in the Antz design system's own parts, as the Hub's Item
   requests: one section with who and which diet as picked cards, plain outline buttons for the quick changes, a white section per feed time with
   rows (the food, how it is prepared, the stepper). A changed line says what it was, the old amount struck through; nothing else is coloured */
const sgStepper = (minus, plus, text, name) => `<span class="sg-step"><button onclick="${minus}" aria-label="Less ${esc(name)}">${I('remove', 20)}</button><b>${text}</b><button onclick="${plus}" aria-label="More ${esc(name)}">${I('add', 20)}</button></span>`;
const sgSub = l => [garText(l), (l.days ?? EVERY_DAY) !== EVERY_DAY || l.cad ? lineDays(l) : ''].filter(Boolean).join(' · ') || 'As it comes';
function sgRow(f, l, off, held) {
  const c = sgCh(f, l.item), stop = c && c.op === 'remove', cur = c && c.op === 'change' ? c : l, x = item(cur.to || cur.item);
  const amt = c && !stop && toBase(cur.qty, cur.unit) !== toBase(l.qty, l.unit), prep = c && !stop && (cur.prep || '') !== (l.prep || ''), swap = c && !stop && cur.to !== l.item;
  const was = stop ? '<span class="sg-was2 sg-was2--bad">Stopped</span>' : c ? `<span class="sg-was2">${[swap ? `Instead of ${esc(item(l.item).name)}` : '', amt ? `Was <s>${qtyText(l.qty, l.unit)}</s>` : '', prep ? `Was ${esc(l.prep || 'as it comes')}` : ''].filter(Boolean).join(' · ')}</span>` : '';
  const right = off ? `<b class="sg-q">${qtyText(cur.qty, cur.unit)}</b>` : stop ? `<button class="lnk" onclick="sgUnstop(${f},${l.item})">Undo</button>` : sgStepper(`sgStep(${f},${l.item},-1)`, `sgStep(${f},${l.item},1)`, qtyText(cur.qty, cur.unit), x.name);
  return `<div class="sg-row${held ? ' sg-row--held' : ''}${stop ? ' sg-row--stop' : ''}${c ? ' sg-row--c' : ''}"><button class="sg-row__m" onclick="sgLineSheet(${f},${l.item})"${stop || off ? ' disabled' : ''}><b>${esc(x.name)}</b><span>${esc(sgSub(cur))}</span>${was}</button>${right}</div>`;
}
const sgAddRow = (c, off) => `<div class="sg-row sg-row--c"><button class="sg-row__m" onclick="sgAddSheet(${c.feed},${c.to})"${off ? ' disabled' : ''}><b>${esc(item(c.to).name)}</b><span>${esc(sgSub(c))}</span><span class="sg-was2 sg-was2--new">New</span></button>${off ? `<b class="sg-q">${qtyText(c.qty, c.unit)}</b>` : sgStepper(`sgStepAdd(${c.feed},${c.to},-1)`, `sgStepAdd(${c.feed},${c.to},1)`, qtyText(c.qty, c.unit), item(c.to).name)}</div>`;
const SG_QUICK = [['more', 'add', 'More Food'], ['less', 'remove', 'Less Food'], ['soft', 'blender', 'Soft Food'], ['skip', 'no_meals', 'Skip a feed']];
function sgEditor() {
  const t = SG.t, ls = sgEat(), d = sgDiet(), many = ls.length > 1 && !SG.edit;
  const chg = SG.edit || SG.form ? '' : `<button class="lnk" onclick="sgWho()">Change</button>`;
  const who = `<div class="az-field"><span class="az-label">For</span><div class="az-picked sg-pk">${spThumb(species(t.sp))}<span class="grow"><b>${esc(sgName(t))}</b><span>${esc(t.level === 'species' ? sgWhere(t) : `${species(t.sp).name} · ${sgWhere(t)}`)}</span></span>${chg}</div></div>`;
  if (!d) return `<section class="az-section">${who}<p class="sg-none">No diet here yet. Ask ${esc(first(user(dept('diet').head).name))}, the dietician, to add one.</p></section>`;
  const dietF = `<div class="az-field"><span class="az-label">${SG.kind === 'new' ? 'A new diet from' : many ? 'Diet To Change' : 'Diet'}</span><div class="az-picked sg-pk"><span class="davatar davatar--s">${I('restaurant', 20)}</span><span class="grow"><b>${esc(d.name)}</b><span>${esc([KINDTYPE[d.type], many ? `They eat ${ls.length} diets` : ''].filter(Boolean).join(' · '))}</span></span>${many ? `<button class="lnk" onclick="sgDietSheet()">Switch</button>` : ''}</div></div>`;
  const off = !!SG.skip, skipped = f => off && (SG.skip.feeds === 'all' || SG.skip.feeds.includes(f));
  const quick = off ? '' : `<div class="sg-quick2">${SG_QUICK.filter(q => !(SG.form && q[0] === 'skip')).map(([k, ic, l]) => `<button class="az-btn az-btn--outline az-btn--compact" onclick="sgQuick('${k}')">${I(ic, 20)}${l}</button>`).join('')}</div>`;
  const skip = off ? `<div class="az-warnline">${I('no_meals', 18)}<span class="grow"><b>${esc(sgSkipText())}.</b> The diet stays as it is.</span><button class="lnk" onclick="sgUnskip()">Undo</button></div>` : '';
  const feeds = d.meals.map(m => { const sk = skipped(m.feed), nch = SG.changes.filter(c => c.feed === m.feed).length;
    return `<section class="az-section sg-feed2${sk ? ' sg-feed2--off' : ''}"><h2 class="az-section__title">${I('schedule', 20)}<span class="grow">${bandText(feed(m.feed))}</span><small${sk ? ' class="sg-bad"' : ''}>${sk ? 'Skipped' : nch ? `${nch} changed` : plural(m.items.length, 'food')}</small></h2>
    <div class="sg-rows">${m.items.map(l => sgRow(m.feed, l, off, sk)).join('')}${SG.changes.filter(c => c.op === 'add' && c.feed === m.feed).map(c => sgAddRow(c, off)).join('')}</div>
    ${off ? '' : `<button class="lnk sg-add2" onclick="sgAddSheet(${m.feed})">${I('add', 20)}Add food</button>`}</section>`; }).join('');
  return `<section class="az-section">${who}${dietF}</section>` + quick + skip + feeds;
}
function sgDietSheet() { dietPickSheet({ title: 'Diet To Change', sub: esc(sgName(SG.t)), list: sgEat().map(e => ({ id: e.diet.id, d: e.diet, sub: dietWhere(e.diet.id, SG.t.sp) })), cur: SG.base, cb: 'sgPickDiet' }); }
function sgPickDiet(v) { sgBaseTo(v); }
const sgSkipText = () => { const s = SG.skip; return `No feed ${s.date === TODAY ? 'today' : 'tomorrow'}: ${s.feeds === 'all' ? 'all feeds' : s.feeds.map(f => bandText(feed(f))).join(', ')}`; };

/* ---------- sheets: a line · add food · skip a feed · send (one at a time, never one over another) ---------- */
function sgLineSheet(f, it) {
  openSheet(() => {
    const c = sgCh(f, it); if (!SG || (c && c.op === 'remove')) return { title: '', body: '' };
    const w = sgWas(f, it), cur = sgLine(f, it), x = item(cur.to), swaps = D.items.filter(i => i.kitchen === item(it).kitchen && i.id !== cur.to && i.id !== it && !i.mix && !sgInFeed(f, i.id)).slice(0, 4);
    return { title: esc(x.name), sub: `${bandText(feed(f))}${cur.to !== it ? ` · instead of ${esc(item(it).name)}` : ''}`, bottom: true, form: true,
      body: `<div class="sg-big"><button onclick="sgStep(${f},${it},-1)" aria-label="Less">${I('remove')}</button><b>${qtyText(cur.qty, cur.unit)}</b><button onclick="sgStep(${f},${it},1)" aria-label="More">${I('add')}</button></div>
        ${toBase(cur.qty, cur.unit) !== toBase(w.qty, w.unit) ? `<p class="sg-was">was ${qtyText(w.qty, w.unit)} a feed, per animal</p>` : '<p class="sg-was sg-was--plain">a feed, per animal</p>'}
        <div class="sg-chips">${[-25, -10, 10, 25].map(p => `<button class="az-chip" onclick="sgPct(${f},${it},${p})">${p > 0 ? '+' : '−'}${Math.abs(p)}%</button>`).join('')}</div>
        <p class="sg-cap">Preparation</p><div class="sg-chips">${[...new Set([...SG_PREPS, cur.prep].filter(Boolean))].map(p => `<button class="az-chip" aria-selected="${cur.prep === p}" onclick="sgPrep(${f},${it},'${p}')">${p}</button>`).join('')}</div>
        ${swaps.length ? `<p class="sg-cap">Swap For</p><div class="sg-chips">${swaps.map(i => `<button class="az-chip" onclick="sgSwap(${f},${it},${i.id})">${I('swap_horiz', 18)}${esc(i.name)}</button>`).join('')}</div>` : ''}`,
      foot: `<button class="az-btn az-btn--outline sg-stopbtn" onclick="sgStop(${f},${it})">${I('do_not_disturb_on')}Stop giving it</button><button class="az-btn" onclick="closeSheet()">Done</button>` };
  });
}
function sgAddSheet(f, to = null) {
  if (to) return openSheet(() => { const c = SG && sgAdded(f, to); if (!c) return { title: '', body: '' };
    return { title: esc(item(to).name), sub: `${bandText(feed(f))} · new`, bottom: true, form: true,
      body: `<div class="sg-big"><button onclick="sgStepAdd(${f},${to},-1)" aria-label="Less">${I('remove')}</button><b>${qtyText(c.qty, c.unit)}</b><button onclick="sgStepAdd(${f},${to},1)" aria-label="More">${I('add')}</button></div><p class="sg-was sg-was--plain">a feed, per animal</p>
        <p class="sg-cap">Preparation</p><div class="sg-chips">${[...new Set([...SG_PREPS, c.prep].filter(Boolean))].map(p => `<button class="az-chip" aria-selected="${c.prep === p}" onclick="sgPrep(${f},${to},'${p}',true)">${p}</button>`).join('')}</div>`,
      foot: `<button class="az-btn az-btn--outline sg-stopbtn" onclick="sgDrop(${f},${to})">${I('delete')}Take It Out</button><button class="az-btn" onclick="closeSheet()">Done</button>` }; });
  SG.aq = '';
  openSheet(() => {
    const q = SG.aq.trim().toLowerCase(), list = D.items.filter(i => !i.mix && !sgInFeed(f, i.id) && (!q || i.name.toLowerCase().includes(q))).slice(0, 12);
    return { title: 'Add Food', sub: bandText(feed(f)), bottom: true,
      body: `<label class="az-input az-input--text sg-search">${I('search')}<input id="sg-aq" type="search" placeholder="Search food" value="${esc(SG.aq)}" oninput="SG.aq=this.value;redrawSheet()" autocomplete="off" aria-label="Search food"></label>
        <div class="sg-list">${list.map(i => `<button class="sg-opt" onclick="sgAddItem(${f},${i.id})"><span class="grow"><b>${esc(i.name)}</b><span>${i.stock > 0 ? `In store · ${esc(stockText(i))}` : 'Out of stock'}</span></span><span class="sg-plus">${I('add', 20)}</span></button>`).join('') || '<p class="sg-none">No food by that name</p>'}</div>` };
  });
}
function sgSkipSheet() {
  openSheet(() => ({ title: 'Skip a feed', sub: esc(sgName(SG.t)), bottom: true,
    body: `<div class="sg-chips">${[[0, 'Today'], [1, 'Tomorrow']].map(([n, l]) => `<button class="az-chip" aria-selected="${SG.skipDay === n}" onclick="SG.skipDay=${n};redrawSheet()">${l}</button>`).join('')}</div>
      <div class="sg-list">${sgDiet().meals.map(m => `<button class="sg-opt" onclick="sgSkip([${m.feed}])"><span class="grow"><b>${bandText(feed(m.feed))}</b><span>${esc(m.items.map(i => item(i.item).name).join(', '))}</span></span>${I('chevron_right', 20)}</button>`).join('')}
      <button class="sg-opt" onclick="sgSkip('all')"><span class="grow"><b>Whole day</b><span>All feeds</span></span>${I('chevron_right', 20)}</button></div>` }));
}
/* Skip a feed is a request of its own: the food changes are put aside while it is on (the count says 1), and Undo brings them back */
function sgSkip(feeds) { SG.skip = { feeds, date: addDays(TODAY, SG.skipDay), keep: SG.skip ? SG.skip.keep : SG.changes }; SG.changes = []; if (!REASONS.skip.includes(SG.reason)) SG.reason = null; closeAll(); render(); }
function sgUnskip() { const k = SG.skip && SG.skip.keep; SG.skip = null; SG.changes = k || []; render(); if (k && k.length) toast(k.length === 1 ? 'Your food change is back' : `Your ${k.length} food changes are back`); }

/* the request as it would be sent */
function sgDates() {
  if (SG.how === 'yearly') { const s = SG_SEASONS.find(x => x[0] === SG.season); return { start: s[1], end: s[2] }; }
  const start = addDays(TODAY, SG.from);
  return SG.how === 'once' ? { start, end: addDays(start, SG.days - 1) } : { start, end: null };
}
function sgReq() {
  const t = SG.t, x = sgEat().find(e => e.diet.id === SG.base);
  const r = { dept: 'diet', targets: [{ ...t }], sp: t.sp, level: t.level, ref: t.ref ?? null, reason: SG.reason, text: SG.note ? SG.text.trim() : '', note: '', files: [...SG.files], prio: SG.prio, approver: SG.approver || dietApprover(), by: S.user };
  if (SG.skip) Object.assign(r, { kind: 'skip', date: SG.skip.date, feeds: SG.skip.feeds === 'all' ? 'all' : [...SG.skip.feeds] });
  else if (SG.kind === 'new') Object.assign(r, { kind: 'new', base: SG.base, changes: SG.changes.map(c => ({ ...c })), how: SG.how || 'always', name: SG.name, ...sgDates() });
  else Object.assign(r, { kind: 'items', base: SG.base, slot: x ? topSlot(x).id : null, changes: SG.changes.map(c => ({ ...c })), how: SG.how || 'always', ...sgDates() });
  r.title = autoTitle(r);
  return r;
}
function sgErr() {
  if (!SG.t) return 'Choose who it is for';
  if (!SG.skip && !SG.changes.length) return 'Change a food first';
  if (!SG.skip && !SG.how) return 'Choose how long';
  if (!SG.reason) return 'Choose why';
  if (!SG.skip) { const p = planOf(sgReq()); if (p.block) return p.block; }
  return '';
}
function sgReview() { if (!sgCount()) { toast('Change a food first'); return; } SG.apOpen = false; openSheet(sgReviewHtml); }
/* the changes as a table, as the Hub's Item requests review (a tinted head row; Food | Was | Now): the review sheet and the request page's B and C */
function diffLine(c, d) {
  const f = feed(c.feed).from, R = (name, sub, was, now, cls = '') => `<div class="dtab__r${cls}"><span class="dtab__f"><b>${name}</b><small>${sub}</small></span><span class="dtab__w">${was}</span><span class="dtab__n">${now}</span></div>`;
  if (c.op === 'remove') { const w = entryOf(d, c.feed, c.item); return R(esc(item(c.item).name), `${f} feed`, w ? qtyText(w.qty, w.unit) : '', '<em class="dtab__stop">Stopped</em>', ' dtab__r--stop'); }
  if (c.op === 'add') return R(esc(item(c.to).name), `${f} feed · new`, '–', `<b>${qtyText(c.qty, c.unit)}</b>${garText(c) ? `<small>${esc(garText(c))}</small>` : ''}`);
  const w = entryOf(d, c.feed, c.item); if (!w) return R(esc(item(c.to || c.item).name), `${f} feed`, '', `<b>${qtyText(c.qty, c.unit)}</b>`);
  const x = lineDiff(w, c), only = !x.item && !x.prep && !x.cut && !x.days;
  const part = (o, now) => [x.item ? esc(item(now ? c.to : c.item).name) : '', x.amount || only ? qtyText(o.qty, o.unit) : '', x.prep ? esc(o.prep || 'As it comes') : '', x.cut ? esc(o.cut || 'Whole') : '', x.days ? esc(lineDays(o)) : ''].filter(Boolean).join(' · ');
  return R(esc(item(c.item).name), `${f} feed`, part(w, false), `<b>${part(c, true)}</b>`);
}
const diffTable = (cs, d) => `<div class="dtab"><div class="dtab__h"><span>Food</span><span>Was</span><span>Now</span></div>${cs.map(c => diffLine(c, d)).join('')}</div>`;
const SG_HOW = [['always', 'From Now On'], ['once', 'Some Days'], ['yearly', 'Every Year']];
/* how long: the design system's segment (the New Request form uses it too) */
const howTiles = (cur, set) => `<div class="az-segment rv-seg" role="tablist" aria-label="How long">${SG_HOW.map(([k, l]) => `<button role="tab" aria-selected="${cur === k}" onclick="${set(k)}">${l}</button>`).join('')}</div>`;
/* (owner, 19 Nov 2026: "Send to Hydar … just Request, that's all") the review: the changes, how long, why, proof, who it goes to; the button says Send Request.
   In the design system's parts, as the Hub's Help Desk and Item requests forms: labels over fields, chips, the upload box, a picked card */
function sgReviewHtml() {
  if (!SG) return { title: '', body: '' };
  const r = sgReq(), p = r.kind === 'items' ? planOf(r) : null, e = sgErr(), ap = user(r.approver), d = sgDiet(), F = (label, body, req = false, end = '') => `<div class="az-field"><span class="az-label rv-lab"><span>${label}${req ? ' <span class="az-req">*</span>' : ''}</span>${end}</span>${body}</div>`;
  const edit = `<button class="lnk" onclick="closeSheet()">Edit</button>`;
  const chg = r.kind === 'skip' ? F('Skip a feed', `<div class="az-picked">${I('no_meals')}<span class="grow"><span class="az-who__name">${esc(sgSkipText())}</span><span class="az-who__sub">The diet stays as it is</span></span></div>`, false, edit)
    : F(`Changes · ${SG.changes.length}`, `<p class="rv-for">${esc(sgName(SG.t))} · ${esc(d.name)}</p>${diffTable(SG.changes, d)}`, false, edit);
  const how = r.kind === 'skip' ? '' : F('How Long', `${howTiles(SG.how, k => `SG.how='${k}';redrawSheet()`)}
    ${SG.how === 'once' ? `<div class="sg-chips">${[3, 7, 14, 30].map(k => `<button class="az-chip" aria-selected="${SG.days === k}" onclick="SG.days=${k};SG.dSet=true;redrawSheet()">${k} days</button>`).join('')}</div>` : ''}
    ${SG.how === 'yearly' ? `<div class="sg-chips">${SG_SEASONS.map(([k, a, b]) => `<button class="az-chip" aria-selected="${SG.season === k}" onclick="SG.season='${k}';redrawSheet()">${k} · ${mdText(a)} – ${mdText(b)}</button>`).join('')}</div>` : ''}
    ${SG.how && SG.how !== 'yearly' ? `<div class="sg-chips">${[[0, 'From today'], [1, 'From tomorrow']].map(([k, l]) => `<button class="az-chip" aria-selected="${SG.from === k}" onclick="SG.from=${k};redrawSheet()">${l}</button>`).join('')}</div>` : ''}
    ${SG.how ? `<p class="rv-when2">${esc(SG.how === 'always' ? `From ${dayText(r.start)}, until someone changes it` : SG.how === 'once' ? `${fmtDay(r.start)} – ${fmtDayY(r.end)}, then back to their diet` : `${mdText(r.start)} – ${mdText(r.end)}, every year`)}</p>` : ''}`, true);
  const all = r.kind === 'skip' ? REASONS.skip : REASONS.items, shown = SG.more ? all : (r.kind === 'skip' ? all : SG_REASONS);
  const why = F('Why', `<div class="sg-chips">${shown.map(t => `<button class="az-chip" aria-selected="${SG.reason === t}" onclick="SG.reason=${JSON.stringify(t).replace(/"/g, '&quot;')};redrawSheet()">${esc(t)}</button>`).join('')}${r.kind === 'skip' || SG.more ? '' : `<button class="az-chip sg-more" onclick="SG.more=true;redrawSheet()">More Reasons</button>`}</div>`, true);
  const has = k => SG.files.some(f => f.kind === k);
  const proof = F('Proof (optional)', `${SG.files.length ? `<div class="files">${SG.files.map(f => `<span class="file">${I(f.kind === 'image' ? 'image' : 'mic', 20)}${esc(f.name)}<button class="az-iconbtn" style="width:28px;height:28px" onclick="sgFile('${f.kind}')" aria-label="Remove ${esc(f.name)}">${I('close', 18)}</button></span>`).join('')}</div>` : ''}
    <div class="rv-up">${has('image') ? '' : `<button class="az-upload" onclick="sgFile('image')"><i class="az-i" aria-hidden="true">add_photo_alternate</i><b>Add A Photo</b><span>JPEG or PNG</span></button>`}${has('audio') ? '' : `<button class="az-upload" onclick="sgFile('audio')"><i class="az-i" aria-hidden="true">mic</i><b>Voice Note</b><span>Up to 1 minute</span></button>`}</div>
    ${SG.note ? `<label class="az-input az-input--text az-textarea"><textarea id="sg-text" rows="2" placeholder="What the dietician should know" oninput="SG.text=this.value" aria-label="Note">${esc(SG.text)}</textarea></label>` : `<button class="lnk rv-note" onclick="SG.note=true;redrawSheet()">${I('add', 18)}Add a note</button>`}`);
  /* who approves (owner, 18 Nov 2026): a Dietician or the Kitchen Operator; the Diet department's head unless changed */
  const goes = F('Goes To', SG.apOpen ? DIET_APPROVERS.filter(id => id !== S.user).map(id => { const x = user(id), on = r.approver === id;
      return `<button class="az-pickrow" role="radio" aria-checked="${on}" onclick="SG.approver='${id}';SG.apOpen=false;redrawSheet()">${avatar(x.name)}<span class="az-pickrow__t"><b>${esc(x.name)}</b><span>${esc(x.title)}</span></span>${I(on ? 'radio_button_checked' : 'radio_button_unchecked', 24, on)}</button>`; }).join('')
    : `<div class="az-picked">${avatar(ap.name)}<span class="grow"><span class="az-who__name">${esc(ap.name)}</span><span class="az-who__sub">${esc(ap.title)}</span></span><button class="lnk" onclick="SG.apOpen=true;redrawSheet()">Change</button></div>`);
  const urgent = `<button class="az-checkrow swrow" role="switch" aria-checked="${SG.prio !== 'normal'}" onclick="SG.prio=SG.prio==='normal'?'high':'normal';redrawSheet()"><span class="grow">Urgent<small class="sg-small">The dietician sees it first</small></span><span class="az-switch" aria-checked="${SG.prio !== 'normal'}"></span></button>`;
  return { title: SG.edit ? 'Update request' : 'Review Request', sub: esc(sgName(SG.t)), bottom: true, form: true,
    body: `${chg}${how}${why}${proof}${goes}${urgent}${p && p.block ? `<div class="az-warnline">${I('warning', 18)}<span class="grow">${esc(p.block)}</span></div>` : ''}`,
    foot: `<div class="rv-foot">${e ? `<p class="rv-need">${esc(e)} to send</p>` : ''}<button class="az-btn${e ? ' az-btn--disabled' : ''}" aria-disabled="${!!e}" onclick="sgSend()">${I('send')}${SG.edit ? 'Update request' : 'Send Request'}</button></div>` };
}
const SG_FILES = { image: { name: 'Photo of the animals.jpg', kind: 'image', size: '1.6 MB' }, audio: { name: 'Voice note 0:12.m4a', kind: 'audio', size: '96 KB' } };
function sgFile(k) { const has = SG.files.some(f => f.kind === k); SG.files = has ? SG.files.filter(f => f.kind !== k) : [...SG.files, SG_FILES[k]]; redrawSheet(); }
/* sent: straight to the request with a toast, as the Hub's Help Desk and Item requests */
function sgSend() {
  const e = sgErr(); if (e) { toast(e); return; }
  const x = sgReq(); delete x.by; let r;
  if (SG.edit) {
    r = by('requests', SG.edit);
    if (!r || r.by !== S.user || !isOpen(r)) { toast(`Can't edit ${SG.edit} now`); return; }
    ['targets', 'date', 'feeds', 'slot', 'base', 'start', 'end', 'changes', 'how', 'scope', 'asked', 'name'].forEach(k => delete r[k]);
    Object.assign(r, x, { state: 'pending', delay: null }); r.events.push({ kind: 'edited', by: S.user, at: nowStamp(), note: '' });
  } else { r = { id: newRequestId(), ...x, by: S.user, state: 'pending', site: sgSite(x), events: [{ kind: 'raised', by: S.user, at: nowStamp() }] }; D.requests.push(r); }
  const was = SG.edit; SG = null; S.rTab = 'pending'; S.rDept = 'all'; closeAll(); storeSave();
  toast(`${was ? 'Request updated' : 'Request sent'} · ${r.id}`); go(`#/requests/${r.id}`);
}
function sgSite(r) { const a = r.level === 'animal' ? by('animals', r.ref) : tAnimals(r)[0]; return r.level === 'species' || r.level === 'site' ? (r.level === 'site' ? r.ref : a ? pathOfAnimal(a).site : null) : pathOf(r).site; }

/* ---------- the page ---------- */
function paneSuggest(q) {
  /* New Request with Diet, and Edit Request, are the Help Desk form (form.js); this screen keeps Suggest A Change, Change food from that form, and the new-diet requests' editor */
  { const e = q.get('edit') && by('requests', q.get('edit')); if ((q.get('dept') === 'diet' && !q.get('form')) || (e && isDiet(e))) return paneForm(q); }
  const d = sgInit(q), top = topbar({ close: d.form ? 'sgFormBack(false)' : 'sgClose()', title: d.form ? (d.kind === 'new' ? 'New diet' : 'Change item values') : d.edit ? 'Edit Request' : 'Suggest A Change', actions: d.t && sgCount() ? iconBtn('restart_alt', 'Start Again', 'sgClear()') : '' });
  if (!canRaise(me()) && !d.edit) return pane('pane--fill', top, `${empty1(`Biologists suggest diet changes. ${esc(me().title)}s see them in Help Desk.`)}<div class="who-cta"><button class="az-btn az-btn--outline" onclick="asBiologist('#/suggest')">${avatar(user('u-kiran').name, '24')}View as ${esc(user('u-kiran').name)}, Biologist</button></div>`, '', 'sg-no');
  /* nobody chosen yet: one field to choose who, and the species sheet opens by itself the first time (owner, 19 Nov: a bottom sheet, not a page) */
  if (!d.t) { if (!d.askedWho) { d.askedWho = true; setTimeout(() => { if (SG && !SG.t && !SH.length) sgWho(); }, 120); }
    return pane('pane--fill sg-page', top, `<div class="body sg-body"><section class="az-section">${select('For', '', 'sgWho()', { req: true, placeholder: 'Select Species, enclosure or animal', id: 'sg-for' })}</section></div>`, '', 'sg-who'); }
  /* the bottom bar (owner, 19 Nov: "use a proper button"), as the Hub's Item requests: what you have changed on the left, the design system's
     green button on the right (Review, or Done from the New Request form); before any change the same button, disabled, and a hint */
  const n = sgCount(), foods = new Set(d.changes.map(c => c.op === 'add' ? 'a' + c.to : c.item)).size;
  const sub = d.skip ? sgSkipText() : `${plural(foods, 'food')} · ${sgDiet() ? sgDiet().name : ''}`;
  const foot = d.t && sgDiet() ? `<div class="sg-bar">${n ? `<span class="sg-bar__t"><b>${plural(n, 'change')}</b><small>${esc(sub)}</small></span>` : '<span class="sg-bar__t sg-bar__t--hint"><b>No changes yet</b><small>Tap − or + on a food</small></span>'}
    <button class="az-btn az-btn--approve sg-bar__go"${n ? ` onclick="${d.form ? 'sgFormBack(true)' : 'sgReview()'}"` : ' disabled'}>${d.form ? `${I('check', 20)}Done` : `Review${I('arrow_forward', 20)}`}</button></div>` : '';
  return pane('pane--fill sg-page', top, `<div class="body sg-body">${sgEditor()}</div>`, foot, d.t ? 'sg-edit' : 'sg-who');
}

/* ---------- on the request: a tracker (Sent · Dietician · Kitchen · Live), "Save It As" for the dietician, and the kitchen's "Diet updated" ---------- */
function dietTrack(r) {
  const st = r.state, ap = user(r.approver), done = st === 'completed', live = done && (r.kind === 'skip' ? r.date <= TODAY : phaseOf(r) !== 'next');
  const head = st === 'pending' ? (r.approver === S.user ? 'Waiting for your approval' : `${first(ap.name)} is checking it`)
    : st === 'delayed' ? `Delayed till ${fmtDay(r.delay.until)}` : st === 'approved' || st === 'in_progress' ? (onTeam(r, me()) ? 'Approved. Update the diet, then mark it' : 'Approved. The kitchen is updating the diet')
    : done ? `Diet updated · ${approvedWhen(r)}` : st === 'rejected' ? 'Not approved' : st === 'cancelled' ? 'Cancelled' : stateOf(r).label;
  const at = st === 'pending' || st === 'delayed' ? 1 : st === 'approved' || st === 'in_progress' ? 2 : done ? (live ? 4 : 3) : 1, bad = ['rejected', 'cancelled'].includes(st);
  const steps = [['Sent', 'send'], ['Dietician', 'how_to_reg'], ['Kitchen', 'soup_kitchen'], ['Live', 'task_alt']];
  return `<div class="sg-track"><b>${esc(head)}</b><ol class="sg-steps">${steps.map(([l, ic], i) => { const c = bad && i === 1 ? 'bad' : i < at ? 'done' : i === at && !bad ? 'now' : '';
    return `<li class="${c}"><i>${c === 'done' ? I('check', 16) : c === 'bad' ? I('close', 16) : ''}</i><span>${l}</span></li>`; }).join('')}</ol></div>`;
}
/* the dietician decides how it is saved: only where it was asked for, or for everyone on that diet (the kitchen rules then follow) */
function saveAsSec(r) {
  if (r.kind !== 'items' || !r.base || r.base === 'many' || r.approver !== S.user || !isOpen(r)) return '';
  const asked = r.asked || targetsOf(r), uses = D.assigns.filter(a => a.diet === r.base && a.sp === r.sp && !ended(a)), all = uses.map(a => ({ sp: a.sp, level: a.level, ref: a.ref ?? null, group: a.group || null }));
  if (!all.length || (all.length === asked.length && all.every(t => asked.some(x => samePlace(x, t))))) return '';
  const on = (ts => (eatNow(ts).list.find(e => e.diet.id === r.base) || { animals: [] }).animals.length), k = r.scope === 'all' ? 'all' : 'here';
  const opt = (key, b, s) => `<button class="sg-radio" aria-pressed="${k === key}" onclick="sgScope('${r.id}','${key}')"><span class="r"></span><span class="grow"><b>${esc(b)}</b><span>${esc(s)}</span></span></button>`;
  return `<p class="secttl">Save It As</p><div class="sg-scope">${opt('here', `Only ${placesText(asked)}`, `${plural(on(asked), 'animal')} · as ${first(user(r.by).name)} asked`)}${opt('all', `Everyone on ${diet(r.base).name}`, `${plural(on(all), 'animal')} in ${plural(uses.length, 'place')}`)}</div>`;
}
function sgScope(id, k) {
  const r = by('requests', id); if (!r.asked) r.asked = targetsOf(r).map(t => ({ ...t }));
  const ts = k === 'all' ? D.assigns.filter(a => a.diet === r.base && a.sp === r.sp && !ended(a)).map(a => ({ sp: a.sp, level: a.level, ref: a.ref ?? null, group: a.group || null })) : r.asked.map(t => ({ ...t }));
  Object.assign(r, { scope: k, targets: ts, sp: ts[0].sp, level: ts[0].level, ref: ts[0].ref }); storeSave(); render();
}
let SGDONE = { note: '' };
function dietDoneSheet(id) {
  const r = by('requests', id), job = !changesDiet(r); SGDONE = { note: '' };
  openSheet(() => { const sh = r.kind === 'skip' || job ? [] : stockCheck(r);
    return { title: job ? 'Done?' : 'Diet updated?', sub: esc(r.title), bottom: true, form: true,
      body: `<div class="sg-sum">${dietTrackLine(r)}${sh.map(x => `<div class="sg-sum__r">${I(x.status === 'ok' ? 'inventory_2' : 'warning', 18)}<span>${esc(x.item.name)}: ${x.status === 'ok' ? `in store, ${esc(x.need)} a day` : x.status === 'out' ? 'none in store' : `only ${esc(stockText(x.item))} in store`}</span></div>`).join('')}</div>
        <label class="az-field"><span class="az-label">Note (optional)</span><span class="az-input az-input--text az-textarea"><textarea id="dd-note" rows="2" placeholder="For example, from the evening feed" oninput="SGDONE.note=this.value">${esc(SGDONE.note)}</textarea></span></label>`,
      foot: `<button class="az-btn az-btn--outline" onclick="closeSheet()">Back</button><button class="az-btn" onclick="doAct('${id}','complete',SGDONE)">${I('task_alt')}${job ? 'Done' : 'Diet updated'}</button>` }; });
}
const dietTrackLine = r => `<div class="sg-sum__r">${I('pets', 18)}<span>${esc(r.kind === 'skip' ? autoTitle(r) : !changesDiet(r) ? `${plural(animalsIn(r).length, 'animal')} · ${r.title}` : `${plural(animalsIn(r).length, 'animal')} · ${approvedWhen(r)}`)}</span></div>`;

/* ---------- Diet home: the Biologist starts here; the Kitchen sees what it must update ---------- */
function sgStartRow() {
  if (!canRaise(me())) return '';
  return `<button class="sg-start" onclick="SG=null;go('#/suggest')"><span class="sg-start__ic">${I('edit_note')}</span><span class="grow"><b>Suggest A Diet Change</b><span>Scan or pick the animals, then change their food</span></span>${I('chevron_right', 20)}</button>`;
}
function kitchenRow() {
  const team = (dept('diet').team || []); if (!team.includes(S.user)) return '';
  const todo = D.requests.filter(r => isDiet(r) && ['approved', 'in_progress'].includes(r.state));
  return `<a class="reqsum" href="#/requests" onclick="S.rTab='approved';S.rSub='all';S.rDept='diet'"><span class="reqsum__ic">${I('soup_kitchen')}</span><span class="grow"><b>Diet Updates</b><span class="sub">${todo.length ? `${todo.length} approved, to update` : 'Nothing to update'}</span></span><span class="cnt">${todo.length}</span>${I('chevron_right', 20)}</a>`;
}

/* ---------- When approved (owner, 18 Nov: "needs work"): the plan said in the record's own rows — the diet, who gets it, when ----------
   One container, a label over a bold value, as the rest of the request; the long sentences of planOf's lines become short values */
const EFF = { add: ['New Diet', b => b.replace(/^New diet: /, '')], edit: ['Diet Changed', b => b.replace(/ is changed$/, '')], swap_horiz: ['Moves To', b => b.replace(/^Move to /, '')],
  event_busy: ['Diet Ends', b => b.replace(/ ends$/, '')], edit_note: ['Diets That Change', b => b], more_horiz: ['', b => b], no_meals: ['Feeds', b => b] };
function effectView(r, p, o = {}) {
  const open = !r.outcome, pick = ic => p.lines.filter(l => l.icon === ic)[0], num = l => l ? parseInt(l.b, 10) || 0 : 0, rows = [];
  const R = (icon, k, v) => `<div class="rsec__r">${I(icon)}<span class="t"><span>${k}</span>${v}</span></div>`;
  const link = (view, text) => open ? `<button class="lnk" onclick="reachSheet('${view}','${r.id}')">${esc(text)}${I('chevron_right', 18)}</button>` : '';
  p.lines.filter(l => EFF[l.icon]).forEach(l => rows.push(R(l.icon === 'no_meals' ? 'no_meals' : l.icon === 'event_busy' ? 'event_busy' : 'restaurant', EFF[l.icon][0],
    `<b>${esc(EFF[l.icon][1](l.b))}${l.tag ? ' ' + ktag(l.tag) : ''}</b>${[l.small, l.x].filter(Boolean).map(t => `<span>${esc(t)}</span>`).join('')}${l.view === 'ops' ? link('ops', 'See The Diets') : ''}`)));
  const g = pick('groups'), k = pick('do_not_disturb_on'), mv = pick('move_down'), back = pick('undo'), yr = pick('event_repeat');
  if (g) { const n = num(g), all = n + num(k);
    rows.push(R('groups', 'Who Gets It', `<b>${all > n ? `${n} of ${plural(all, 'animal')}` : plural(n, 'animal')}</b>${all > n ? `<span class="effbar" role="img" aria-label="${n} of ${all}"><i style="width:${Math.round(n / all * 100)}%"></i></span>` : ''}<span>${esc(g.small)}</span>
      <span class="efflinks">${link('get', 'See Who')}${k ? link('keep', `${num(k)} keep their own diet`) : ''}${mv ? link('moved', mv.b) : ''}</span>`)); }
  const lc = s => s ? s.charAt(0).toLowerCase() + s.slice(1) : '';
  const when = r.kind === 'skip' ? [`${dayText(r.date).charAt(0).toUpperCase() + dayText(r.date).slice(1)}, ${fmtDayY(r.date)}`, '']
    : r.kind === 'end' ? [`Last day ${fmtDayY(r.stop)}`, back ? `Then ${num(back) ? back.b.replace(/^\d+ \w+ /, '') : lc(back.b)} ${back.small}` : '']
    : r.how === 'once' ? [`${fmtDay(r.start)} – ${fmtDayY(r.end)}`, back ? `Then ${lc(back.small)}` : '']
    : r.how === 'yearly' ? [`Every year, ${mdText(r.start)} – ${mdText(r.end)}`, yr ? yr.small : '']
    : [`From ${r.start && r.start > TODAY ? dayText(r.start) : 'today'}, no end date`, ''];
  rows.push(R('event', 'When', `<b>${esc(when[0])}</b>${when[1] ? `<span>${esc(when[1])}</span>` : ''}`));
  const title = r.outcome ? 'What Changed' : isOpen(r) ? 'When Approved' : 'When The Kitchen Updates It', html = `<div class="rsec effect2">${rows.join('')}</div>${p.block ? `<div class="az-warnline az-warnline--bad">${I('error', 18)}<span>${esc(p.block)}</span></div>` : ''}`;
  return o.bare ? { title, html } : `<p class="secttl">${title}</p>${html}`;
}

/* ---------- Select Species (owner, 18 Nov: "Select Species page needs more work"): who a request is for, as a page in two steps ----------
   1 · search (with the QR scan), Recent places, every species with its photo, scientific name and animal count;
   2 · inside a species: Whole species · Enclosures (by section; a section can be picked whole) · Animals (search, number, sex, age),
   and Done saying what was picked. Used by New Request (form.js, S.draft.pick) and by Suggest A Change (SG.pick) */
const whoNew = t => ({ sp: t ? t.sp : null, q: '', aq: '', tab: !t || t.level === 'species' ? 'all' : t.level === 'animal' ? 'ani' : 'enc', sel: t ? { sp: t.sp, level: t.level, ref: t.ref ?? null } : null });
const whoJs = o => JSON.stringify(o).replace(/"/g, '&quot;');
const ageText = m => m == null ? '' : m >= 24 ? `${Math.floor(m / 12)} y` : `${m} m`;
const SEX = { M: ['male', 'Male'], F: ['female', 'Female'] };
/* as the Antz app (18 Nov): species cards as SpeciesCustomCard (round photo, scientific name, M / F / UD chips, the count big on the right);
   sections and enclosures as MedicalEnclosureCard (round icon, count chips, a tint and a tick when picked); animals as NewAnimalCustomCard
   (photo with the sex badge, AAID, name, enclosure and age); the QR scan inside the search bar */
const sexChips = list => { const n = k => list.filter(a => (a.sex || 'U') === k).length; return `<span class="who-sx">${[['M', 'm'], ['F', 'f'], ['U', 'u']].filter(([k]) => n(k)).map(([k, c]) => `<em class="${c}">${k === 'U' ? 'UD' : k} - ${n(k)}</em>`).join('')}</span>`; };
const cnt = (l, n) => `<em>${l} ${n}</em>`;
function whoPage(P, ref, { back, done, title = 'Select Species' }) {
  const top = topbar({ lead: iconBtn('arrow_back', 'Back', back), title }), on = t => P.sel && samePlace(P.sel, t) && (P.sel.level !== 'species' || t.level === 'species');
  const pickJs = t => `${ref}.sel=${whoJs(t)};render()`, tick = t => on(t) ? `<span class="who-chk">${I('check_circle', 22, true)}</span>` : '';
  const scan = `${ref}.sel=${whoJs(sgRecent()[0])};${ref}.sp=${sgRecent()[0].sp};${ref}.tab='enc';render();toast('Scanned the QR on ${esc(sgName(sgRecent()[0]))}')`;
  const search = (id, val, ph, js, qr) => `<label class="az-input az-input--text who-q">${I('search')}<input id="${id}" type="search" placeholder="${ph}" value="${esc(val)}" oninput="${js}" autocomplete="off" aria-label="${ph}">${qr ? `<button class="who-qr" onclick="event.preventDefault();${scan}" aria-label="Scan the enclosure QR">${I('qr_code_scanner')}</button>` : ''}</label>`;
  let body = '';
  if (!P.sp) {
    const q = P.q.trim().toLowerCase(), sps = D.species.filter(s => !q || s.name.toLowerCase().includes(q) || s.sci.toLowerCase().includes(q) || String(s.id).includes(q)), places = q ? sgFind(P.q).filter(t => t.level !== 'species') : [];
    body = search('who-q', P.q, 'Search species, enclosure or animal', `${ref}.q=this.value;render()`, true)
      + (q ? '' : `<p class="who-h">Recent</p><div class="who-recent">${sgRecent().map(t => `<button class="who-rc" onclick="${ref}.sp=${t.sp};${ref}.tab='${whoNew(t).tab}';${ref}.sel=${whoJs(t)};render()">${spThumb(species(t.sp))}<span><b>${esc(sgName(t))}</b><small>${esc(sgWhere(t))}</small></span></button>`).join('')}</div>`)
      + (places.length ? `<p class="who-h">Enclosures And Animals</p><div class="who-list">${places.map(t => `<button class="who-row" onclick="${ref}.sp=${t.sp};${ref}.tab='${whoNew(t).tab}';${ref}.sel=${whoJs(t)};render()"><span class="who-av">${I(t.level === 'animal' ? 'pets' : t.level === 'section' ? 'grid_view' : 'fence', 22)}</span><span class="grow"><b>${esc(sgName(t))}</b><span class="who-cc">${cnt(sgWhere(t), '')}${cnt('Animals', tAnimals(t).length)}</span></span>${I('chevron_right', 20)}</button>`).join('')}</div>` : '')
      + `<p class="who-h">Species · ${sps.length}</p>${sps.map(s => { const as = spAnimals(s.id);
        return `<button class="who-spc" onclick="${ref}.sp=${s.id};${ref}.tab='all';${ref}.sel=${whoJs({ sp: s.id, level: 'species', ref: null })};render()">${spThumb(s)}<span class="grow"><b>${esc(s.name)}</b><i>${esc(s.sci)}</i>${sexChips(as)}</span><span class="who-big">${as.length}</span></button>`; }).join('') || `<p class="sg-none">No species by that name</p>`}`;
  } else {
    const s = species(P.sp), all = spAnimals(s.id), tabs = [['all', 'Whole species'], ['enc', 'Enclosures'], ['ani', 'Animals']];
    body = `<div class="who-spc who-spc--head">${spThumb(s)}<span class="grow"><b>${esc(s.name)}</b><i>${esc(s.sci)}</i>${sexChips(all)}</span><button class="lnk" onclick="${ref}.sp=null;${ref}.sel=null;render()">Change</button></div>
      <div class="az-segment who-seg" role="tablist" aria-label="Who">${thumb()}${tabs.map(([k, l]) => `<button role="tab" aria-selected="${P.tab === k}" onclick="${ref}.tab='${k}';render()">${l}</button>`).join('')}</div>`;
    if (P.tab === 'all') { const t = { sp: s.id, level: 'species', ref: null };
      body += `<button class="who-all${on(t) ? ' on' : ''}" onclick="${pickJs(t)}"><span class="who-av">${I('pets', 22)}</span><span class="grow"><b>All ${esc(s.name)}</b><span class="who-cc">${cnt('Enclosures', new Set(all.map(a => a.enc)).size)}${cnt('Animals', all.length)}</span></span>${tick(t)}</button>`; }
    if (P.tab === 'enc') {
      body += `<p class="who-h">Choose a section or an enclosure</p>` + [...new Set(all.map(a => pathOfAnimal(a).section))].map(sid => { const sec = by('sections', sid), ts = { sp: s.id, level: 'section', ref: sid }, encs = [...new Set(all.filter(a => pathOfAnimal(a).section === sid).map(a => a.enc))];
        return `<div class="who-list"><button class="who-row who-row--sec${on(ts) ? ' on' : ''}" onclick="${pickJs(ts)}"><span class="who-av">${I('grid_view', 22)}</span><span class="grow"><b>${esc(sec.name)}</b><span class="who-cc">${cnt('Enclosures', encs.length)}${cnt('Animals', tAnimals(ts).length)}</span></span>${tick(ts)}</button>
          ${encs.map(eid => { const te = { sp: s.id, level: 'enclosure', ref: eid }; return `<button class="who-row${on(te) ? ' on' : ''}" onclick="${pickJs(te)}"><span class="who-av who-av--sm">${I('fence', 20)}</span><span class="grow"><b>${esc(by('enclosures', eid).name)}</b><span class="who-cc">${cnt('Animals', tAnimals(te).length)}</span></span>${tick(te)}</button>`; }).join('')}</div>`; }).join('');
    }
    if (P.tab === 'ani') {
      const q = P.aq.trim().toLowerCase(), list = all.filter(a => !q || animalName(a).toLowerCase().includes(q) || String(a.id).includes(q) || by('enclosures', a.enc).name.toLowerCase().includes(q));
      body += search('who-aq', P.aq, 'Search Animal', `${ref}.aq=this.value;render()`, false)
        + `<div class="who-anl">${list.slice(0, 60).map(a => { const t = { sp: s.id, level: 'animal', ref: a.id }, sx = a.sex === 'M' ? 'm' : a.sex === 'F' ? 'f' : 'u';
          return `<button class="who-an${on(t) ? ' on' : ''}" onclick="${pickJs(t)}"><span class="who-an__img">${spThumb(s)}<em class="who-sxb ${sx}">${a.sex === 'M' ? 'M' : a.sex === 'F' ? 'F' : 'UD'}</em></span><span class="grow"><b>AAID: ${a.id}</b>${a.name ? `<span class="nm">${esc(a.name)}</span>` : ''}<span>${esc([by('enclosures', a.enc).name, ageText(a.ageM)].filter(Boolean).join(' · '))}</span></span><span class="who-radio${on(t) ? ' on' : ''}" aria-hidden="true"></span></button>`; }).join('') || '<p class="sg-none">No animal by that number or name</p>'}</div>`;
    }
  }
  const sel = P.sel, foot = `<button class="az-btn" ${sel ? `onclick="${done}"` : 'disabled'}>${sel ? `Done · ${esc(sgName(sel))} · ${plural(tAnimals(sel).length, 'animal')}` : 'Choose who it is for'}</button>`;
  return pane('pane--fill who-page', top, `<div class="body who-body">${body}</div>`, foot, 'who-' + (P.sp || 'list') + '-' + P.tab);
}
function sgWhoDone() { const t = SG.pick.sel; SG.pick = null; sgPick(t.sp, t.level, t.ref); }

/* ---------- pickers as bottom sheets with search (owner, 19 Nov 2026: "species selection as a bottom sheet; the diet also a bottom sheet, I can
   search and select; don't make these infinite forms; don't show the animal count at all"). The form or the editor shows the choice as one field;
   the sheet does the choosing, then closes. One sheet at a time: going into a species swaps the sheet's content, it never stacks a second sheet ---------- */
const KT_OF = { yearround: 'yr', seasonal: 'se', timebound: 'tb' };
const dietTag = d => `<span class="ktag ktag--${KT_OF[d.type] || 'ot'}">${esc(KINDTYPE[d.type] || 'Diet')}</span>`;
/* (19 Nov: "it all looks AI-designed") the design system's option rows (az-pickrow: a thin outline, the picked one green), square 44 px photos,
   the design system's search field and segment; as the Hub's Help Desk pickers */
const pkSearch = (id, val, ph, js, qr = '') => `<label class="az-input az-input--text pk-q">${I('search')}<input id="${id}" type="search" placeholder="${ph}" value="${esc(val)}" oninput="${js}" autocomplete="off" aria-label="${ph}">${qr}</label>`;
const pkRow = (js, lead, title, sub, end = null, on = false) => `<button class="az-pickrow pk-r" role="radio" aria-checked="${on}" onclick="${js}">${lead}<span class="az-pickrow__t"><b>${title}</b>${sub ? `<span>${sub}</span>` : ''}</span>${end !== null ? end : I(on ? 'radio_button_checked' : 'radio_button_unchecked', 24, on)}</button>`;
const pkList = rows => `<div class="pk-list">${rows}</div>`;
const pkFocus = id => setTimeout(() => { const i = document.getElementById(id); if (i && !isPhone()) i.focus({ preventScroll: true }); }, 60);
const pkIc = ic => `<span class="pk-ic">${I(ic, 22)}</span>`;

/* Select Species: search (a species, or an enclosure or animal by name or number) with the QR scan, Recent, every species (photo, name, scientific
   name: Kitchen & Diet's SpeciesSearchSelect). A species opens in the same sheet as Kitchen & Diet's scope picker (ScopePickerPanel, owner 19 Nov 2026:
   "check Species Selection from the codebase"): Species-wide · Site-wide · Section-wide · Enclosure-wide · Animal-wide, each with how many diets are set
   there; the open one lists its places with their path and diets (LocationScopePicker), animals with search. A tap picks and closes. cb(sp, level, ref) */
let PK = { q: '', sp: null, scope: null, aq: '', cb: '', cur: null };
function spPickSheet(cb, cur = null) { PK = { q: '', sp: null, scope: null, aq: '', cb, cur }; openSheet(spPickHtml); pkFocus('pk-q'); }
const PK_SCOPES = [['species', 'Species-wide', 'public'], ['site', 'Site-wide', 'location_on'], ['section', 'Section-wide', 'grid_view'], ['enclosure', 'Enclosure-wide', 'fence'], ['animal', 'Animal-wide', 'pets']];
/* how many diets are set at a place of the species (not inherited), as the Kitchen's scope cards say */
const dietsSetAt = (sp, level, ref = null) => new Set(D.assigns.filter(a => a.sp === sp && a.level === level && (level === 'species' || a.ref === ref) && !ended(a)).map(a => a.diet)).size;
const dietsWord = n => n ? plural(n, 'diet') : 'No diet of its own';
function pkSpOpen(id) { PK.sp = id; PK.aq = ''; PK.scope = PK.cur && PK.cur.sp === id && PK.cur.level !== 'species' ? PK.cur.level : null; redrawSheet(); }
function spPickHtml() {
  const go1 = t => `closeAll();${PK.cb}(${t.sp},'${t.level}',${t.ref ?? 'null'})`, isOn = t => !!PK.cur && samePlace(PK.cur, t) && (PK.cur.level !== 'species' || t.level === 'species');
  if (!PK.sp) {
    const q = PK.q.trim().toLowerCase(), sps = D.species.filter(s => !q || s.name.toLowerCase().includes(q) || s.sci.toLowerCase().includes(q) || String(s.id).includes(q)).sort((a, b) => a.name.localeCompare(b.name));
    const places = q ? sgFind(PK.q).filter(t => t.level !== 'species') : [], rc = sgRecent()[0];
    const qr = `<button class="who-qr" onclick="event.preventDefault();${go1(rc)};toast('Scanned the QR on ${esc(sgName(rc))}')" aria-label="Scan the enclosure QR">${I('qr_code_scanner')}</button>`;
    const body = pkSearch('pk-q', PK.q, 'Species, enclosure or animal', 'PK.q=this.value;redrawSheet()', qr)
      + (q ? '' : `<p class="az-label pk-h">Recent</p>${pkList(sgRecent().slice(0, 3).map(t => pkRow(go1(t), spThumb(species(t.sp)), esc(sgName(t)), esc(`${species(t.sp).name} · ${sgWhere(t)}`), undefined, isOn(t))).join(''))}`)
      + (places.length ? `<p class="az-label pk-h">Enclosures And Animals</p>${pkList(places.map(t => pkRow(go1(t), pkIc(t.level === 'animal' ? 'pets' : t.level === 'section' ? 'grid_view' : 'fence'), esc(sgName(t)), esc(`${species(t.sp).name} · ${sgWhere(t)}`), undefined, isOn(t))).join(''))}` : '')
      + `<p class="az-label pk-h">Species</p>${sps.length ? `<div class="pk-list pk-list--sp">${sps.map(s => pkRow(`pkSpOpen(${s.id})`, spThumb(s), esc(s.name), `<i>${esc(s.sci)}</i>`, I('chevron_right', 24), PK.cur && PK.cur.sp === s.id)).join('')}</div>` : '<p class="sg-none">No species by that name</p>'}`;
    return { title: 'Select Species', bottom: true, body };
  }
  const s = species(PK.sp), all = spAnimals(s.id), ids = k => [...new Set(all.map(a => pathOfAnimal(a)[k]))];
  const siteN = id => by('sites', id).name, secN = id => by('sections', id).name;
  const rowsOf = lvl => {
    if (lvl === 'animal') { const q = PK.aq.trim().toLowerCase(), list = all.filter(a => !q || animalName(a).toLowerCase().includes(q) || String(a.id).includes(q) || by('enclosures', a.enc).name.toLowerCase().includes(q));
      return pkSearch('pk-aq', PK.aq, 'Search name, number or enclosure', 'PK.aq=this.value;redrawSheet()') + (list.length ? pkList(list.slice(0, 40).map(a => { const t = { sp: s.id, level: 'animal', ref: a.id }, n = dietsSetAt(s.id, 'animal', a.id);
        return pkRow(go1(t), spThumb(s), `${a.name ? esc(a.name) + ' · ' : ''}AAID ${a.id}`, esc([a.sex === 'M' ? 'Male' : a.sex === 'F' ? 'Female' : 'Undetermined', by('enclosures', a.enc).name, ageText(a.ageM), n ? plural(n, 'diet') : ''].filter(Boolean).join(' · ')), undefined, isOn(t)); }).join('')) : '<p class="sg-none">No animal by that name or number</p>'); }
    return pkList(ids(lvl).map(id => { const t = { sp: s.id, level: lvl, ref: id }, p = pathOf(t), path = lvl === 'section' ? siteN(p.site) : lvl === 'enclosure' ? `${siteN(p.site)} › ${secN(p.section)}` : '';
      return pkRow(go1(t), pkIc(PK_SCOPES.find(x => x[0] === lvl)[2]), esc(placeOf(lvl, id).name), esc([path, dietsSetAt(s.id, lvl, id) ? plural(dietsSetAt(s.id, lvl, id), 'diet') : ''].filter(Boolean).join(' · ') || LEVEL[lvl]), undefined, isOn(t)); }).join(''));
  };
  const body = PK_SCOPES.map(([lvl, l, ic]) => {
    if (lvl === 'species') { const t = { sp: s.id, level: 'species', ref: null }; return pkList(pkRow(go1(t), pkIc(ic), l, `Every ${esc(s.name)} · ${dietsWord(dietsSetAt(s.id, 'species'))}`, undefined, isOn(t))); }
    const refs = lvl === 'animal' ? all.map(a => a.id) : ids(lvl), n = refs.reduce((x, id) => x + dietsSetAt(s.id, lvl, id), 0), open = PK.scope === lvl;
    const head = `<button class="az-pickrow pk-r pk-scope${open ? ' pk-scope--open' : ''}" aria-expanded="${open}" onclick="PK.scope=${open ? 'null' : `'${lvl}'`};PK.aq='';redrawSheet()">${pkIc(ic)}<span class="az-pickrow__t"><b>${l}</b><span>${plural(n, 'diet')} · ${plural(refs.length, LEVEL[lvl].toLowerCase())}</span></span>${I(open ? 'expand_less' : 'expand_more', 24)}</button>`;
    return `<div class="pk-scopes">${head}${open ? `<div class="pk-in">${rowsOf(lvl)}</div>` : ''}</div>`;
  }).join('');
  return { title: `<span class="pk-t"><button class="az-iconbtn pk-back" onclick="PK.sp=null;redrawSheet()" aria-label="Back to species">${I('arrow_back')}</button>${esc(s.name)}</span>`, sub: `<i>${esc(s.sci)}</i>`, bottom: true, body };
}

/* a word from a list (a reason), searched when the list is long: { title, items, cur, cb } */
let TPK = { q: '' };
function textPickSheet(o) { TPK = { q: '', ...o }; openSheet(() => { const q = TPK.q.trim().toLowerCase(), list = TPK.items.filter(t => !q || t.toLowerCase().includes(q));
  return { title: TPK.title, bottom: true, body: (TPK.items.length > 8 ? pkSearch('tpk-q', TPK.q, 'Search', 'TPK.q=this.value;redrawSheet()') : '') + (list.length ? pkList(list.map(t => pkRow(`closeAll();${TPK.cb}(${JSON.stringify(t).replace(/"/g, '&quot;')})`, '', esc(t), '', undefined, TPK.cur === t)).join('')) : '<p class="sg-none">Nothing by that name</p>') }; }); }
/* a diet, searched and picked: { title, list: [{ id, d (the diet), sub }], cur, cb, none: [label, sub] for a first "nothing" row } */
let DPK = { q: '' };
function dietPickSheet(o) { DPK = { q: '', ...o }; openSheet(dietPickHtml); pkFocus('dpk-q'); }
function dietPickHtml() {
  const q = DPK.q.trim().toLowerCase(), list = DPK.list.filter(x => !q || x.d.name.toLowerCase().includes(q) || (x.sub || '').toLowerCase().includes(q) || (KINDTYPE[x.d.type] || '').toLowerCase().includes(q));
  const pick = id => `closeAll();${DPK.cb}('${id}')`, av = `<span class="davatar davatar--s">${I('restaurant', 20)}</span>`;
  const none = DPK.none && !q ? pkList(pkRow(pick(''), pkIc('note_add'), DPK.none[0], DPK.none[1], undefined, !DPK.cur)) : '';
  return { title: DPK.title, sub: DPK.sub || '', bottom: true,
    body: pkSearch('dpk-q', DPK.q, 'Search diets', 'DPK.q=this.value;redrawSheet()') + none + (list.length ? pkList(list.map(x => pkRow(pick(x.id), av, esc(x.d.name), esc([KINDTYPE[x.d.type], x.sub].filter(Boolean).join(' · ')), undefined, DPK.cur === x.id)).join('')) : '<p class="sg-none">No diet by that name</p>') };
}
/* where a diet is set for a species, in words */
const dietWhere = (dietId, sp) => { const a = D.assigns.find(x => x.diet === dietId && x.sp === sp && !ended(x)); return a ? `Set for ${whereSet(a)}` : ''; };

/* Suggest A Change: who (the sheet), and which of their diets */
function sgWho() { spPickSheet('sgPickT', SG && SG.t); }
function sgPickT(sp, level, ref) { sgPick(sp, level, ref); }
