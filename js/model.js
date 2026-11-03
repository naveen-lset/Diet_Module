// js/model.js — the diet and request logic. No DOM.
// Diets as Kitchen & Diet: a diet is set at a level (species, site, section, enclosure, animal); an animal follows the most specific one in force.
// Requests: a Dietician raises, the Kitchen Head approves, delays or rejects. Approving changes the diets and writes the history.

const pad2 = n => String(n).padStart(2, '0');
const localIso = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const TODAY = localIso(new Date());
let D = null;
function useData(d) { D = d; ITEM_ID = Object.fromEntries(D.items.map(i => [i.name, i.id])); }
const by = (k, id) => D[k].find(x => x.id === id);
const user = id => by('users', id);
const item = id => by('items', id);
const diet = id => by('diets', id);
const feed = id => by('feeds', id);
const species = id => by('species', id);

/* ---------- dates ---------- */
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return localIso(d); };
const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5);
const fmtDay = s => s ? `${+s.slice(8, 10)} ${MON[+s.slice(5, 7) - 1]}` : '';
const fmtDayY = s => s ? `${fmtDay(s)} ${s.slice(0, 4)}` : '';
const wday = s => WDAY[new Date(s + 'T00:00:00').getDay()];
const fmtTime = s => { if (!s || s.length < 16) return ''; let h = +s.slice(11, 13); const m = s.slice(14, 16), ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${m} ${ap}`; };
const fmtAt = s => `${fmtDay(s.slice(0, 10))}, ${fmtTime(s)}`;
const nowStamp = () => { const d = new Date(); return `${TODAY}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const relDay = s => { const n = daysBetween(TODAY, s); return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n === -1 ? 'Yesterday' : `${wday(s)} ${fmtDay(s)}`; };
const plural = (n, w, p = w + 's') => `${n} ${n === 1 ? w : p}`;
/* the Monday of a date's week, and the week n weeks from this one */
const mondayOf = s => addDays(s, -((new Date(s + 'T00:00:00').getDay() + 6) % 7));
const weekDays = off => { const m = addDays(mondayOf(TODAY), off * 7); return [0, 1, 2, 3, 4, 5, 6].map(i => addDays(m, i)); };

/* ---------- places ---------- */
const LEVELS = ['species', 'site', 'section', 'enclosure', 'animal'];
const LEVEL = { species: 'Species', site: 'Site', section: 'Section', enclosure: 'Enclosure', animal: 'Animal' };
const animalName = a => a.name || `#${a.id}`;
function pathOfAnimal(a) { const e = by('enclosures', a.enc), s = by('sections', e.section); return { site: s.site, section: s.id, enclosure: e.id, animal: a.id }; }
function pathOf(t) {
  if (t.level === 'animal') return pathOfAnimal(by('animals', t.ref));
  if (t.level === 'enclosure') { const e = by('enclosures', t.ref), s = by('sections', e.section); return { site: s.site, section: s.id, enclosure: e.id }; }
  if (t.level === 'section') return { site: by('sections', t.ref).site, section: t.ref };
  if (t.level === 'site') return { site: t.ref };
  return {};
}
const COLL = { site: 'sites', section: 'sections', enclosure: 'enclosures', animal: 'animals' };
const placeOf = (level, ref) => by(COLL[level], ref);
const inScope = (a, t) => a.sp === t.sp && (t.level === 'species' || pathOfAnimal(a)[t.level] === t.ref);
function targetName(t) {
  if (t.level === 'species') return species(t.sp).name;
  if (t.level === 'animal') return animalName(by('animals', t.ref));
  return placeOf(t.level, t.ref).name;
}
/* the places above the target, broad to specific: "Cow Land › Coypu Land" */
function targetPath(t) {
  const p = pathOf(t), out = [];
  if (p.site && t.level !== 'site') out.push(by('sites', p.site).name);
  if (p.section && t.level !== 'section') out.push(by('sections', p.section).name);
  if (p.enclosure && t.level !== 'enclosure') out.push(by('enclosures', p.enclosure).name);
  return out.join(' › ');
}
/* Kitchen & Diet's scope words: Species-wide, Section-wide · Coypu Marsh */
const scopeText = t => t.level === 'species' ? 'Species-wide' : `${LEVEL[t.level]}-wide · ${targetName(t)}`;
const placeText = t => t.level === 'species' ? 'Whole species' : `${LEVEL[t.level]}: ${targetName(t)}`;
const atSite = (t, site) => site === 'all' || t.level === 'species' || pathOf(t).site === site;
const spAnimals = (sp, site = 'all') => D.animals.filter(a => a.sp === sp && (site === 'all' || pathOfAnimal(a).site === site));
/* the options one level down, inside what is already chosen (the cascading picker) */
function placesUnder(sp, level, within, pool = null) {
  const as = (pool || D.animals.filter(a => a.sp === sp)).filter(a => Object.entries(within).every(([k, v]) => !v || pathOfAnimal(a)[k] === v));
  if (level === 'animal') return as.map(a => ({ id: a.id, name: animalName(a), n: 1, sub: a.name ? `#${a.id}` : '', sex: a.sex }));
  const ids = [...new Set(as.map(a => pathOfAnimal(a)[level]))];
  return ids.map(id => ({ id, name: placeOf(level, id).name, n: as.filter(a => pathOfAnimal(a)[level] === id).length })).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

/* ---------- the diet in force ---------- */
/* a Seasonal diet's dates are MM-DD and come back every year (a window may run over the new year) */
function inForce(a, date) {
  if (a.stop && date > a.stop) return false;
  if (!a.recur) return (!a.start || a.start <= date) && (!a.end || a.end >= date);
  const md = date.slice(5);
  return a.start <= a.end ? md >= a.start && md <= a.end : md >= a.start || md <= a.end;
}
/* Kitchen & Diet precedence: the most specific level, then a dated diet over the base, a one-off over a seasonal, the newest last.
   skipReq leaves out what one request added, to see the animals as they were before it. */
/* an Age or Weight diet (species scope only) feeds the animals in its range */
const inGroup = (an, g) => g.kind === 'sex' ? an.sex === g.sex : g.kind === 'age' ? an.ageM >= g.min && (g.max == null || an.ageM < g.max) : an.wt != null && an.wt >= g.min && (g.max == null || an.wt < g.max);
function currentDiet(t, date = TODAY, skipReq = null) {
  const p = { species: true, ...pathOf(t) }, order = LEVELS.slice(0, LEVELS.indexOf(t.level) + 1).reverse(), an = t.level === 'animal' ? by('animals', t.ref) : null;
  for (const lvl of order) {
    const ref = lvl === 'species' ? null : p[lvl];
    if (lvl !== 'species' && !ref) continue;
    /* Kitchen & Diet: within a level an age or weight group wins (weight 4), then dates (1); a one-off beats a seasonal */
    const rank = x => (x.group ? (x.group.kind === 'sex' ? 4 : 8) : 0) + (x.start || x.end ? 2 : 0) + (x.recur ? 0 : 1);
    const a = D.assigns.filter(x => x.sp === t.sp && x.level === lvl && x.ref === ref && (!skipReq || x.req !== skipReq) && inForce(x, date) && (!x.group || (an && inGroup(an, x.group))))
      .sort((x, y) => rank(y) - rank(x) || D.assigns.indexOf(y) - D.assigns.indexOf(x))[0];
    if (a) return { diet: diet(a.diet), level: lvl, asg: a };
  }
  return null;
}

/* ---------- a species' diets, each set at one level ---------- */
/* a diet ends on its own date, or early (stop: its last day, from an approved request) */
const ended = a => (!!a.stop && a.stop < TODAY) || (!a.recur && !!a.end && a.end < TODAY);
const lastDay = a => a.stop && (!a.end || a.recur || a.stop < a.end) ? a.stop : a.end;
const LVL_RANK = a => LEVELS.indexOf(a.level);
const kindRank = a => a.group ? 3 : !a.start && !a.end ? 0 : a.recur ? 1 : 2;
const slotsOf = sp => D.assigns.filter(a => a.sp === sp && !ended(a)).sort((x, y) => LVL_RANK(x) - LVL_RANK(y) || kindRank(x) - kindRank(y));
const endedOf = sp => D.assigns.filter(a => a.sp === sp && ended(a)).sort((x, y) => (lastDay(y) > lastDay(x) ? 1 : -1));
/* the kinds as Kitchen & Diet names them: Year-round (the base), Seasonal, Time-bound, Age, Weight */
const slotKind = a => a.group ? (a.group.kind === 'age' ? 'Age' : a.group.kind === 'sex' ? 'Sex-based' : 'Weight') : !a.start && !a.end ? 'Year-round' : a.recur ? 'Seasonal' : 'Time-bound';
const KINDS = ['Year-round', 'Seasonal', 'Time-bound', 'Age', 'Weight'];
const mdText = md => `${+md.slice(3)} ${MON[+md.slice(0, 2) - 1]}`;
function slotWhen(a) {
  if (a.stop) return `${a.stop < TODAY ? 'Ended' : 'Ends'} ${fmtDayY(a.stop)}`;
  if (!a.start && !a.end) return '';
  if (a.recur) return `${mdText(a.start)} – ${mdText(a.end)}, every year`;
  if (ended(a)) return `Ended ${fmtDayY(a.end)}`;
  return a.end ? `${fmtDay(a.start)} – ${fmtDayY(a.end)}` : `From ${fmtDayY(a.start)}`;
}
const slotText = a => [slotKind(a), a.group ? a.group.label : '', slotWhen(a)].filter(Boolean).join(' · ');
/* the day a diet is (next) fed: today if it is in force, else the next day it starts */
function slotDay(a) {
  if (inForce(a, TODAY) || !a.start) return TODAY;
  if (!a.recur) return a.start;
  const y = +TODAY.slice(0, 4), d = `${y}-${a.start}`;
  return d > TODAY ? d : `${y + 1}-${a.start}`;
}
const follows = (an, a, date = slotDay(a), skipReq = null) => { const w = currentDiet({ sp: an.sp, level: 'animal', ref: an.id }, date, skipReq); return !!w && w.asg.id === a.id; };
const followersOf = (a, date) => D.animals.filter(an => inScope(an, a) && follows(an, a, date || (ended(a) ? lastDay(a) : slotDay(a))));
/* fed today: the diet in force here, and some animal is on it today */
const isNow = a => inForce(a, TODAY) && followersOf(a, TODAY).length > 0;
/* the diet a request changes: the one it names, or the one its animals were on */
function slotFor(t) {
  if (t.slot) return by('assigns', t.slot);
  if (!t.base || !t.sp) return null;
  const p = { species: true, ...pathOf(t) };
  return D.assigns.filter(a => a.sp === t.sp && a.diet === t.base && (a.level === 'species' || p[a.level] === a.ref))
    .sort((x, y) => LEVELS.indexOf(y.level) - LEVELS.indexOf(x.level))[0] || null;
}
/* the levels a species shows: Site only when it lives at more than one site or has a site diet (live) */
function levelsOf(sp) {
  const sites = new Set(D.animals.filter(a => a.sp === sp).map(a => pathOfAnimal(a).site));
  return LEVELS.filter(l => l !== 'site' || sites.size > 1 || D.assigns.some(a => a.sp === sp && a.level === 'site'));
}
const dietsAt = (sp, level, ref) => slotsOf(sp).filter(a => a.level === level && (level === 'species' || a.ref === ref));
/* the places of one level where the species lives (and any place with a diet), with their diets */
function placesAt(sp, level, site = 'all') {
  const as = spAnimals(sp, site);
  if (level === 'animal') {
    const own = new Set(slotsOf(sp).filter(a => a.level === 'animal').map(a => a.ref));
    return as.map(a => ({ id: a.id, level, animal: a, n: 1, diets: dietsAt(sp, 'animal', a.id) }))
      .sort((x, y) => (own.has(y.id) ? 1 : 0) - (own.has(x.id) ? 1 : 0) || (x.animal.name ? 0 : 1) - (y.animal.name ? 0 : 1) || animalName(x.animal).localeCompare(animalName(y.animal), undefined, { numeric: true }));
  }
  const ids = [...new Set(as.map(a => pathOfAnimal(a)[level]))];
  slotsOf(sp).filter(a => a.level === level && !ids.includes(a.ref) && atSite(a, site)).forEach(a => ids.push(a.ref));
  return ids.map(id => {
    const here = as.filter(a => pathOfAnimal(a)[level] === id), t = { sp, level, ref: id };
    return { id, level, name: placeOf(level, id).name, path: targetPath(t), n: here.length, encl: new Set(here.map(a => a.enc)).size, diets: dietsAt(sp, level, id) };
  }).sort((x, y) => (y.diets.length ? 1 : 0) - (x.diets.length ? 1 : 0) || x.name.localeCompare(y.name, undefined, { numeric: true }));
}
/* how many diets are set at a level (shown on its chip) */
const dietCount = (sp, level, site = 'all') => slotsOf(sp).filter(a => a.level === level && atSite(a, site)).length;
/* the other species fed this same diet */
const sharedWith = (dietId, sp) => [...new Set(D.assigns.filter(a => a.diet === dietId && a.sp !== sp && !ended(a)).map(a => a.sp))].map(species);
const dietItems = d => d.meals.reduce((n, m) => n + m.items.length, 0);
const KINDTYPE = { yearround: 'Year-round', seasonal: 'Seasonal', timebound: 'Time-bound', age: 'Age', weight: 'Weight', sex: 'Sex-based' };

/* ---------- quantities: per animal per feed in g / ml / pcs; stock in the item's stock unit ---------- */
const BASE = { g: ['g', 1], kg: ['g', 1000], ml: ['ml', 1], ltr: ['ml', 1000], pcs: ['pcs', 1] };
const toBase = (q, u) => q * BASE[u][1];
const unitsFor = it => BASE[it.unit][0] === 'g' ? ['g', 'kg'] : BASE[it.unit][0] === 'ml' ? ['ml', 'ltr'] : ['pcs'];
const round = v => Math.round(v * 100) / 100;
function qtyText(q, u) {
  const [b] = BASE[u], v = toBase(q, u);
  if (b === 'pcs') return `${round(v)} ${v === 1 ? 'pc' : 'pcs'}`;
  if (v >= 1000) return `${round(v / 1000).toLocaleString('en-IN')} ${b === 'g' ? 'kg' : 'ltr'}`;
  return `${round(v).toLocaleString('en-IN')} ${b}`;
}
const stockText = it => qtyText(it.stock, it.stockUnit);
const entryOf = (d, feedId, itemId) => { const m = d && d.meals.find(x => x.feed === feedId); return m && m.items.find(i => i.item === itemId); };
/* grams of a line as fed (ml as g, pieces by their weight) */
const gramsOf = l => { const [b] = BASE[l.unit], v = toBase(l.qty, l.unit), it = item(l.item); return b === 'pcs' ? v * (it.pieceG || 0) : v; };

/* ---------- feeding days, as the Kitchen day mask: bit 0 Mon … bit 6 Sun ---------- */
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const EVERY_DAY = 127;
const daysText = (m = EVERY_DAY) => m === EVERY_DAY ? 'Daily' : m === 31 ? 'Mon – Fri' : m === 96 ? 'Sat, Sun' : DAYS.filter((_, i) => m & (1 << i)).join(', ');
const dayCount = m => DAYS.filter((_, i) => m & (1 << i)).length;
/* feeding less often than weekly (Kitchen & Diet cadence): every N days from a first feed, or one day a month */
const lastOfMonth = s => { const d = new Date(s + 'T00:00:00'); return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() === d.getDate(); };
const cadText = c => c.every ? `Every ${c.every} days` : c.monthly === 'last' ? 'Monthly · last day' : `Monthly · day ${c.monthly}`;
const fedOnDate = (l, s) => !l.cad ? !!((l.days ?? EVERY_DAY) & (1 << ((new Date(s + 'T00:00:00').getDay() + 6) % 7)))
  : l.cad.every ? s >= l.cad.from && daysBetween(l.cad.from, s) % l.cad.every === 0 : l.cad.monthly === 'last' ? lastOfMonth(s) : +s.slice(8) === l.cad.monthly;
const nextFeeds = (l, n = 3) => { const out = []; for (let i = 0; i < 400 && out.length < n; i++) { const s = addDays(TODAY, i); if (fedOnDate(l, s)) out.push(s); } return out; };
const lineDays = l => l.cad ? cadText(l.cad) : daysText(l.days);
/* the coming date of a weekday (0 Mon … 6 Sun): today, or the next one */
const nextWeekday = i => [0, 1, 2, 3, 4, 5, 6].map(k => addDays(TODAY, k)).find(s => (new Date(s + 'T00:00:00').getDay() + 6) % 7 === i);
/* fed on a weekday; a line fed less often than weekly, on the coming date of that weekday (so it agrees with its next feeds) */
const fedOn = (l, i) => i == null || (l.cad ? fedOnDate(l, nextWeekday(i)) : !!((l.days ?? EVERY_DAY) & (1 << i)));
const shareOf = l => l.cad ? (l.cad.every ? 1 / l.cad.every : 12 / 365) : dayCount(l.days ?? EVERY_DAY) / 7;

/* ---------- nutrition: per animal per day, across every line; a day (0 Mon … 6 Sun) or the week's average ---------- */
function nutrition(d, day = null) {
  const tot = NUTRIENTS.map(() => 0); let mass = 0, moist = 0;
  d.meals.forEach(m => m.items.forEach(l => {
    const it = item(l.item); if (!it.nutri) return;
    const share = day == null ? shareOf(l) : fedOn(l, day) ? 1 : 0, g = gramsOf(l) * share;
    it.nutri.forEach((v, i) => { if (i !== 5) tot[i] += v * g / 100; });
    mass += g; moist += g * it.nutri[5];
  }));
  tot[5] = mass ? moist / mass : 0;
  return NUTRIENTS.map(([name, unit, group], i) => ({ name, unit, group, v: tot[i] }));
}
const nutriText = n => { const v = n.v; if (!v) return `0 ${n.unit}`; const r = n.unit === 'g' || (n.unit === 'mg' && v < 10) ? Math.round(v * 10) / 10 : Math.round(v); return `${r.toLocaleString('en-IN')} ${n.unit}`; };

/* ---------- requests ---------- */
const KIND = { items: ['Item change', 'swap_horiz'], new: ['New diet', 'add_circle'], diet: ['Diet change', 'restaurant'], end: ['End a diet', 'event_busy'], skip: ['No feed on a day', 'block'] };
/* what a changed line does differently from the diet's line: item, amount, days, prep, cut */
function lineDiff(was, c) {
  return { item: c.to !== was.item, amount: toBase(c.qty, c.unit) !== toBase(was.qty, was.unit), days: (c.days ?? EVERY_DAY) !== (was.days ?? EVERY_DAY) || JSON.stringify(c.cad || null) !== JSON.stringify(was.cad || null), prep: (c.prep || '') !== (was.prep || ''), cut: (c.cut || '') !== (was.cut || '') };
}
function changeText(c, base) {
  if (c.op === 'remove') return `Stop ${item(c.item).name}`;
  if (c.op === 'add') return `Add ${item(c.to).name}`;
  const was = entryOf(base, c.feed, c.item), x = lineDiff(was, c), nm = item(c.item).name;
  if (x.item) return `Replace ${nm} with ${item(c.to).name}`;
  if (x.amount) return `${nm} to ${qtyText(c.qty, c.unit)}`;
  if (x.days) return `${nm} ${c.cad ? cadText(c.cad).toLowerCase() : 'on ' + daysText(c.days)}`;
  return `${nm}: ${[c.prep, c.cut].filter(Boolean).join(', ').toLowerCase() || 'as it comes'}`;
}
const dayText = s => { const n = daysBetween(TODAY, s); return n === 0 ? 'today' : n === 1 ? 'tomorrow' : `${wday(s)} ${fmtDay(s)}`; };
const onDay = s => { const t = dayText(s); return t === 'today' || t === 'tomorrow' ? t : 'on ' + t; };
function autoTitle(r) {
  if (r.kind === 'skip') {
    const when = r.date === TODAY ? 'today' : `on ${relDay(r.date).replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) /, '')}`;
    return r.feeds === 'all' ? `No diet ${when}` : `Skip the ${r.feeds.map(f => feed(f).from).join(' and ')} feed ${when}`;
  }
  const ts = targetsOf(r), for1 = ts.length === 1 ? (ts[0].level === 'species' ? (ts[0].group ? ` for ${GROUP_WORD(ts[0].group).toLowerCase()}` : '') : ` for ${targetName(ts[0])}`) : ` for ${placesText(ts)}`;
  if (r.kind === 'diet') return r.diet ? `Move to ${diet(r.diet).name}${for1}` : 'Diet change';
  if (r.kind === 'new') { const o = planOf(r).ops.find(x => x.type === 'new'); return o ? `${o.name}${for1}` : 'New diet'; }
  if (r.kind === 'end') { const es = (r.ends || []).map(id => by('assigns', id)).filter(Boolean); return es.length ? `End ${es.length === 1 ? diet(es[0].diet).name : plural(es.length, 'diet')} ${onDay(addDays(r.stop, 1)).replace(/^on /, 'on ')}` : 'End a diet'; }
  if (r.base === 'many') { const us = r.rules || []; return us.length ? us.slice(0, 2).map(ruleText).join(' · ') + (us.length > 2 ? ` + ${us.length - 2} more` : '') + for1 : 'Item change'; }
  const cs = r.changes || [];
  if (!cs.length) return 'Item change';
  const base = diet(r.base);
  if (cs.length <= 2) return cs.map(c => changeText(c, base)).join(' · ');
  return `${changeText(cs[0], base)} + ${cs.length - 1} more changes`;
}
function phaseOf(r) {
  if (r.kind === 'skip') return r.date > TODAY ? 'next' : r.date === TODAY ? 'live' : 'past';
  if (r.kind === 'end') return r.stop < TODAY ? 'past' : 'next';
  if (r.how === 'always' || r.how === 'yearly') return 'live';
  return r.start > TODAY ? 'next' : r.end && r.end < TODAY ? 'past' : 'live';
}
function approvedWhen(r) {
  const p = phaseOf(r);
  if (r.kind === 'skip') return p === 'past' ? `done ${fmtDay(r.date)}` : `no diet ${onDay(r.date)}`;
  if (r.kind === 'end') return p === 'past' ? `ended ${fmtDay(r.stop)}` : `last day ${fmtDay(r.stop)}`;
  if (r.how === 'yearly') return `every year, ${mdText(r.start)} – ${mdText(r.end)}`;
  if (r.how === 'always') return 'in force';
  return p === 'next' ? `starts ${dayText(r.start)}` : p === 'past' ? `ended ${fmtDay(r.end)}` : r.end ? `running till ${fmtDay(r.end)}` : 'running';
}
/* the status in the Help Desk's words, and its tone */
function stateOf(r) {
  switch (r.state) {
    case 'pending': return { label: 'Awaiting approval', tone: 'awaiting', icon: 'pace' };
    case 'delayed': return { label: `Delayed till ${fmtDay(r.delay.until)}`, tone: 'awaiting', icon: 'timer' };
    case 'approved': return { label: 'Approved', tone: 'positive', icon: 'check_circle' };
    case 'rejected': return { label: 'Rejected', tone: 'negative', icon: 'cancel' };
    case 'cancelled': return { label: 'Canceled', tone: 'neutral', icon: 'do_not_disturb_on' };
    case 'deleted': return { label: 'Deleted', tone: 'neutral', icon: 'delete' };
  }
}
/* Help Desk tabs: Pending Approval holds the delayed ones too */
const HDTABS = [['pending', 'Pending Approval'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['cancelled', 'Canceled'], ['deleted', 'Deleted'], ['all', 'All']];
const tabOf = r => r.state === 'delayed' ? 'pending' : r.state;
/* the Antz priority flags */
const PRIO = { normal: ['!', 'Normal'], high: ['!!!', 'High'], emergency: ['local_fire_department', 'Emergency'] };
const PRIO_RANK = { emergency: 0, high: 1, normal: 2 };
const PRI_TEXT = { normal: 'Routine, within a few days.', high: 'Needed today or tomorrow.', emergency: 'Clinical or urgent. Needs action now.' };
const dept = id => DEPTS.find(x => x.id === id);
const isDiet = r => r.dept === 'diet';
const lastAt = r => r.events[r.events.length - 1].at;

/* ---------- who sees what, who can do what (Kitchen & Diet roles; Help Desk: you see what you raised and what waits on you) ---------- */
const isApprover = u => u.role === 'head';
const canRaise = u => u.role === 'dietician';
const visibleTo = (r, u) => r.by === u.id || r.approver === u.id;
const isOpen = r => ['pending', 'delayed'].includes(r.state);
function actionsFor(r, u) {
  const a = [];
  if (r.by === u.id && isOpen(r)) a.push('cancel', 'edit');
  if (r.approver === u.id && isOpen(r)) a.push('reject', 'delay', 'approve');
  return a;
}
const openFor = t => D.requests.filter(r => isDiet(r) && isOpen(r) && targetsOf(r).some(x => samePlace(x, t)));
const openOnSlot = a => D.requests.filter(r => isDiet(r) && isOpen(r) && ((r.kind === 'items' && r.slot === a.id) || (r.kind === 'end' && (r.ends || []).includes(a.id)) || (r.kind === 'items' && r.base === a.diet && targetsOf(r).some(t => samePlace(t, a)))));

/* stock: what the kitchen must find each day for a request, item by item */
function stockCheck(r) {
  const n = animalsIn(r).length, need = {};
  const put = (id, q, u, tag) => { const x = need[id] || (need[id] = { item: item(id), base: 0, tag }); x.base += toBase(q, u) * n; };
  if (r.kind === 'new') {
    const o = planOf(r).ops.find(x => x.type === 'new'), have = new Set(eatNow(targetsOf(r), TODAY, r.id || null).list.flatMap(e => e.diet.meals.flatMap(m => m.items.map(i => i.item))));
    if (o) applyChanges(o.from ? diet(o.from).meals : [], o.changes).forEach(m => m.items.forEach(i => { if (!have.has(i.item)) put(i.item, i.qty, i.unit, 'New'); }));
  }
  if (r.kind === 'items' && r.base !== 'many' && diet(r.base)) {
    const base = diet(r.base);
    r.changes.forEach(c => {
      if (c.op === 'add') put(c.to, c.qty, c.unit, 'Added');
      if (c.op === 'change' && c.to !== c.item) put(c.to, c.qty, c.unit, 'Replaces ' + item(c.item).name);
      if (c.op === 'change' && c.to === c.item) { const was = entryOf(base, c.feed, c.item); const extra = toBase(c.qty, c.unit) - toBase(was.qty, was.unit); if (extra > 0) put(c.item, extra, BASE[c.unit][0], 'More'); }
    });
  }
  if (r.kind === 'diet') {
    const was = new Set(diet(r.base) ? diet(r.base).meals.flatMap(m => m.items.map(i => i.item)) : []);
    diet(r.diet).meals.forEach(m => m.items.forEach(i => put(i.item, i.qty, i.unit, was.has(i.item) ? 'In both' : 'New')));
  }
  return Object.values(need).map(x => {
    const have = toBase(x.item.stock, x.item.stockUnit), status = have <= 0 ? 'out' : have < x.base ? 'short' : 'ok';
    return { ...x, need: qtyText(x.base, BASE[x.item.unit][0]), have, status };
  }).sort((a, b) => ({ out: 0, short: 1, ok: 2 }[a.status] - { out: 0, short: 1, ok: 2 }[b.status]));
}
const shortOf = r => (!isDiet(r) || ['skip', 'end'].includes(r.kind) ? [] : stockCheck(r)).filter(x => x.status !== 'ok');
function stockFor(it, q, u, n) { const need = q && u ? toBase(q, u) * n : 0, have = toBase(it.stock, it.stockUnit); return have <= 0 ? 'out' : need && have < need ? 'short' : 'ok'; }

const DELAY_REASONS = ['Ingredient not in stock', 'Supplier delay', 'Kitchen staff unavailable', 'Preparation time needed', 'Equipment not ready'];
const REASONS = {
  /* Kitchen & Diet's change reasons (CHANGE_REASONS in the backend), in sentence case */
  items: ['Breeding', 'Enrichment', 'Health', 'Post-operative', 'Quarantine', 'Seasonal change', 'Test diet', 'Transition', 'Trial', 'Weight management', 'Winter', 'Summer', 'Monsoon', 'Medical', 'Behavioral', 'Recovery', 'Chronic illness', 'Post-op recovery', 'Medication delivery', 'Juvenile', 'Senior', 'Gestation', 'Lactation', 'Herd trending heavy', 'Underweight animal', 'Obesity management', 'Dry season', 'Pre-release conditioning', 'Trial diet', 'Low-density herd', 'Shared enclosure', 'Other'],

  skip: ['Fasting day', 'Vet procedure', 'Transfer', 'Animal unwell', 'Weather', 'Other'],
};
REASONS.new = REASONS.diet = REASONS.end = REASONS.items;

function addHistory(h) { D.history.push({ id: 'CH-' + String(++D.hseq).padStart(3, '0'), ...h }); }
/* the seed requests that were approved before today changed the diets then */
function seedApprovals() { D.requests.filter(r => isDiet(r) && r.state === 'approved').forEach(r => applyApproval(r, r.events.find(e => e.kind === 'approved').at)); }

function act(r, kind, uid, x = {}) {
  const u = user(uid);
  if (!actionsFor(r, u).includes(kind)) throw new Error(`${u.title} can't ${kind} ${r.id} now`);
  if (['reject', 'cancel'].includes(kind) && (x.reason || '').trim().length < 3) throw new Error('Add a reason');
  if (kind === 'delay' && !(x.until > TODAY && x.reason)) throw new Error('Choose a date after today and a reason');
  if (kind === 'approve' && isDiet(r) && planOf(r).block) throw new Error(planOf(r).block);
  const at = nowStamp(), ev = (k, extra = {}) => r.events.push({ kind: k, by: uid, at, ...extra });
  switch (kind) {
    case 'approve': ev('approved', { note: (x.note || '').trim() }); r.state = 'approved'; r.delay = null; if (isDiet(r)) applyApproval(r, at); break;
    case 'delay': ev('delayed', { until: x.until, reason: x.reason, note: (x.note || '').trim() }); r.state = 'delayed'; r.delay = { until: x.until, reason: x.reason, note: (x.note || '').trim() }; break;
    case 'reject': ev('rejected', { reason: x.reason.trim() }); r.state = 'rejected'; break;
    case 'cancel': ev('cancelled', { reason: x.reason.trim() }); r.state = 'cancelled'; break;
    default: throw new Error('Unknown action ' + kind);
  }
  return r;
}
function newRequestId() { D.seq = Math.max(D.seq || 0, ...D.requests.map(r => +r.id.split('-')[1])) + 1; return 'REQ38-' + String(D.seq).padStart(5, '0'); }

/* ---------- history: Kitchen & Diet's Diet Changes types and one line per change ---------- */
const HTYPES = [['created', 'Created'], ['shared', 'Shared'], ['edited', 'Edited'], ['lifecycle', 'Lifecycle']];
const HTYPE = Object.fromEntries(HTYPES);
const HTONE = { created: 'positive', shared: 'neutral', edited: 'pending', lifecycle: 'cancelled' };
function lineText(l) {
  const nm = id => item(id).name;
  if (l.op === 'add') return `Added ${nm(l.now.item)} ${qtyText(l.now.qty, l.now.unit)}`;
  if (l.op === 'remove') return `Stopped ${nm(l.was.item)}`;
  const x = lineDiff(l.was, { ...l.now, to: l.now.item });
  if (x.item) return `${nm(l.was.item)} → ${nm(l.now.item)}`;
  if (x.amount) return `${nm(l.now.item)} ${qtyText(l.was.qty, l.was.unit)} → ${qtyText(l.now.qty, l.now.unit)}`;
  if (x.days) return `${nm(l.now.item)} ${lineDays(l.was)} → ${lineDays(l.now)}`;
  return `${nm(l.now.item)} ${[l.was.prep, l.was.cut].filter(Boolean).join(' · ') || 'plain'} → ${[l.now.prep, l.now.cut].filter(Boolean).join(' · ') || 'plain'}`;
}
function changeSummary(h) {
  if (h.skip) return `No diet on ${wday(h.skip.date)} ${fmtDay(h.skip.date)} · ${h.skip.feeds === 'all' ? 'all feeds' : h.skip.feeds.map(f => feed(f).from).join(', ')}`;
  if (h.follows) return `Now on ${diet(h.follows).name}`;
  if (h.created) { const a = asgOfChange(h); return `New ${a ? slotKind(a) : 'diet'} diet${h.from ? ` from ${diet(h.from).name}` : ''}`; }
  if (h.shared) return `Shared with ${h.shared.map(s => species(s).name).join(', ')}`;
  if (h.cert) return `Certified by ${user(h.by).name}`;
  if (h.ended) return h.ended;
  if (h.fields) return h.fields.map(([k, a, b]) => `${k} ${a} → ${b}`).join(' · ');
  const ls = h.lines || [];
  return ls.length > 1 ? `${lineText(ls[0])} + ${ls.length - 1} more` : ls.length ? lineText(ls[0]) : 'Diet edited';
}
const asgOfChange = h => D.assigns.find(a => a.diet === (h.follows ? h.follows : h.diet) && a.sp === h.sp && a.level === h.level && (h.level === 'species' || a.ref === h.ref) && (!h.req || a.req === h.req)) || D.assigns.find(a => a.diet === h.diet && a.sp === h.sp);
const changeSite = h => h.level === 'species' ? null : pathOf(h).site;
/* the changes for a view: period (days), species, site, level, type */
function changesIn({ days = null, sp = null, site = 'all', level = null, type = 'all', dietId = null } = {}) {
  return D.history.filter(h => (!days || days.includes(h.at.slice(0, 10))) && (!sp || h.sp === sp) && (site === 'all' || changeSite(h) === site || (h.level === 'species' && spAnimals(h.sp, site).length))
    && (!level || h.level === level) && (type === 'all' || h.type === type) && (!dietId || h.diet === dietId || h.follows === dietId))
    .sort((a, b) => (a.at < b.at ? 1 : -1));
}
