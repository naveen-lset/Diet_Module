// js/plan.js — what a diet request does once approved, worked out by Kitchen & Diet's own rules (antz_kitchen_backend › diet-plans):
// a diet is for one species at one place; an animal eats the diet of the narrowest place that has one on the day; at one place a
// group beats male/female, dates beat Year-round, Time-bound beats Seasonal, the newest wins. A request can be for many species and
// places (its targets): one new diet is shared by all of them; an item change by item goes into each diet they eat.

const GROUP_WORD = g => g.kind === 'sex' ? (g.sex === 'F' ? 'Females' : 'Males') : g.kind === 'age' ? `Aged ${g.label}` : g.label;
const targetsOf = r => r.targets && r.targets.length ? r.targets : r.sp ? [{ sp: r.sp, level: r.level || 'species', ref: r.ref ?? null, group: r.group || null }] : [];
const tPlace = t => t.level === 'species' ? (t.group ? `${GROUP_WORD(t.group)} only` : 'Whole species') : targetName(t);
const inT = (an, t) => inScope(an, t) && (!t.group || inGroup(an, t.group));
const tAnimals = t => D.animals.filter(an => inT(an, t));
const samePlace = (a, b) => a.sp === b.sp && a.level === b.level && (a.ref ?? null) === (b.ref ?? null);
/* place b is place a or inside it */
const within = (a, b) => a.sp === b.sp && (a.level === 'species' || (LEVELS.indexOf(b.level) >= LEVELS.indexOf(a.level) && pathOf(b)[a.level] === a.ref));
const sameGroup = (a, b) => JSON.stringify(a || null) === JSON.stringify(b || null);
const whereSet = a => a.level === 'species' ? (a.group ? `${GROUP_WORD(a.group)} of the species` : 'the whole species') : targetName(a);
const HOW = [['always', 'From now on'], ['yearly', 'Every year'], ['once', 'Once']];
const HOW_KIND = { always: 'Year-round', yearly: 'Seasonal', once: 'Time-bound' };
const KTAG = { 'Year-round': 'yr', Seasonal: 'se', 'Time-bound': 'tb' };
const ktag = k => `<span class="ktag ktag--${KTAG[k] || 'yr'}">${esc(k)}</span>`;
const SEASONS = ['Winter', 'Summer', 'Monsoon', 'Dry season'];
const PURPOSES = ['Breeding', 'Gestation', 'Lactation', 'Juvenile', 'Senior', 'Quarantine', 'Recovery', 'Weight management', 'Obesity management', 'Trial diet', 'Transition', ...SEASONS];

/* what they eat on a day: the diets of the animals in these targets, most eaten first */
function eatNow(ts, date = TODAY, skipReq = null) {
  const seen = new Set(), m = new Map(), none = [];
  ts.forEach(t => tAnimals(t).forEach(an => {
    if (seen.has(an.id)) return; seen.add(an.id);
    const w = currentDiet({ sp: an.sp, level: 'animal', ref: an.id }, date, skipReq);
    if (!w) { none.push(an); return; }
    if (!m.has(w.diet.id)) m.set(w.diet.id, { diet: w.diet, animals: [], slots: new Map() });
    const e = m.get(w.diet.id); e.animals.push(an); e.slots.set(w.asg.id, (e.slots.get(w.asg.id) || 0) + 1);
  }));
  return { list: [...m.values()].sort((a, b) => b.animals.length - a.animals.length), none, n: seen.size };
}
/* "Year Round Coypu Diet 15 · Heavyweight Coypu Diet 1" */
function dietsText(animals, date, skipReq) {
  const n = {};
  animals.forEach(an => { const w = currentDiet({ sp: an.sp, level: 'animal', ref: an.id }, date, skipReq), k = w ? w.diet.name : 'No diet'; n[k] = (n[k] || 0) + 1; });
  const xs = Object.entries(n).sort((a, b) => b[1] - a[1]);
  if (xs.length === 1) return xs[0][0];
  return xs.slice(0, 3).map(([k, v]) => `${k} (${v})`).join(' · ') + (xs.length > 3 ? ` · ${xs.length - 3} more` : '');
}
/* where these animals are: the enclosures, else the sections, else how many species */
function whereText(animals) {
  const sps = new Set(animals.map(a => a.sp)); if (sps.size > 1) return plural(sps.size, 'species', 'species');
  const name = (l, id) => placeOf(l, id).name, list = xs => xs.length <= 3 ? xs.join(', ').replace(/, ([^,]*)$/, ' and $1') : '';
  const enc = [...new Set(animals.map(a => a.enc))], secs = [...new Set(animals.map(a => pathOfAnimal(a).section))];
  return list(enc.map(id => name('enclosure', id))) || list(secs.map(id => name('section', id))) || `${plural(secs.length, 'section')} · ${plural(enc.length, 'enclosure')}`;
}
const verb = (n, one, many) => `${plural(n, 'animal')} ${n === 1 ? one : many}`;
const placesText = xs => { const sps = new Set(xs.map(x => x.sp));
  if (sps.size > 1) return plural(sps.size, 'species', 'species');
  const names = xs.map(x => x.level === 'species' ? (x.group ? GROUP_WORD(x.group) : species(x.sp).name) : targetName(x));
  return names.length <= 2 ? names.join(' and ') : `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`; };

/* dates: Seasonal windows are MM-DD and may run over the new year */
const nextMd = md => { const y = +TODAY.slice(0, 4); return `${y}-${md}` >= TODAY ? `${y}-${md}` : `${y + 1}-${md}`; };
const mdIn = (md, s, e) => s <= e ? md >= s && md <= e : md >= s || md <= e;
const mdOverlap = (a, b) => { for (let i = 0; i < 366; i++) { const md = addDays('2024-01-01', i).slice(5); if (mdIn(md, a.start, a.end) && mdIn(md, b.start, b.end)) return true; } return false; };
const startDay = r => r.how === 'once' ? r.start : r.how === 'yearly' ? (mdIn(TODAY.slice(5), r.start, r.end) ? TODAY : nextMd(r.start)) : TODAY;
const howText = r => r.how === 'once' ? `${fmtDay(r.start)} – ${fmtDayY(r.end)}` : r.how === 'yearly' ? `${mdText(r.start)} – ${mdText(r.end)}, every year` : 'From now on';

/* an item change said once, for many diets: add an item, stop it, replace it, or change its amount by a share */
function changesFor(X, rules) {
  const out = [];
  rules.forEach(u => {
    if (u.op === 'add') { if (!entryOf(X, u.feed, u.item)) out.push({ op: 'add', feed: u.feed, to: u.item, qty: u.qty, unit: u.unit, prep: u.prep || '', cut: u.cut || '', days: u.days ?? EVERY_DAY, cad: u.cad || null }); return; }
    X.meals.forEach(m => m.items.filter(l => l.item === u.item).forEach(l => {
      if (u.op === 'stop') out.push({ op: 'remove', feed: m.feed, item: l.item });
      if (u.op === 'replace') out.push({ op: 'change', feed: m.feed, item: l.item, to: u.to, qty: l.qty, unit: l.unit, prep: l.prep, cut: l.cut, days: l.days, cad: l.cad || null });
      if (u.op === 'amount') out.push({ op: 'change', feed: m.feed, item: l.item, to: l.item, qty: round(l.qty * (1 + u.pct / 100)), unit: l.unit, prep: l.prep, cut: l.cut, days: l.days, cad: l.cad || null });
    }));
  });
  return out;
}
const ruleText = u => { const nm = id => item(id).name;
  return u.op === 'add' ? `Add ${nm(u.item)} ${qtyText(u.qty, u.unit)} · ${bandText(feed(u.feed))}` : u.op === 'stop' ? `Stop ${nm(u.item)}`
    : u.op === 'replace' ? `Replace ${nm(u.item)} with ${nm(u.to)}` : `${nm(u.item)} ${u.pct > 0 ? '+' : ''}${u.pct}%`; };

/* try the diets as they would be: add these places, end these ones the day before, then put everything back */
function sim(adds, stops, temps, fn) {
  const was = stops.map(([a]) => [a, a.stop]);
  stops.forEach(([a, s]) => { a.stop = s; }); D.assigns.push(...adds); D.diets.push(...temps);
  try { return fn(); } finally {
    D.assigns.splice(D.assigns.length - adds.length, adds.length); D.diets.splice(D.diets.length - temps.length, temps.length);
    was.forEach(([a, s]) => { if (s === undefined) delete a.stop; else a.stop = s; });
  }
}

/* a new diet's name, as every diet: what it is for, then the diet or the species ("Short-term Coypu Diet", "Coypu 2 Diet") */
function newName(r, X, slots) {
  const sp = species(slots[0].sp), stem = X && X.sp === sp.id ? X.name.replace(/^(Year Round|Short-term|Seasonal) /, '') : `${sp.name} Diet`, g = slots[0].group;
  if (r.kind === 'new' && PURPOSES.includes(r.reason)) return `${r.reason} ${stem}`;
  if (g) return `${g.kind === 'sex' ? g.label : g.kind === 'age' ? 'Young' : 'Heavy'} ${stem}`;
  if (r.how === 'once') return `Short-term ${stem}`;
  if (r.how === 'yearly') return `${SEASONS.includes(r.reason) ? r.reason : 'Seasonal'} ${stem}`;
  if (slots.length === 1 && slots[0].level !== 'species') { const p = targetName(slots[0]), w = sp.name.split(' ').pop().toLowerCase(); return p.toLowerCase().includes(w) ? `${p} Diet` : `${p} ${stem}`; }
  return X ? `New ${stem}` : `Year Round ${stem}`;
}

/* ---------- the plan ---------- */
let PLANMEMO = { k: null, v: null };
const L = (icon, b, small = '', x = {}) => ({ icon, b, small, ...x });
function planOf(r) {
  const k = JSON.stringify([r.id, r.kind, targetsOf(r), r.base, r.slot, r.ends, r.changes, r.rules, r.diet, r.how, r.start, r.end, r.stop, r.date, r.feeds, r.name, r.forAll, r.reason, D.assigns.length, D.history.length, D.diets.length]);
  if (PLANMEMO.k === k) return PLANMEMO.v;
  const v = plan0(r); PLANMEMO = { k, v }; return v;
}
function plan0(r) {
  const ts = targetsOf(r), own = r.id || null, P = { ops: [], get: [], keep: [], lines: [], block: '', shared: null, day: TODAY };
  if (!ts.length) return P;
  const day = P.day = r.kind === 'skip' ? r.date : r.kind === 'end' ? addDays(r.stop || TODAY, 1) : startDay(r) || TODAY;
  const hasDiet = sp => D.assigns.some(a => a.sp === sp && !ended(a) && (!own || a.req !== own));
  const none = ts.find(t => !hasDiet(t.sp));
  /* Kitchen & Diet's base-first rule: a species without a diet starts with a Year-round diet for the whole species */
  if (none && !(['new', 'diet'].includes(r.kind) && r.how === 'always' && ts.every(t => t.level === 'species' && !t.group)))
    P.block = `${species(none.sp).name} has no diet yet. Start with a Year-round diet for the whole species`;
  if (r.kind === 'skip') {
    P.get = ts.flatMap(tAnimals);
    P.lines = [L('no_meals', 'No diet changes', `The kitchen leaves out ${r.feeds === 'all' ? 'every feed' : (r.feeds || []).map(f => bandText(feed(f))).join(', ')} ${onDay(r.date)}`), L('groups', plural(P.get.length, 'animal'), whereText(P.get), { view: 'get' })];
    return P;
  }
  if (r.kind === 'end') {
    const es = (r.ends || []).map(id => by('assigns', id)).filter(Boolean), back = [...new Set(es.flatMap(E => followersOf(E, r.stop || TODAY)))];
    es.forEach(E => P.ops.push({ type: 'end', slot: E.id }));
    P.get = back;
    const after = sim([], es.map(E => [E, r.stop]), [], () => back.length ? dietsText(back, day, own) : '');
    P.lines = es.slice(0, 3).map(E => L('event_busy', `${diet(E.diet).name} ends`, `Last day ${fmtDayY(r.stop)} · set for ${whereSet(E)}`, { tag: slotKind(E) }));
    if (es.length > 3) P.lines.push(L('more_horiz', `${es.length - 3} more diets end`, ''));
    if (back.length) P.lines.push(L('undo', verb(back.length, 'goes back to', 'go back to'), after, { view: 'get' }));
    return P;
  }
  const slotAt = (t, key, group, i) => ({ id: `SIM-${i}-${t.sp}-${t.level}-${t.ref}`, diet: key, sp: t.sp, level: t.level, ref: t.ref ?? null, start: r.how === 'always' ? null : r.start, end: r.how === 'always' ? null : r.end, recur: r.how === 'yearly', group: t.level === 'species' ? group || null : null, req: '__sim' });
  const baseAt = (t, group) => D.assigns.find(a => samePlace(a, t) && !a.start && !a.end && !ended(a) && sameGroup(a.group, t.level === 'species' ? group : null) && (!own || a.req !== own));
  /* Kitchen & Diet's Rule 3 (Seasonal windows at one place don't overlap) and its age and weight groups (they don't overlap) */
  const rules = s => {
    if (s.recur) { const c = D.assigns.find(a => samePlace(a, s) && a.recur && !ended(a) && sameGroup(a.group, s.group) && (!own || a.req !== own) && mdOverlap(a, s)); if (c) return `Dates overlap with ${diet(c.diet).name} (${slotWhen(c)}). Two Seasonal diets at one place can't share dates`; }
    if (s.group && s.group.kind !== 'sex' && !s.start) { const c = D.assigns.find(a => a.sp === s.sp && a.level === 'species' && a.group && a.group.kind === s.group.kind && !a.start && !ended(a) && (!own || a.req !== own) && s.group.min < (a.group.max ?? Infinity) && a.group.min < (s.group.max ?? Infinity)); if (c) return `Overlaps ${diet(c.diet).name} (${c.group.label})`; }
    return '';
  };
  const block = m => { if (m && !P.block) P.block = m; };
  if (r.kind === 'new' || r.kind === 'diet') {
    const key = r.kind === 'new' ? '__new0' : r.diet, op = { type: r.kind === 'new' ? 'new' : 'share', diet: key, from: r.kind === 'new' ? r.base || null : null, changes: r.kind === 'new' ? r.changes || [] : [], slots: [], stops: [] };
    if (key) ts.forEach(t => {
      const s = slotAt(t, key, t.group, 0), old = r.how === 'always' ? baseAt(t, t.group) : null;
      if (old && old.diet === key) return block(`${tPlace(t)} already eat ${diet(key).name}`);
      if (old) op.stops.push(old.id); else block(rules(s));
      op.slots.push(s);
    });
    if (op.slots.length) { if (r.kind === 'new') { op.name = r.name || newName(r, op.from && diet(op.from), op.slots); op.dtype = op.slots[0].group ? op.slots[0].group.kind : { always: 'yearround', yearly: 'seasonal', once: 'timebound' }[r.how]; } P.ops.push(op); }
  }
  if (r.kind === 'items') {
    const pairs = r.base === 'many' ? eatNow(ts, TODAY, own).list.map(e => [e.diet, changesFor(e.diet, r.rules || [])]).filter(([, cs]) => cs.length)
      : r.base && diet(r.base) ? [[diet(r.base), r.changes || []]] : [];
    pairs.forEach(([X, cs], i) => {
      const edit = { type: 'edit', diet: X.id, changes: cs, on: false }, copy = { type: 'new', diet: `__new${i}`, from: X.id, changes: cs, slots: [], stops: [] };
      ts.forEach(t => {
        const e = eatNow([t], TODAY, own).list.find(x => x.diet.id === X.id);
        if (!e) { if (r.base !== 'many') block(`${tPlace(t)} ${t.level === 'species' ? `of ${species(t.sp).name} don't` : "doesn't"} eat ${X.name}`); return; }
        const S = by('assigns', [...e.slots.entries()].sort((a, b) => b[1] - a[1])[0][0]), T = within(S, t) ? t : { sp: S.sp, level: S.level, ref: S.ref ?? null };
        /* "From now on" where the diet is set edits the diet; anything else is a copy with the changes, at that place */
        if (r.how === 'always' && samePlace(T, S)) { edit.on = true; return; }
        if (copy.slots.some(s => samePlace(s, T))) return;
        const s = slotAt(T, copy.diet, S.group, i); block(rules(s)); copy.slots.push(s);
      });
      if (edit.on) P.ops.push(edit);
      if (copy.slots.length) { copy.name = newName(r, X, copy.slots); copy.dtype = copy.slots[0].group ? copy.slots[0].group.kind : { always: 'yearround', yearly: 'seasonal', once: 'timebound' }[r.how]; P.ops.push(copy); }
    });
  }
  if (!P.ops.length) return P;
  /* a diet shared with species outside the request: change it for all of them, or make a copy for these only (as the web asks) */
  const tSp = new Set(ts.map(t => t.sp)), edits = P.ops.filter(o => o.type === 'edit');
  const others = [...new Set(edits.flatMap(o => D.assigns.filter(a => a.diet === o.diet && !ended(a) && !tSp.has(a.sp)).map(a => a.sp)))];
  if (others.length) { P.shared = others.map(species); if (r.forAll === 'only') edits.forEach(o => { o.fork = true; }); }
  /* who gets it: try it on the start day */
  const adds = P.ops.flatMap(o => o.slots || []), stops = P.ops.flatMap(o => (o.stops || []).map(id => [by('assigns', id), addDays(day, -1)]));
  const temps = P.ops.filter(o => o.type === 'new').map(o => ({ id: o.diet, name: o.name, sp: o.slots[0].sp, meals: [] }));
  const edited = new Set(edits.map(o => o.diet)), simIds = new Set(adds.map(s => s.id));
  const inReq = new Map(); ts.forEach(t => tAnimals(t).forEach(an => inReq.set(an.id, an)));
  const pool = new Map(inReq); if (edited.size) D.animals.forEach(an => { if (r.forAll === 'only' && !tSp.has(an.sp)) return; const w = currentDiet({ sp: an.sp, level: 'animal', ref: an.id }, TODAY, own); if (w && edited.has(w.diet.id)) pool.set(an.id, an); });
  const at = (an, d) => currentDiet({ sp: an.sp, level: 'animal', ref: an.id }, d, own);
  const before = new Map([...pool.values()].map(an => [an.id, at(an, day)]));
  const after = sim(adds, stops, temps, () => new Map([...pool.values()].map(an => [an.id, at(an, day)])));
  const gets = an => { const w = after.get(an.id); return !!w && (simIds.has(w.asg.id) || edited.has(w.diet.id)); };
  P.get = [...pool.values()].filter(gets);
  P.keep = [...inReq.values()].filter(an => !gets(an));
  const viaNew = P.get.filter(an => simIds.has(after.get(an.id).asg.id));
  const moved = viaNew.filter(an => { const b = before.get(an.id), o = P.ops.find(x => (x.slots || []).some(s => s.id === after.get(an.id).asg.id)); return b && o && o.from !== b.diet.id && o.diet !== b.diet.id; });
  /* the lines */
  const opLines = P.ops.map(o => {
    if (o.type === 'edit') return L('edit', `${diet(o.diet).name} is changed`, o.fork ? `A copy with ${plural(o.changes.length, 'change')}, for ${placesText(ts)} only` : `${plural(o.changes.length, 'change')} · every animal on it gets them`, { tag: slotKind(D.assigns.find(a => a.diet === o.diet && !ended(a)) || {}) });
    const kind = HOW_KIND[r.how], what = o.type === 'share' ? `They follow ${diet(o.diet).name}` : o.from ? `${diet(o.from).name} with ${plural(o.changes.length, 'change')}` : plural(o.changes.length, 'item');
    return L(o.type === 'share' ? 'swap_horiz' : 'add', o.type === 'share' ? `Move to ${diet(o.diet).name}` : `New diet: ${o.name}`, o.type === 'share' ? `Set for ${o.slots.length > 1 ? placesText(o.slots) : whereSet(o.slots[0])}` : `${what} · for ${placesText(o.slots)}`, { tag: kind,
      x: o.stops.length ? `Replaces ${[...new Set(o.stops.map(id => diet(by('assigns', id).diet).name))].join(', ')}` : '' });
  });
  const names = P.ops.map(o => o.type === 'edit' ? diet(o.diet).name : o.name || diet(o.diet).name);
  P.lines = opLines.length > 3 ? [L('edit_note', `${plural(opLines.length, 'diet')} change`, `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`, { view: 'ops' })] : opLines;
  P.lines.push(L('groups', verb(P.get.length, 'gets it', 'get it'), whereText(P.get), { view: 'get' }));
  if (moved.length) P.lines.push(L('move_down', verb(moved.length, 'moves from another diet', 'move from another diet'), dietsText(moved, day, own), { view: 'moved' }));
  if (P.keep.length) P.lines.push(L('do_not_disturb_on', verb(P.keep.length, 'keeps its own diet', 'keep their own diet'), sim(adds, stops, temps, () => dietsText(P.keep, day, own)), { view: 'keep' }));
  P.moved = moved;
  /* afterwards: a Time-bound diet ends and they go back; a Seasonal one comes back; a copy no longer follows the diet it came from */
  if (r.how === 'once' && viaNew.length) P.lines.push(L('undo', `From ${fmtDay(addDays(r.end, 1))}`, `Back to ${sim(adds, stops, temps, () => dietsText(viaNew, addDays(r.end, 1), own))}`));
  if (r.how === 'yearly' && viaNew.length) P.lines.push(L('event_repeat', `Every year, ${mdText(r.start)} – ${mdText(r.end)}`, `The rest of the year: ${dietsText(viaNew, day < nextMd(r.start) ? TODAY : addDays(nextMd(r.end), 1), own)}`));
  if (r.how === 'always' && r.kind === 'items' && P.ops.some(o => o.type === 'new')) P.lines.push(L('link_off', 'A diet of their own', 'Later changes to the diet it came from don\'t reach them'));
  if (!P.get.length) block('No animal here would eat it: each one has a diet set closer to it');
  return P;
}

/* the animals a request is for: who gets it (an approved request keeps the list it had) */
function animalsIn(t) {
  if (t.kind === 'skip') return targetsOf(t).flatMap(tAnimals);
  if (t.state === 'approved' && t.outcome) return t.outcome.get.map(id => by('animals', id)).filter(Boolean);
  return planOf(t).get;
}

/* ---------- approving does what the plan says, and writes the history ---------- */
function applyChanges(meals, cs) {
  const out = meals.map(m => ({ feed: m.feed, items: m.items.map(i => ({ ...i })) }));
  cs.forEach(c => {
    let m = out.find(x => x.feed === c.feed); if (!m) { m = { feed: c.feed, items: [] }; out.push(m); out.sort((a, b) => a.feed - b.feed); }
    const line = { item: c.to, qty: c.qty, unit: c.unit, prep: c.prep || '', cut: c.cut || '', days: c.days ?? EVERY_DAY, cad: c.cad || null };
    if (c.op === 'add') m.items.push(line);
    else if (c.op === 'remove') m.items = m.items.filter(i => i.item !== c.item);
    else m.items = m.items.map(i => i.item === c.item ? line : i);
  });
  return out.filter(m => m.items.length);
}
const histLines = (X, cs) => cs.map(c => ({ op: c.op, feed: c.feed, was: c.op === 'add' || !X ? null : { ...entryOf(X, c.feed, c.item) }, now: c.op === 'remove' ? null : { item: c.to, qty: c.qty, unit: c.unit, prep: c.prep || '', cut: c.cut || '', days: c.days ?? EVERY_DAY, cad: c.cad || null } }));
function applyApproval(r, at) {
  const p = planOf(r), on = at.slice(0, 10), H = { at, by: r.by, approvedBy: r.approver, reason: r.reason, remarks: r.text, req: r.id }, tSp = new Set(targetsOf(r).map(t => t.sp)), pre = !!r.applied;
  r.outcome = { lines: p.lines.map(l => ({ ...l, view: '' })), get: p.get.map(a => a.id) };
  const signs = { cert: { by: r.by, at: on }, kcert: { by: r.approver, at: on } };
  p.ops.forEach(o => {
    if (o.type === 'edit') {
      let X = diet(o.diet); const lines = histLines(X, o.changes);
      if (o.fork) { const c = { ...X, id: 'D-' + (++D.dseq), shared: [], meals: X.meals }; D.diets.push(c); D.assigns.filter(a => a.diet === X.id && !ended(a) && tSp.has(a.sp)).forEach(a => { a.diet = c.id; }); X = c; }
      Object.assign(X, { meals: applyChanges(X.meals, o.changes) }, signs);
      const a0 = D.assigns.find(a => a.diet === X.id && !ended(a)) || {};
      addHistory({ ...H, type: 'edited', diet: X.id, sp: a0.sp, level: a0.level, ref: a0.ref ?? null, lines });
    }
    if (o.type === 'new' || o.type === 'share') {
      let id = o.diet;
      if (o.type === 'new') { const B = o.from ? diet(o.from) : null; id = 'D-' + (++D.dseq);
        D.diets.push({ id, name: o.name, sp: o.slots[0].sp, type: o.dtype, made: { by: r.by, at: on }, ...signs, note: r.note || '', site: '', remark: '', reason: r.reason, remarks: r.text, shared: [], meals: applyChanges(B ? B.meals : [], o.changes) }); }
      o.stops.forEach(sid => { const a = by('assigns', sid); a.stop = addDays(p.day, -1); addHistory({ ...H, type: 'lifecycle', diet: a.diet, sp: a.sp, level: a.level, ref: a.ref, ended: `Replaced by ${diet(id).name}` }); });
      o.slots.forEach(s => {
        if (!pre) D.assigns.push({ ...s, id: 'AS-' + (D.assigns.length + 1), diet: id, req: r.id });
        addHistory({ ...H, type: 'created', diet: id, sp: s.sp, level: s.level, ref: s.ref, ...(o.type === 'share' ? { follows: id } : { created: 1, lines: histLines(o.from && diet(o.from), o.changes) }), from: o.from || null });
      });
    }
    if (o.type === 'end') { const a = by('assigns', o.slot); a.stop = r.stop; addHistory({ ...H, type: 'lifecycle', diet: a.diet, sp: a.sp, level: a.level, ref: a.ref, ended: `Ends early · last day ${fmtDay(r.stop)}` }); }
  });
  if (r.kind === 'skip') targetsOf(r).forEach(t => addHistory({ ...H, type: 'lifecycle', sp: t.sp, level: t.level, ref: t.ref, diet: (currentDiet(t) || { diet: {} }).diet.id || null, skip: { date: r.date, feeds: r.feeds } }));
  r.applied = true;
}
