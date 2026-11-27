// js/applyto.js — Diet Applies To (owner, 27 Nov 2026: "selecting the entity, I want it like antz-diet.pages.dev/prototypes/diet-tablet/#/new/where").
// (owner, 27 Nov 2026: "this part has to open a separate page; Select Species opens a bottom sheet, the same for Site, Section, Enclosure,
// Animal; each sheet needs a search bar") A page: Search animal (with the QR), then Select species · site · section · enclosure · animal,
// one after the other. Each opens its own bottom sheet with a search. A pick shows as a card with Clear (it clears what is under it too).
// Done takes the deepest place picked back to the form; Back leaves it unchanged.

let APK = null;
const APK_LV = [['sp', 'species', 'Species'], ['site', 'site', 'Site'], ['sec', 'section', 'Section'], ['enc', 'enclosure', 'Enclosure'], ['an', 'animal', 'Animal']];
function applyPick(cb, cur = null) {
  APK = { cb, sp: null, site: null, sec: null, enc: null, an: null, step: null, q: '', sq: '' };
  if (cur) { APK.sp = cur.sp; if (cur.level !== 'species') { const p = pathOf(cur); APK.site = p.site ?? null; APK.sec = cur.level === 'site' ? null : p.section ?? null; APK.enc = ['enclosure', 'animal'].includes(cur.level) ? p.enclosure ?? null : null; APK.an = cur.level === 'animal' ? cur.ref : null; } }
  APK.back = location.hash; closeAll(); go('#/applyto');
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
function apSet(k, id) { const i = APK_LV.findIndex(x => x[0] === k); APK[k] = id; APK_LV.slice(i + 1).forEach(([x]) => { APK[x] = null; }); APK.sq = ''; closeAll(); render(); }
function apClear(k) { const i = APK_LV.findIndex(x => x[0] === k); APK_LV.slice(i).forEach(([x]) => { APK[x] = null; }); render(); }
/* Search animal: by name or AID; a tap fills every level down to the animal */
function apAnimal(id) { const a = by('animals', id), p = pathOfAnimal(a); Object.assign(APK, { sp: a.sp, site: p.site, sec: p.section, enc: a.enc, an: a.id, q: '' }); render(); }
function apTarget() {
  if (!APK.sp) return null;
  if (APK.an) return { sp: APK.sp, level: 'animal', ref: APK.an };
  if (APK.enc) return { sp: APK.sp, level: 'enclosure', ref: APK.enc };
  if (APK.sec) return { sp: APK.sp, level: 'section', ref: APK.sec };
  if (APK.site) return { sp: APK.sp, level: 'site', ref: APK.site };
  return { sp: APK.sp, level: 'species', ref: null };
}
function apDone() { const t = apTarget(); if (!t) return; const { cb, back } = APK; location.hash = back || '#/new?dept=diet'; setTimeout(() => window[cb](t.sp, t.level, t.ref), 0); }
function apBack() { location.hash = (APK && APK.back) || '#/new?dept=diet'; }
/* the design system's parts (owner, 27 Nov 2026: animal-card, site-card, bottom-sheet pages of the Antz Library):
   an animal is the Animal card (photo 104, sex tag, expand corner; radio to choose; remove once picked); a species, site, section or
   enclosure is the Site card (48 thumbnail, name, one line under it; radio to choose; a picked card with ✕ in the page) */
const apSexTag = a => { const x = SEXT[a.sex] || 'UD'; return `<span class="az-ac-tag az-ac-tag--${x.toLowerCase()}">${x}</span>`; };
const apAge = a => a.ageM == null ? '' : a.ageM >= 12 ? `${Math.floor(a.ageM / 12)}y ${a.ageM % 12}m` : `${a.ageM}m`;
function animalCardDS(a, { control = 'radio', on = false, act = '', big = false } = {}) {
  const sp = species(a.sp), p = pathOfAnimal(a), ctl = control === 'radio' ? `<span class="az-ac-ctl"><span class="az-ac-radio${on ? ' is-on' : ''}" aria-hidden="true"></span></span>`
    : control === 'remove' ? `<span class="az-ac-ctl"><button type="button" class="az-ac-remove" onclick="event.stopPropagation();${act}" aria-label="Remove">${I('cancel', 24, true)}</button></span>` : '';
  const exp = `<button type="button" class="az-ac-exp" onclick="event.stopPropagation();this.closest('.az-ac').classList.toggle('is-open')" aria-label="Expand card"><img src="assets/ds/expand.svg" width="16" height="16" alt=""></button>`;
  const pick = control === 'radio' ? ` data-act="1" onclick="${act}"` : '';
  return `<div class="az-ac ap-ac${on ? ' is-picked' : ''}"${pick}>
    <div class="az-ac-row ap-ac__small"><span class="az-ac-ph"><img class="az-ac-ph__img" src="${spPhoto(a.sp)}" alt="">${apSexTag(a)}${exp}</span><span class="az-ac-b"><span class="az-ac-top"><span class="az-ac-l az-ac-l--aaid">AID: ${a.id}</span></span>${a.name ? `<span class="az-ac-l">Name: ${esc(a.name)}</span>` : ''}<span class="az-ac-l">${esc(sp.name)}</span><span class="az-ac-l az-ac-l--sci">${esc(sp.sci)}</span><span class="az-ac-l">Encl: ${esc(by('enclosures', a.enc).name)}</span></span>${ctl}</div>
    <div class="ap-ac__big"><div class="az-ac-top-ph"><span class="az-ac-ph az-ac-ph--big"><img class="az-ac-ph__img" src="${spPhoto(a.sp)}" alt="">${apSexTag(a)}<span class="az-ac-strip"><span class="az-ac-strip__id">AID: ${a.id}</span><span class="az-ac-chips"><span class="az-ac-chip">${I('calendar_today', 12)}${apAge(a)}</span><span class="az-ac-chip az-ac-chip--w">${I('monitor_weight', 12)}${a.wt ? `${a.wt} kg` : '-- --'}</span></span></span>${exp.replace('Expand card', 'Collapse card')}</span></div>
      <div class="az-ac-row az-ac-row--big"><span class="az-ac-b az-ac-b--big"><span class="az-ac-d"><b>Species:</b> ${esc(sp.name)}</span><span class="az-ac-d"><b>Sci. Name:</b> <i>${esc(sp.sci)}</i></span><span class="az-ac-d"><b>Enclosure:</b> ${esc(by('enclosures', a.enc).name)}</span><span class="az-ac-d"><b>Section:</b> ${esc(by('sections', p.section).name)}</span><span class="az-ac-d"><b>Site:</b> ${esc(by('sites', p.site).name)}</span></span>${ctl}</div></div></div>`;
}
const siteCardDS = ({ thumb, icon, name, sub, on = false, act = '', picked = false, remove = '' }) => {
  const th = thumb ? `<img class="az-site__thumb" src="${thumb}" alt="">` : `<span class="az-site__thumb ap-site__ic">${I(icon, 22)}</span>`;
  return picked ? `<div class="az-site az-site--picked ap-site">${th}<div class="ap-site__t"><div class="az-site__name">${esc(name)}</div>${sub ? `<div class="az-site__sub">${sub}</div>` : ''}</div><button type="button" class="ap-site__x" onclick="${remove}" aria-label="Remove ${esc(name)}">${I('cancel', 24, true)}</button></div>`
    : `<button type="button" class="az-site ap-site" role="radio" aria-checked="${on}" onclick="${act}">${th}<div class="ap-site__t"><div class="az-site__name">${esc(name)}</div>${sub ? `<div class="az-site__sub">${sub}</div>` : ''}</div>${I(on ? 'radio_button_checked' : 'radio_button_unchecked', 24)}</button>`;
};
/* one level's list: the design system's Bottom sheet — title and close, the search, the rows; Cancel and Select at the foot (the choice is
   kept only with Select) */
function apSheet(k) { APK.sq = ''; APK.tmp = APK[k]; openSheet(() => {
  const [, , l] = APK_LV.find(x => x[0] === k), q = APK.sq.trim().toLowerCase(), os = apOpts(k).filter(o => !q || o.name.toLowerCase().includes(q) || String(o.id).includes(q));
  const row = o => k === 'an' ? animalCardDS(by('animals', o.id), { on: APK.tmp === o.id, act: `APK.tmp=${o.id};redrawSheet()` })
    : siteCardDS({ thumb: o.photo, icon: o.icon, name: o.name, sub: [o.sub, ...(o.chips || [])].filter(Boolean).map(esc).join(' · '), on: APK.tmp === o.id, act: `APK.tmp=${o.id};redrawSheet()` });
  return { title: `Select ${l}`, bottom: true, tall: true,
    body: `${pkSearch('ap-sq', APK.sq, 'Search', 'APK.sq=this.value;redrawSheet()')}<div class="ap-list${k === 'an' ? ' ap-list--ac' : ''}">${os.map(row).join('') || `<p class="sg-none">No ${l.toLowerCase()} by that name</p>`}</div>`,
    foot: `<button class="az-btn az-btn--outline" onclick="closeSheet()">Cancel</button><button class="az-btn"${APK.tmp == null ? ' disabled' : ''} onclick="apSet('${k}',APK.tmp)">Select</button>` }; });
}
/* the page */
function paneApplyTo() {
  if (!APK) { setTimeout(() => go('#/new?dept=diet'), 0); return pane('pane--fill', topbar({ back: '#/new?dept=diet', title: 'Diet Applies To' }), ''); }
  const q = APK.q.trim().toLowerCase(), hits = q ? D.animals.filter(a => animalName(a).toLowerCase().includes(q) || String(a.id).includes(q)).slice(0, 8) : [];
  const search = `<label class="ap-search">${I('search', 20)}<input id="ap-q" placeholder="Search animal" value="${esc(APK.q)}" oninput="APK.q=this.value;render()" aria-label="Search animal"><button class="ap-qr" onclick="event.preventDefault();toast('Scan the enclosure QR')" aria-label="Scan QR">${I('qr_code_scanner', 22)}</button></label>`;
  const found = q ? `<div class="ap-list ap-list--hits">${hits.map(a => `<button class="ap-row" onclick="apAnimal(${a.id})"><span class="ap-ph"><img src="${spPhoto(a.sp)}" alt="" loading="lazy"></span><span class="grow"><b>${esc(animalName(a))}</b><small>AID ${a.id} · ${esc(species(a.sp).name)} · ${esc(by('enclosures', a.enc).name)}</small></span></button>`).join('') || '<p class="sg-none">No animal by that name or AID</p>'}</div>` : '';
  let blocks = '', next = '';
  for (const [k, , l] of APK_LV) {
    if (APK[k] != null) { const o = k === 'sp' || k === 'an' ? { photo: spPhoto(APK.sp) } : { icon: { site: 'location_on', sec: 'grid_view', enc: 'fence' }[k] };
      const sub = k === 'sp' ? `<i>${esc(species(APK.sp).sci)}</i>` : k === 'site' ? '' : k === 'sec' ? esc(by('sites', APK.site).name) : k === 'enc' ? esc(by('sections', APK.sec).name) : '';
      blocks += `<div class="ap-sel"><div class="ap-sel__h"><b>Selected ${l.toLowerCase()}</b><button class="lnk" onclick="apSheet('${k}')">Change</button></div>${k === 'an' ? animalCardDS(by('animals', APK.an), { control: 'remove', act: `apClear('an')` })
        : siteCardDS({ thumb: o.photo, icon: o.icon, name: apName(k, APK[k]), sub, picked: true, remove: `apClear('${k}')` })}</div>`; continue; }
    if ((APK.sp || k === 'sp') && apOpts(k).length) next = `<button class="az-input az-input--select ap-next" onclick="apSheet('${k}')"><span class="grow">Select ${l.toLowerCase()}</span>${I('keyboard_arrow_down')}</button>`;
    break;
  }
  const t = apTarget();
  const top = topbar({ back: '', lead: `<button class="az-iconbtn" onclick="apBack()" aria-label="Back">${I('arrow_back')}</button>`, title: 'Diet Applies To' });
  const foot = `<div class="ap-foot"><span class="ap-n">${t ? `${t.level === 'species' ? 'Whole species' : LEVEL[t.level]} · ${plural(tAnimals(t).length, 'animal')}` : 'Nothing chosen yet'}</span><button class="az-btn"${t ? '' : ' disabled'} onclick="apDone()">Done</button></div>`;
  return pane('pane--fill ap-page', top, `<div class="body ap-body">${search}${found}${q ? '' : `<p class="ap-say">Choose species, site, section, enclosure or animal</p>${blocks}${next}`}</div>`, foot, 'applyto');
}
