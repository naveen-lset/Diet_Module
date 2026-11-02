// js/diets.js — the Diet module, opened from Home › Modules › Diet. No bottom navigation:
// Diet (Diet wise | Species wise) → a species (its photo, the level chips, its diets) → one diet (the Figma Diet Details, with
// who certified it and its notes as the Kitchen & Diet web; its own history, Diet info and Meal details in sheets).
// Phone: one screen at a time, a species in a bottom sheet. iPad: Diet on the left, the species on the right, a diet in a centred popup.

/* ---------- the first screen of Diet: Diet wise | Species wise, and a Dietician's diet requests ---------- */
const activeDiets = sp => slotsOf(sp).filter(isNow).length;
/* live's class pills: All · Mammalia · Aves · Reptilia · Other */
const CLASSES = ['Mammalia', 'Aves', 'Reptilia'];
const inClass = (s, c) => c === 'all' || (c === 'Other' ? !CLASSES.includes(s.cls) : s.cls === c);
/* a species' diet status: No diet; Uncertified when any of its diets has no dietitian certification; else Certified */
const spStatus = id => { const sl = slotsOf(id); return !sl.length ? 'without' : sl.every(a => diet(a.diet).cert) ? 'cert' : 'uncert'; };
function speciesFor(tab, cls = S.spCls) {
  const q = S.spQ.trim().toLowerCase();
  return D.species.filter(s => spAnimals(s.id, S.site).length && inClass(s, cls) && (tab === 'all' || spStatus(s.id) === tab) && (!q || s.name.toLowerCase().includes(q) || s.sci.toLowerCase().includes(q) || String(s.id).includes(q)))
    .sort((a, b) => a.name.localeCompare(b.name));
}
/* every diet in use (not ended), at the site picked, by kind */
/* certified = a dietitian certified it (Kitchen & Diet's Certified / Uncertified) */
const isCert = a => !!diet(a.diet).cert;
/* a diet's uses in force at the site picked: one per species it is given to (a diet can be shared), its own species first */
const usesOf = id => D.assigns.filter(a => a.diet === id && !ended(a) && atSite(a, S.site) && spAnimals(a.sp, S.site).length).sort((x, y) => (y.sp === diet(id).sp) - (x.sp === diet(id).sp));
/* Diet wise lists diets, one card each however many species share it; the card stands for its first matching use */
function dietsFor(kind, cert = S.dCert) {
  const q = S.dQ.trim().toLowerCase(), seen = new Set();
  return D.assigns.filter(a => !ended(a) && atSite(a, S.site) && spAnimals(a.sp, S.site).length && (kind === 'all' || slotKind(a) === kind) && (cert === 'all' || (cert === 'cert') === isCert(a)) && (!q || [diet(a.diet).name, diet(a.diet).id, species(a.sp).name, scopeText(a)].some(x => x.toLowerCase().includes(q))))
    .sort((x, y) => (y.sp === diet(y.diet).sp) - (x.sp === diet(x.diet).sp))
    .filter(a => !seen.has(a.diet) && seen.add(a.diet))
    .sort((x, y) => species(x.sp).name.localeCompare(species(y.sp).name) || LEVELS.indexOf(x.level) - LEVELS.indexOf(y.level) || kindRank(x) - kindRank(y));
}
/* "if the person may raise requests, show the count": open diet requests, opening Help Desk on Diet */
function myRequestsRow() {
  if (!canRaise(me())) return '';
  const open = D.requests.filter(r => isDiet(r) && r.by === S.user && isOpen(r)), delayed = open.filter(r => r.state === 'delayed').length;
  return `<a class="reqsum" href="#/requests" onclick="S.rTab='pending';S.rDept='diet'"><span class="reqsum__ic">${I('assignment')}</span><span class="grow"><b>My diet requests</b><span class="sub">${open.length ? `${open.length - delayed} awaiting approval${delayed ? ` · ${delayed} delayed` : ''}` : 'None open'}</span></span><span class="cnt">${open.length}</span>${I('chevron_right', 20)}</a>`;
}
const dietTabs = cur => `<div class="az-tabs" role="tablist">${thumb(true)}${[['diets', 'Diet wise'], ['species', 'Species wise']].map(([k, l]) => `<button class="az-tab" role="tab" aria-selected="${cur === k}" onclick="homeTab('${k}')">${l}</button>`).join('')}</div>`;
/* switching tabs keeps them pinned if they were, and shows the new list from its start */
function homeTab(k) {
  const b = document.querySelector('.pane--home .pane__body'), r = b && b.querySelector('.reqsum');
  if (b) b.scrollTop = Math.min(b.scrollTop, r ? r.offsetHeight : 0);
  S.land = k; go('#/diets'); swapFx('.pane--home .list');
}
/* one diet in the Diet wise list: a diet avatar, its name, its kind, how many species get it, and its ID */
function dietRow(a, current) {
  const d = diet(a.diet), n = new Set(usesOf(d.id).map(u => u.sp)).size;
  return `<a class="sprow dietrow pick" href="#/diets/${a.sp}/${a.id}"${current ? ' aria-current="true"' : ''}><span class="davatar">${I('restaurant')}</span><span class="sprow__t"><b>${esc(d.name)}</b><span class="sub">${esc(slotKind(a))}</span><span class="dfoot"><span class="dfoot__n">${n} species</span><span class="did">${esc(d.id)}</span></span></span></a>`;
}
/* the filters, in one sheet (the design system's Search and filter): Diet wise = kind + certification; Species wise = class + diet status */
const FILTERS = {
  diets: [['dKind', 'Kind', () => [['all', 'All kinds'], ...KINDS.map(k => [k, k])], v => dietsFor(v, S.dCert).length],
    ['dCert', 'Certification', () => [['all', 'All'], ['cert', 'Certified'], ['uncert', 'Uncertified']], v => dietsFor(S.dKind, v).length]],
  species: [['spCls', 'Class', () => [['all', 'All classes'], ...CLASSES.map(c => [c, c]), ['Other', 'Other']], v => speciesFor(S.spTab, v).length],
    ['spTab', 'Diet status', () => [['all', 'All'], ['cert', 'Certified'], ['uncert', 'Uncertified'], ['without', 'No diet']], v => speciesFor(v, S.spCls).length]],
};
const activeFilters = tab => FILTERS[tab].filter(([k]) => S[k] !== 'all');
function filterSheet() {
  const tab = S.land, n = () => tab === 'diets' ? dietsFor(S.dKind).length : speciesFor(S.spTab).length;
  openSheet(() => ({ title: 'Filter', form: true, body: FILTERS[tab].map(([k, label, opts, count]) => `<div class="az-field"><span class="az-label">${label}</span><div class="fopts">${opts().map(([v, l]) => {
      const on = S[k] === v; return `<button class="fopt" role="radio" aria-checked="${on}" onclick="S.${k}='${v}';render();redrawSheet();swapFx('.pane .list')"><span>${esc(l)}</span><small>${count(v)}</small></button>`; }).join('')}</div></div>`).join(''),
    foot: `<button class="az-btn az-btn--outline" onclick="${FILTERS[tab].map(([k]) => `S.${k}='all'`).join(';')};render();redrawSheet()">Clear</button><button class="az-btn" onclick="closeSheet()">Show ${plural(n(), tab === 'diets' ? 'diet' : 'species', tab === 'diets' ? 'diets' : 'species')}</button>` }));
}
function listHead(tab, n) {
  const act = activeFilters(tab), name = (k, v) => FILTERS[tab].find(f => f[0] === k)[2]().find(o => o[0] === v)[1];
  return `<div class="lhead"><span class="lhead__n">${plural(n, tab === 'diets' ? 'diet' : 'species', tab === 'diets' ? 'diets' : 'species')}</span>${act.map(([k]) => `<button class="fchip" onclick="S.${k}='all';render();swapFx('.pane .list')" aria-label="Remove filter ${esc(name(k, S[k]))}">${esc(name(k, S[k]))}${I('close', 16)}</button>`).join('')}</div>`;
}
/* the list's own toggle, at the top of the list and as wide as its cards: certification (and, for species, no diet); it scrolls with the list */
const listToggle = (key, opts) => `<div class="ltoggle"><div class="az-segment az-segment--sm" role="tablist" aria-label="Certification">${thumb()}${opts.map(([k, l]) => `<button role="tab" aria-selected="${S[key] === k}" onclick="S.${key}='${k}';render();swapFx('.pane .list')">${l}</button>`).join('')}</div></div>`;
/* the page scrolls as one: the requests row, search and chips go up with the list; Diet wise | Species wise stays pinned under the top bar */
function paneDietHome({ cls = '', cur = null } = {}) {
  const tab = S.land, top = topbar({ back: '#/home', title: 'Diet', site: true }), head = myRequestsRow() + dietTabs(tab);
  const chips = (key, opts, count) => `<div class="az-chips" role="tablist">${opts.map(([k, l]) => `<button class="az-chip" role="tab" aria-selected="${S[key] === k}" onclick="S.${key}='${k}';render();swapFx('.pane .list')">${l} - ${count(k)}</button>`).join('')}</div>`;
  if (tab === 'diets') {
    const search = `<div class="az-searchrow"><label class="az-search">${I('search', 20)}<input id="d-q" placeholder="Search diet, species, place or ID" value="${esc(S.dQ)}" oninput="S.dQ=this.value;render()" aria-label="Search diets"></label></div>`;
    const list = dietsFor(S.dKind);
    return pane(`${cls} pane--home`, top, head + search + chips('dKind', [['all', 'All'], ...KINDS.map(k => [k, k])], k => dietsFor(k).length)
      + `<div class="body">${listToggle('dCert', [['all', 'All'], ['cert', 'Certified'], ['uncert', 'Uncertified']])}<div class="list list--8">${list.length ? list.map(a => dietRow(a, !!cur && (by('assigns', cur) || {}).diet === a.diet)).join('') : empty1('No diet here')}</div></div>`, '', 'home');
  }
  const search = `<div class="az-searchrow"><label class="az-search">${I('search', 20)}<input id="sp-q" placeholder="Search species or taxonomy ID" value="${esc(S.spQ)}" oninput="S.spQ=this.value;render()" aria-label="Search species"></label></div>`;
  const list = speciesFor(S.spTab), clsChips = chips('spCls', [['all', 'All'], ...CLASSES.map(c => [c, c]), ['Other', 'Other']], c => speciesFor(S.spTab, c).length);
  /* a species card: photo, name, scientific name, animal count, and its diet count big in a tile */
  const rows = list.length ? list.map(s => { const all = slotsOf(s.id).length;
    return speciesRow(s, { href: `#/diets/${s.id}`, current: cur === s.id, sub: plural(spAnimals(s.id, S.site).length, 'animal'),
      end: `<span class="sprow__n${all ? '' : ' sprow__n--none'}"><b>${all ? activeDiets(s.id) : 0}</b><span>Diets</span></span>` }); }).join('') : empty1('No species here');
  return pane(`${cls} pane--home`, top, head + search + clsChips + `<div class="body">${listToggle('spTab', [['all', 'All'], ['cert', 'Certified'], ['uncert', 'Uncertified'], ['without', 'No diet']])}<div class="list list--8">${rows}</div></div>`, '', 'home');
}

/* ---------- a species: its photo, facts, the level chips, then the diets or places of that level ---------- */
const lvlOf = sp => { const l = S.lvl[sp] || 'species'; return levelsOf(sp).includes(l) ? l : 'species'; };
function spFacts(sp) {
  const as = spAnimals(sp.id, S.site), n = k => new Set(as.map(a => pathOfAnimal(a)[k])).size, w = (k, one, many) => `<span><b>${n(k)}</b> ${n(k) === 1 ? one : many}</span>`;
  return `<div class="facts"><span><b>${as.length}</b> animals</span>${w('site', 'site', 'sites')}${w('section', 'section', 'sections')}${w('enclosure', 'enclosure', 'enclosures')}</div>`;
}
/* the photo header of a species: the photo as it is, a shade only behind the words */
const shade = 'linear-gradient(180deg,rgba(0,0,0,.42) 0%,rgba(0,0,0,0) 30%,rgba(0,0,0,0) 48%,rgba(0,0,0,.66) 100%)';
const spHero = (sp, close = '') => `<div class="sphero" style="background-image:${shade},url('${spPhoto(sp.id)}')">${close ? `<button class="sphero__x" onclick="${close}" aria-label="Close">${I('close')}</button>` : ''}<span class="sphero__t"><b>${esc(sp.name)}</b><span><i>${esc(sp.sci)}</i> · ${esc(sp.cls)}</span></span></div>`;
function speciesParts(spId, cur) {
  const l = lvlOf(spId);
  if (!slotsOf(spId).length) return { chips: '', body: empty1(`No diet added for ${esc(species(spId).name)}`) };
  const chips = `<div class="az-chips" role="tablist" aria-label="Level">${levelsOf(spId).map(k => `<button class="az-chip" role="tab" aria-selected="${l === k}" onclick="pickLevel(${spId},'${k}')">${LEVEL[k]} - ${dietCount(spId, k, S.site)}</button>`).join('')}</div>`;
  let body;
  if (l === 'species') {
    const list = slotsOf(spId).filter(a => a.level === 'species'), gone = endedOf(spId);
    body = (list.length ? `<div class="dcards">${list.map(a => dietCard(a, { current: cur === a.id })).join('')}</div>` : `<div class="nodiet">No diet added</div>`)
      + (gone.length ? `<button class="cap lnk" onclick="endedSheet(${spId})">Ended diets - ${gone.length}${I('chevron_right', 20)}</button>` : '');
  } else if (l === 'animal') {
    const all = placesAt(spId, 'animal', S.site), withD = all.filter(p => p.diets.length), rest = all.length - withD.length;
    const shown = S.animAll ? all : withD, q = S.aQ.trim().toLowerCase();
    const list = shown.filter(p => !q || animalName(p.animal).toLowerCase().includes(q) || String(p.id).includes(q) || by('enclosures', p.animal.enc).name.toLowerCase().includes(q));
    const search = S.animAll ? `<label class="az-search az-search--card">${I('search', 20)}<input id="a-q" placeholder="Search animal ID, name or enclosure" value="${esc(S.aQ)}" oninput="S.aQ=this.value;render()" aria-label="Search animals"></label>` : '';
    body = search + list.map(p => animalCard(p.animal, p.diets.length ? p.diets.map(a => placeDietRow(a, cur === a.id)).join('') : '<div class="place__none">No diet added</div>')).join('')
      + (!withD.length && !S.animAll ? `<div class="nodiet">No animal has its own diet</div>` : '')
      + (rest ? `<button class="restline" onclick="S.animAll=!S.animAll;S.aQ='';render()"><span>${S.animAll ? `Showing all ${plural(all.length, 'animal')}` : `No diet added · ${plural(rest, 'other animal')}`}</span><b>${S.animAll ? 'Show fewer' : 'Show all'}</b></button>` : '');
  } else {
    const list = placesAt(spId, l, S.site), withD = list.filter(p => p.diets.length), none = list.filter(p => !p.diets.length);
    body = withD.map(p => placeCard(p, cur)).join('') + (!withD.length ? `<div class="nodiet">No ${LEVEL[l].toLowerCase()} diet added</div>` : '')
      + (none.length && withD.length ? `<div class="restline restline--static"><span>No diet added</span><span class="sub">${none.map(p => esc(p.name)).join(', ')}</span></div>` : '');
  }
  return { chips, body };
}
/* the iPad's species column */
function paneSpecies(spId, { cls = '', cur = null } = {}) {
  const sp = species(spId), p = speciesParts(spId, cur);
  return pane(cls, spHero(sp) + `<div class="sphead">${spFacts(sp)}</div>` + p.chips, `<div class="body">${p.body}</div>`, '', `sp-${spId}`);
}
/* the phone's species: a bottom sheet over Diet, with its photo */
function speciesSheet(spId) {
  const sp = species(spId), p = speciesParts(spId, null);
  return `<div class="az-scrim" onclick="if(event.target===this)go('#/diets')"><section class="spsheet" role="dialog" aria-modal="true" aria-label="${esc(sp.name)}" data-k="sps-${spId}">${spHero(sp, "go('#/diets')")}<div class="sphead">${spFacts(sp)}</div>${p.chips}<div class="spsheet__body"><div class="body">${p.body}</div></div></section></div>`;
}
function pickLevel(sp, l) { S.lvl[sp] = l; S.aQ = ''; render(); }
function endedSheet(sp) { openSheet(() => ({ title: 'Ended diets', sub: esc(species(sp).name), body: endedOf(sp).map(a => dietCard(a)).join('') })); }

/* ---------- one diet: the Figma Diet Details (photo header, day pills, the table), with who certified it and its notes as the web ---------- */
/* certification as the Kitchen & Diet web: the dietitian who certified it; when none has, the kitchen's certification */
/* both certifications in one row (owner): the dietitian's and the kitchen's, each certified (who, when) or not */
function certLine(d) {
  const tile = (icon, tone, cap, who, when) => `<div class="cert cert--${tone}">${I(icon, 22, true)}<span><small>${cap}</small><b>${who}</b>${when ? `<small>${when}</small>` : ''}</span></div>`;
  return `<div class="certs certs--2">${d.cert ? tile('verified', 'ok', 'Certified dietitian', esc(user(d.cert.by).name), fmtDayY(d.cert.at)) : tile('gpp_maybe', 'bad', 'Dietitian', 'Not certified', '')}${d.kcert ? tile('soup_kitchen', 'ok', 'Certified by Kitchen', esc(user(d.kcert.by).name), fmtDayY(d.kcert.at)) : tile('soup_kitchen', 'none', 'Kitchen', 'Not certified', '')}</div>`;
}
/* the notes under the table, as the web: Kitchen note, Site note; then Remark (highlighted) and Change reason */
function notesBlock(d) {
  const rows = [['Kitchen note', esc(d.note)], ['Site note', esc(d.site)]].filter(r => r[1]);
  const why = d.reason ? `${esc(d.reason)}${d.remarks ? `<i>${esc(d.remarks)}</i>` : ''}` : '';
  if (!rows.length && !d.remark && !why) return '';
  return `<div class="notes">${rows.map(([k, v]) => `<div class="notes__r"><span>${k}</span><p>${v}</p></div>`).join('')}
    ${d.remark ? `<div class="notes__r notes__r--remark"><span>Remark</span><p>${esc(d.remark)}</p></div>` : ''}${why ? `<div class="notes__r"><span>Change reason</span><p>${why}</p></div>` : ''}</div>`;
}
function paneDiet(asgId, { cls = '', back = '', close = '' } = {}) {
  const a = by('assigns', asgId);
  if (!a) return pane(cls, '', empty1('Diet not found'));
  const d = diet(a.diet), n = followersOf(a).length, now = isNow(a);
  const lead = close ? '' : back ? `<button class="az-iconbtn" onclick="${back === 'history' ? `goBack('#/diets')` : `go('${back}')`}" aria-label="Back">${I('arrow_back')}</button>` : '';
  const head = `<div class="dhead dhead--photo" style="background-image:${shade},url('${spPhoto(a.sp)}')"><div class="dhead__bar">${lead}<b>Diet Details</b>${iconBtn('info', 'Diet info', `dietInfoSheet('${a.id}')`)}${iconBtn('history', 'History of this diet', `dietHistorySheet('${a.id}')`)}${close ? iconBtn('close', 'Close', `go('${close}')`) : ''}</div>
    <div class="dhead__who"><span class="dhead__name">${esc(d.name)}</span><span class="dhead__sub">Diet type : <b>${esc(slotKind(a))}${a.group ? ` · ${esc(a.group.label)}` : ''}</b> · ${esc(a.level === 'species' ? 'Species-wide' : `${LEVEL[a.level]} · ${targetName(a)}`)}</span>
    <span class="dhead__tags"><button class="dhead__chip" onclick="dietAnimalsSheet('${a.id}')">${I('pets', 18)}${plural(n, 'animal')}</button>${now ? '<span class="az-pill pill-on-dark">Currently active</span>' : ended(a) ? pill('neutral', 'Ended') : `<span class="az-pill pill-on-dark">${esc(slotWhen(a))}</span>`}</span></div></div>`;
  /* the day switch: the design system's segmented control, always the width of the screen */
  const days = true ? `<div class="dayseg"><div class="az-seg" role="tablist" aria-label="Day">${thumb()}${[[null, 'Full Week'], ...DAYS.map((x, i) => [i, x[0]])].map(([i, l]) => `<span role="tab" tabindex="0" class="${i == null ? 'wide' : ''}" aria-selected="${S.day === i}" aria-label="${i == null ? 'Full week' : DAYS[i]}" onclick="S.day=${i};render();swapFx('.dtable')" onkeydown="if(event.key==='Enter'){S.day=${i};render();swapFx('.dtable')}">${l}</span>`).join('')}</div></div>` : '';
  const groups = dietGroups(d, S.day, 'itemSheet');
  const body = certLine(d) + `<div class="dtable">${linesFigma(groups, isTab(), S.day == null, d.id)}</div>` + notesBlock(d);
  const fab = canRaise(me()) && !ended(a) ? `<button class="az-fab az-fab--pill dfab" onclick="go('#/new?dept=diet&asg=${a.id}')">${I('add_circle')}Raise request</button>` : '';
  return pane(cls + (fab ? ' has-fab' : ''), head + days, `<div class="body">${body}</div>`, '', `diet-${asgId}`).replace(/<\/section>$/, `${fab}</section>`);
}
/* Figma "Diet Info": the diet with its species' photo, then where, when, the animals, sharing, open requests, its ID and nutrition */
function dietInfoSheet(id) {
  const a = by('assigns', id), d = diet(a.diet), sp = species(a.sp), others = sharedWith(d.id, a.sp), open = openOnSlot(a).filter(r => visibleTo(r, me()));
  const r = (icon, k, v) => `<div class="rsec__r">${I(icon)}<span class="t"><span>${k}</span>${v}</span></div>`;
  const nut = nutrition(d), groups = [...new Set(nut.map(x => x.group))];
  openSheet(() => ({ title: 'Diet info', body: `<div class="dinfo"><img src="${spPhoto(a.sp)}" alt=""><span><b>${esc(d.name)}</b><span>${esc(slotKind(a))} · ${esc(sp.name)}</span></span></div>
    <div class="rsec">${r('location_on', 'For', `<b>${a.group ? `${esc(sp.name)} ${a.group.kind === 'age' ? 'aged' : 'of'} ${esc(a.group.label)}` : a.level === 'species' ? `${esc(sp.name)} · Species-wide` : `${esc(LEVEL[a.level])} · ${esc(targetName(a))}`}</b>${targetPath(a) ? `<p>${esc(targetPath(a))}</p>` : ''}`)}
      ${r('event', 'When', `<b>${esc(!a.start && !a.end ? 'All year' : slotWhen(a))}</b>`)}
      ${r('pets', 'Animals', `<button class="lnk" onclick="dietAnimalsSheet('${a.id}')">${plural(followersOf(a).length, 'animal')}${I('chevron_right', 18)}</button>`)}
      ${others.length ? r('share', 'Shared with', others.map(o => { const oa = D.assigns.find(x => x.diet === d.id && x.sp === o.id && !ended(x)); return `<a class="lnk" href="#/diets/${o.id}/${oa.id}">${esc(o.name)}${I('chevron_right', 18)}</a>`; }).join('')) : ''}
      ${open.length ? r('assignment', open.length === 1 ? 'Open request' : 'Open requests', open.map(x => `<a class="lnk" href="#/requests/${x.id}">${x.id} · ${esc(stateOf(x).label)}</a>`).join('')) : ''}
      ${r('tag', 'Diet ID', `<p>${d.id}</p>`)}</div>
    <p class="cap">Nutrition · per animal, per day</p>${groups.map(g => `<div class="nutri"><div class="nutri__h">${g}</div><div class="nutri__rows">${nut.filter(x => x.group === g).map(x => `<div class="nutri__r${x.v ? '' : ' zero'}"><span>${x.name}</span><b>${nutriText(x)}</b></div>`).join('')}</div></div>`).join('')}` }));
}
/* Figma "Animals using this Diet": the diet and its count, then the animals */
function dietAnimalsSheet(id) {
  const a = by('assigns', id), list = followersOf(a), d = diet(a.diet);
  openSheet(() => ({ title: 'Animals on this diet', sub: `${esc(d.name)} · ${list.length}`, body: list.length ? list.map(x => animalCard(x)).join('') : '<div class="nodiet">No animal is on this diet</div>' }), SH.length > 0);
}
/* Figma "Meal details": the time, the amount, the item with its preparation and cut, the days */
function itemSheet(dietId, f, it) {
  const d = diet(dietId), l = entryOf(d, f, it), x = item(it);
  const a = D.assigns.find(z => z.diet === dietId && location.hash.includes(z.id)) || D.assigns.find(z => z.diet === dietId), n = a ? followersOf(a).length : 0, total = toBase(l.qty, l.unit) * n;
  openSheet(() => ({ title: `${I('schedule', 20)} ${bandText(feed(f))}`, body: `<div class="qcard"><span>Per animal</span><b>${qtyText(l.qty, l.unit)}</b>${n ? `<small>${plural(n, 'animal')} · ${qtyText(total, BASE[l.unit][0])} ${l.cad ? 'a feed' : 'a day'}</small>` : ''}</div>
    <div class="mcard">${x.mix ? `<span class="mcard__k">Mix</span><b class="mcard__n">${esc(x.name)}</b><span class="mcard__k">Ingredients used</span>${x.mix.map(p => `<span class="mcard__chip"><b>${esc(item(p.item).name)}</b><span>${esc(p.prep)}</span><span>${esc(p.cut)}</span><b>${p.pct}%</b></span>`).join('')}<span class="mcard__k">Per animal</span><span class="nextf">${x.mix.map(p => `<span>${esc(item(p.item).name)} ${qtyText(toBase(l.qty, l.unit) * p.pct / 100, BASE[l.unit][0])}</span>`).join('')}</span>`
      : `<span class="mcard__k">Item</span><b class="mcard__n">${esc(x.name)}</b><span class="mcard__chip"><span>${esc(l.prep || 'As it comes')}</span><span>${esc(l.cut || 'Whole')}</span></span>`}
      ${l.cad ? `<span class="mcard__k">Repeats</span><b class="mcard__n">${cadText(l.cad)}</b><span class="mcard__k">Next feeds</span><span class="nextf">${nextFeeds(l, 3).map(s => `<span>${wday(s)} ${fmtDay(s)}</span>`).join('')}</span>`
        : `<span class="mcard__k">Days</span><div class="daygrid" role="list">${DAYS.map((y, i) => `<span role="listitem" class="${fedOn(l, i) ? 'on' : ''}" aria-label="${y}${fedOn(l, i) ? ', fed' : ', not fed'}">${y.slice(0, 2)}</span>`).join('')}</div>`}</div>` }));
}
/* the diet's own history: every change to it, newest first; a change opens over the list */
function dietHistorySheet(id) {
  const a = by('assigns', id), d = diet(a.diet), list = changesIn({ dietId: d.id });
  openSheet(() => ({ title: 'History of this diet', sub: esc(d.name), body: list.length ? list.map(h => changeRow(h, { noDiet: true, sheet: true })).join('') : '<div class="nodiet">No change since it was set</div>' }));
}

/* ---------- Diet per device ---------- */
function vDiets(parts) {
  const spId = parts[1] ? +parts[1] : null, asgId = parts[2] || null;
  if (isPhone()) {
    if (asgId) return paneDiet(asgId, { cls: 'pane--fill', back: 'history' });
    const home = paneDietHome({ cls: 'pane--fill' });
    return spId ? { html: home, overlay: speciesSheet(spId) } : home;
  }
  /* iPad: Diet on the left, the species on the right; a diet opens in a centred popup over both */
  const first = S.land === 'diets' ? (dietsFor(S.dKind)[0] || {}).sp : (speciesFor(S.spTab)[0] || {}).id, sp = spId || first || D.species[0].id;
  const a = asgId ? by('assigns', asgId) : null;
  if (a && a.sp === sp) S.lvl[sp] = a.level === 'species' || ended(a) ? 'species' : a.level;
  const html = paneDietHome({ cls: isLand() ? 'pane--w400' : 'pane--w340', cur: S.land === 'diets' ? (a ? a.id : null) : sp }) + paneSpecies(sp, { cls: 'pane--fill', cur: a ? a.id : null });
  return a ? { html, modal: paneDiet(a.id, { cls: 'pane--fill', close: `#/diets/${sp}` }), modalClose: `#/diets/${sp}`, sheet: a.id } : html;
}
/* a change has its own page on the phone (from a diet's history on the iPad it opens in a side sheet) */
function vHistory(parts) {
  if (parts[1] === 'c') return paneChange(parts[2], { cls: 'pane--fill' });
  return vDiets(['diets']);
}
