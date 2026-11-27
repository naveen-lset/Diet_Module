// js/applyto.js — Diet Applies To (owner, 27 Nov 2026: "selecting the entity, I want it like antz-diet.pages.dev/prototypes/diet-tablet/#/new/where").
// One sheet: Search animal (with the QR), then Select species · Select site · Select section · Select enclosure · Select animal, one after
// the other. A pick shows as a card with Clear (which clears it and everything under it); the next choice appears under it. Each choice opens
// its list in the same sheet (search, the name, its counts as chips). Done takes the deepest place picked.

let APK = null;
const APK_LV = [['sp', 'species', 'Species'], ['site', 'site', 'Site'], ['sec', 'section', 'Section'], ['enc', 'enclosure', 'Enclosure'], ['an', 'animal', 'Animal']];
function applyPick(cb, cur = null) {
  APK = { cb, sp: null, site: null, sec: null, enc: null, an: null, step: null, q: '', sq: '' };
  if (cur) { APK.sp = cur.sp; if (cur.level !== 'species') { const p = pathOf(cur); APK.site = p.site ?? null; APK.sec = cur.level === 'site' ? null : p.section ?? null; APK.enc = ['enclosure', 'animal'].includes(cur.level) ? p.enclosure ?? null : null; APK.an = cur.level === 'animal' ? cur.ref : null; } }
  openSheet(applyHtml);
}
/* the animals under what is picked so far */
const apAnimals = (upTo = 5) => D.animals.filter(a => { const p = pathOfAnimal(a);
  return (!APK.sp || a.sp === APK.sp) && (upTo < 2 || !APK.site || p.site === APK.site) && (upTo < 3 || !APK.sec || p.section === APK.sec) && (upTo < 4 || !APK.enc || a.enc === APK.enc); });
function apOpts(k) {
  const an = apAnimals(APK_LV.findIndex(x => x[0] === k)), cnt = (f, ids) => ids.map(id => ({ id, n: an.filter(a => f(a) === id).length }));
  if (k === 'sp') return D.species.map(s => ({ id: s.id, name: s.name, sub: s.sci, photo: spPhoto(s.id), chips: [`Animals ${D.animals.filter(a => a.sp === s.id).length}`] })).sort((a, b) => a.name.localeCompare(b.name));
  if (k === 'site') return cnt(a => pathOfAnimal(a).site, [...new Set(an.map(a => pathOfAnimal(a).site))]).map(x => ({ id: x.id, name: by('sites', x.id).name, icon: 'location_on', chips: [`Sections ${new Set(an.filter(a => pathOfAnimal(a).site === x.id).map(a => pathOfAnimal(a).section)).size}`, `Animals ${x.n}`] }));
  if (k === 'sec') return cnt(a => pathOfAnimal(a).section, [...new Set(an.map(a => pathOfAnimal(a).section))]).map(x => ({ id: x.id, name: by('sections', x.id).name, icon: 'grid_view', chips: [`Enclosures ${new Set(an.filter(a => pathOfAnimal(a).section === x.id).map(a => a.enc)).size}`, `Animals ${x.n}`] }));
  if (k === 'enc') return cnt(a => a.enc, [...new Set(an.map(a => a.enc))]).map(x => ({ id: x.id, name: by('enclosures', x.id).name, icon: 'fence', chips: [`Animals ${x.n}`] })).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  return an.map(a => ({ id: a.id, name: animalName(a), sub: `AID ${a.id} · ${SEXT[a.sex] === 'UD' ? 'Undetermined' : a.sex === 'M' ? 'Male' : 'Female'}`, photo: spPhoto(a.sp), chips: [] }));
}
const apName = (k, id) => k === 'sp' ? species(id).name : k === 'site' ? by('sites', id).name : k === 'sec' ? by('sections', id).name : k === 'enc' ? by('enclosures', id).name : animalName(by('animals', id));
const apIc = o => o.photo ? `<span class="ap-ph"><img src="${o.photo}" alt="" loading="lazy"></span>` : `<span class="ap-ic">${I(o.icon, 20)}</span>`;
function apSet(k, id) { const i = APK_LV.findIndex(x => x[0] === k); APK[k] = id; APK_LV.slice(i + 1).forEach(([x]) => { APK[x] = null; }); APK.step = null; APK.sq = ''; redrawSheet(); }
function apClear(k) { const i = APK_LV.findIndex(x => x[0] === k); APK_LV.slice(i).forEach(([x]) => { APK[x] = null; }); redrawSheet(); }
/* Search animal: by name or AID; a tap fills every level down to the animal */
function apAnimal(id) { const a = by('animals', id), p = pathOfAnimal(a); Object.assign(APK, { sp: a.sp, site: p.site, sec: p.section, enc: a.enc, an: a.id, q: '' }); redrawSheet(); }
function apTarget() {
  if (!APK.sp) return null;
  if (APK.an) return { sp: APK.sp, level: 'animal', ref: APK.an };
  if (APK.enc) return { sp: APK.sp, level: 'enclosure', ref: APK.enc };
  if (APK.sec) return { sp: APK.sp, level: 'section', ref: APK.sec };
  if (APK.site) return { sp: APK.sp, level: 'site', ref: APK.site };
  return { sp: APK.sp, level: 'species', ref: null };
}
function apDone() { const t = apTarget(); if (!t) return; const cb = APK.cb; closeAll(); window[cb](t.sp, t.level, t.ref); }
function applyHtml() {
  /* one level's list, in the same sheet */
  if (APK.step) {
    const [k, , l] = APK_LV.find(x => x[0] === APK.step), q = APK.sq.trim().toLowerCase(), os = apOpts(k).filter(o => !q || o.name.toLowerCase().includes(q) || String(o.id).includes(q));
    return { title: `Select ${l.toLowerCase()}`, bottom: true, tall: true, step: `ap:${k}`, depth: 1,
      body: `${pkSearch('ap-sq', APK.sq, 'Search', 'APK.sq=this.value;redrawSheet()')}<div class="ap-list">${os.map(o => `<button class="ap-row" onclick="apSet('${k}',${o.id})">${apIc(o)}<span class="grow"><b>${esc(o.name)}</b>${o.sub ? `<small>${esc(o.sub)}</small>` : ''}${o.chips.length ? `<span class="ap-chips">${o.chips.map(c => `<i>${c}</i>`).join('')}</span>` : ''}</span></button>`).join('') || `<p class="sg-none">No ${l.toLowerCase()} by that name</p>`}</div>`,
      foot: `<button class="az-btn az-btn--outline" onclick="APK.step=null;APK.sq='';redrawSheet()">Back</button>` };
  }
  const q = APK.q.trim().toLowerCase(), hits = q ? D.animals.filter(a => animalName(a).toLowerCase().includes(q) || String(a.id).includes(q)).slice(0, 8) : [];
  const search = `<label class="ap-search">${I('search', 20)}<input id="ap-q" placeholder="Search animal" value="${esc(APK.q)}" oninput="APK.q=this.value;redrawSheet()" aria-label="Search animal"><button class="ap-qr" onclick="event.preventDefault();toast('Scan the enclosure QR')" aria-label="Scan QR">${I('qr_code_scanner', 22)}</button></label>`;
  const found = q ? `<div class="ap-list ap-list--hits">${hits.map(a => `<button class="ap-row" onclick="apAnimal(${a.id})"><span class="ap-ph"><img src="${spPhoto(a.sp)}" alt="" loading="lazy"></span><span class="grow"><b>${esc(animalName(a))}</b><small>AID ${a.id} · ${esc(species(a.sp).name)} · ${esc(by('enclosures', a.enc).name)}</small></span></button>`).join('') || '<p class="sg-none">No animal by that name or AID</p>'}</div>` : '';
  let blocks = '', next = '';
  for (const [k, , l] of APK_LV) {
    if (APK[k] != null) { const o = k === 'sp' ? { photo: spPhoto(APK.sp) } : k === 'an' ? { photo: spPhoto(APK.sp) } : { icon: { site: 'location_on', sec: 'grid_view', enc: 'fence' }[k] };
      blocks += `<div class="ap-sel"><div class="ap-sel__h"><b>Selected ${l.toLowerCase()}</b><button class="lnk" onclick="apClear('${k}')">Clear</button></div><div class="ap-card">${apIc(o)}<span class="grow"><b>${esc(apName(k, APK[k]))}</b>${k === 'sp' ? `<small>${esc(species(APK.sp).sci)}</small>` : k === 'an' ? `<small>AID ${APK.an}</small>` : ''}</span></div></div>`; continue; }
    const os = APK.sp || k === 'sp' ? apOpts(k) : [];
    if (os.length) next = `<button class="az-input az-input--select ap-next" onclick="APK.step='${k}';APK.sq='';redrawSheet()"><span class="grow">Select ${l.toLowerCase()}</span>${I('keyboard_arrow_down')}</button>`;
    break;
  }
  const t = apTarget();
  return { title: 'Diet Applies To', bottom: true, tall: true, step: 'ap', depth: 0,
    body: search + found + (q ? '' : `<p class="ap-say">Choose species, site, section, enclosure or animal</p>${blocks}${next}`),
    foot: `<span class="ap-n">${t ? `${t.level === 'species' ? 'Whole species' : LEVEL[t.level]} · ${plural(tAnimals(t).length, 'animal')}` : 'Nothing chosen yet'}</span><button class="az-btn"${t ? '' : ' disabled'} onclick="apDone()">Done</button>` };
}
