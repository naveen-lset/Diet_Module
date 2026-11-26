// js/diets.js — the Diet module, opened from Home › Modules › Diet. No bottom navigation:
// Diet (Diet wise | Species wise) → a species (its photo, the level chips, its diets) → one diet (the Figma Diet Details, with
// who certified it and its notes as the Kitchen & Diet web; its own history, Diet Info and Meal details in sheets).
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
  return `<a class="reqsum" href="#/requests" onclick="S.rTab='pending';S.rDept='diet'"><span class="reqsum__ic">${I('assignment')}</span><span class="grow"><b>My diet requests</b><span class="sub">${open.length ? `${open.length - delayed} waiting${delayed ? ` · ${delayed} delayed` : ''}` : 'None open'}</span></span><span class="cnt">${open.length}</span>${I('chevron_right', 20)}</a>`;
}
/* an approver's diet requests that wait on them, opening Help Desk on Diet (audit, 2 Nov) */
function approvalsRow() {
  if (!isApprover(me()) || !D.requests.some(r => isDiet(r) && r.approver === S.user)) return '';
  const wait = D.requests.filter(r => isDiet(r) && r.approver === S.user && isOpen(r)), delayed = wait.filter(r => r.state === 'delayed').length;
  return `<a class="reqsum" href="#/requests" onclick="S.rTab='pending';S.rDept='diet'"><span class="reqsum__ic">${I('how_to_reg')}</span><span class="grow"><b>Waiting for your approval</b><span class="sub">${wait.length ? `${wait.length - delayed} waiting${delayed ? ` · ${delayed} delayed` : ''}` : 'Nothing waiting'}</span></span><span class="cnt">${wait.length}</span>${I('chevron_right', 20)}</a>`;
}
/* a diet and its requests, on top of Overview (owner, 18 Nov: "the diet has to show changed info"; 19 Nov: approving applies it, the kitchen follows):
   - updated: a request approved in the last week changed this diet; the lines it changed are marked in the table;
   - on the way: a request waiting for the Dietician, an approved change that starts later, or an approved request in words for the kitchen. */
const CHANGE_DAYS = 7;
function dietChanged(d) {
  const h = changesIn({ dietId: d.id }).find(x => x.req && (x.lines || x.follows || x.created || x.skip));
  const r = h && by('requests', h.req), done = r && lastEv(r, 'approved');
  return done && h.at.slice(0, 10) >= addDays(TODAY, -CHANGE_DAYS) ? { h, r, done } : null;
}
const inWords = r => JOB_KINDS.includes(r.kind) && r.kind !== 'ask';
const touches = (r, a) => r.slot === a.id || r.base === a.diet || (r.ends || []).includes(a.id) || (r.kind === 'diet' && r.diet === a.diet) || (r.kind === 'skip' && targetsOf(r).some(t => samePlace(t, a)))
  || (inWords(r) && eatNow(targetsOf(r)).list.some(e => e.diet.id === a.diet));
const stillComing = r => isOpen(r) || (r.state === 'approved' && (inWords(r) ? lastEv(r, 'approved').at.slice(0, 10) >= addDays(TODAY, -CHANGE_DAYS) : phaseOf(r) === 'next'));
const dietComing = a => D.requests.filter(r => isDiet(r) && visibleTo(r, me()) && stillComing(r) && touches(r, a)).sort((x, y) => (lastAt(x) < lastAt(y) ? 1 : -1));
function changedCard({ h, r, done }) {
  const see = visibleTo(r, me());
  return `<button class="dchg pick" onclick="${see ? `go('#/requests/${r.id}')` : `changeSheet('${h.id}')`}"><span class="eav">${I('published_with_changes', 20)}</span><span class="dchg__t"><span class="dchg__top">${pill('positive', 'Updated')}<span>${fmtDay(h.at.slice(0, 10))} · ${r.id}</span></span><b>${esc(changeSummary(h))}</b><small>Approved by ${youName(done.by)}${h.reason ? ` · ${esc(h.reason)}` : ''}</small></span>${I('chevron_right', 20)}</button>`;
}
function comingCard(rs) {
  const r = rs[0], s = stateOf(r);
  const next = r.state === 'pending' ? (r.approver === S.user ? 'Waiting for your approval' : `Waiting for ${youName(r.approver)}`) : r.state === 'delayed' ? s.label : inWords(r) ? `Approved · for the kitchen · ${esc(((r.f && r.f.rows) || [])[0] ? r.f.rows[0][1] : '')}` : `Approved · in the diet ${r.kind === 'skip' ? dayText(r.date) : r.kind === 'end' ? `till ${fmtDay(r.stop)}` : `from ${dayText(r.start)}`}`;
  return `<a class="dchg pick" href="#/requests/${r.id}"><span class="eav">${I('pending_actions', 20)}</span><span class="dchg__t"><span class="dchg__top">${pill(isOpen(r) ? 'pending' : 'positive', isOpen(r) ? 'Requested' : 'Approved')}<span>${r.id} · ${youName(r.by)}</span></span><b>${esc(r.title)}</b><small>${next}${rs.length > 1 ? ` · ${plural(rs.length - 1, 'more request')}` : ''}</small></span>${I('chevron_right', 20)}</a>`;
}
/* the diet with the kitchen's update marked the Kitchen way (yellow with was …, NEW, stopped struck through), for a week after it changed */
function markedGroups(d, h, day, click) {
  const L = h.lines || [];
  return d.meals.map(m => {
    const rows = m.items.filter(l => fedOn(l, day)).map(l => { const c = L.find(x => x.feed === m.feed && x.op !== 'remove' && x.now && x.now.item === l.item);
      /* a diet given by bands keeps its band amounts on a changed line: now as the diet has them, was in the same proportion */
      return { ...(c ? lineRow(l.bq && c.was ? { ...c.was, bq: scaleBq(l, c.was) } : c.was, { ...histChange(c), ...(l.bq ? { bq: l.bq } : {}) }) : lineRow(l)), click: click ? `${click}('${d.id}',${m.feed},${l.item})` : '' }; });
    L.filter(x => x.feed === m.feed && x.op === 'remove' && fedOn(x.was, day)).forEach(x => rows.push(lineRow(x.was, { op: 'remove' })));
    return { feed: m.feed, rows };
  }).filter(g => g.rows.length);
}
/* the Diet module's three tabs (owner, 26 Nov 2026: Help Desk moves into Diet; every request is raised and followed here) */
const openReqs = () => D.requests.filter(r => isDiet(r) && visibleTo(r, me()) && isOpen(r) && (r.by === S.user || r.approver === S.user)).length;
const dietTabs = cur => `<div class="az-tabs" role="tablist">${thumb(true)}${[['species', 'Species Wise'], ['diets', 'Diet Wise'], ['requests', 'Requests']].map(([k, l]) => `<button class="az-tab" role="tab" aria-selected="${cur === k}" onclick="homeTab('${k}')">${l}${k === 'requests' && openReqs() ? `<span class="tabn">${openReqs()}</span>` : ''}</button>`).join('')}</div>`;
/* switching tabs keeps them pinned if they were, and shows the new list from its start */
function homeTab(k) {
  if (k === 'requests') { go('#/requests'); swapFx('.pane--home .list'); return; }
  const b = document.querySelector('.pane--home .pane__body'), r = b && b.querySelector('.reqsum, .dstats');
  if (b) b.scrollTop = Math.min(b.scrollTop, r ? r.offsetHeight : 0);
  S.land = k; go('#/diets'); swapFx('.pane--home .list');
}
/* one diet in the Diet wise list: a diet avatar, its name, its kind, how many species get it, and its ID */
function dietRow(a, current) {
  const d = diet(a.diet), n = new Set(usesOf(d.id).map(u => u.sp)).size;
  return `<a class="sprow dietrow pick" href="#/diets/${a.sp}/${a.id}"${current ? ' aria-current="true"' : ''}><span class="davatar">${I('restaurant')}</span><span class="sprow__t"><b>${esc(d.name)}</b><span class="sub">${esc(tcase(slotKind(a)))}</span><span class="dfoot"><span class="dfoot__n">${n} species</span><span class="did">${esc(d.id)}</span></span></span></a>`;
}
/* the filters, in one sheet (the design system's Search and filter): Diet wise = kind + certification; Species wise = class + diet status */
const FILTERS = {
  diets: [['dKind', 'Kind', () => [['all', 'All Kinds'], ...KINDS.map(k => [k, tcase(k)])], v => dietsFor(v, S.dCert).length],
    ['dCert', 'Certification', () => [['all', 'All'], ['cert', 'Certified'], ['uncert', 'Uncertified']], v => dietsFor(S.dKind, v).length]],
  species: [['spCls', 'Class', () => [['all', 'All Classes'], ...CLASSES.map(c => [c, c]), ['Other', 'Other']], v => speciesFor(S.spTab, v).length],
    ['spTab', 'Diet Status', () => [['all', 'All'], ['cert', 'Certified'], ['uncert', 'Uncertified'], ['without', 'No Diet']], v => speciesFor(v, S.spCls).length]],
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
/* the stats card above the tabs (owner, 20 Nov 2026: option B of the Figma mockup), as Lab and Mortality open in the Antz Figma:
   species with animals here, diets in use here, and how many of those are certified. Each number opens its list */
function dietStats() {
  const sps = D.species.filter(s => spAnimals(s.id, S.site).length).length;
  const ids = [...new Set(D.assigns.filter(a => !ended(a) && atSite(a, S.site) && spAnimals(a.sp, S.site).length).map(a => a.diet))], cert = ids.filter(id => diet(id).cert).length;
  const cell = (n, l, cls, js) => `<button class="dstats__c" onclick="${js}"><b class="${cls}">${n}</b><span>${l}</span></button>`;
  const dw = c => `S.dCert='${c}';S.dKind='all';homeTab('diets')`;
  return `<div class="dstats" role="group" aria-label="Diets at ${esc(siteName())}">${cell(sps, 'Species', 'c1', "S.spTab='all';S.spCls='all';homeTab('species')")}${cell(ids.length, ids.length === 1 ? 'Diet' : 'Diets', '', dw('all'))}${cell(cert, 'Certified', 'c2', dw('cert'))}${cell(ids.length - cert, 'Uncertified', 'c3', dw('uncert'))}</div>`;
}
/* the page scrolls as one: the stats card, search and chips go up with the list; Diet Wise | Species Wise stays pinned under the top bar */
function paneDietHome({ cls = '', cur = null } = {}) {
  const tab = S.land, top = topbar({ back: '#/home', title: 'Diet', site: true, end: whoBtn() }), head = dietStats() + dietTabs(tab);   /* owner, 18 Nov: no request rows above the tabs (requests live in Help Desk); 20 Nov: the stats card goes there */
  const chips = (key, opts, count) => `<div class="az-chips" role="tablist">${opts.map(([k, l]) => `<button class="az-chip" role="tab" aria-selected="${S[key] === k}" onclick="S.${key}='${k}';render();swapFx('.pane .list')">${l} - ${count(k)}</button>`).join('')}</div>`;
  if (tab === 'diets') {
    const search = `<div class="az-searchrow"><label class="az-search">${I('search', 20)}<input id="d-q" placeholder="Search diet, species, place or ID" value="${esc(S.dQ)}" oninput="S.dQ=this.value;render()" aria-label="Search diets"></label></div>`;
    const list = dietsFor(S.dKind), on = (by('assigns', cur) || {}).diet, rows = list.map(a => dietRow(a, !!cur && on === a.diet)).join('');
    const none = S.dQ.trim() && !dietsFor(S.dKind, 'all').length;
    return pane(`${cls} pane--home`, top, head + search + chips('dKind', [['all', 'All'], ...KINDS.map(k => [k, tcase(k)])], k => dietsFor(k).length)
      + `<div class="body">${none ? '' : listToggle('dCert', [['all', 'All'], ['cert', 'Certified'], ['uncert', 'Uncertified']])}<div class="list list--8">${rows || (none ? noMatch(S.dQ, "S.dQ=''") : empty1('No diet here'))}</div></div>`, '', 'home');
  }
  const search = `<div class="az-searchrow"><label class="az-search">${I('search', 20)}<input id="sp-q" placeholder="Search species or taxonomy ID" value="${esc(S.spQ)}" oninput="S.spQ=this.value;render()" aria-label="Search species"></label></div>`;
  const list = speciesFor(S.spTab), clsChips = chips('spCls', [['all', 'All'], ...CLASSES.map(c => [c, c]), ['Other', 'Other']], c => speciesFor(S.spTab, c).length);
  /* a species card: photo, name, scientific name, and its diet count big in a tile (no animal count: owner, 18 Nov) */
  const none = S.spQ.trim() && !speciesFor('all', 'all').length;
  const rows = list.length ? list.map(s => { const all = slotsOf(s.id).length;
    return speciesRow(s, { href: `#/diets/${s.id}`, current: cur === s.id, big: true,
      end: `<span class="sprow__n${all ? '' : ' sprow__n--none'}"><b>${all ? activeDiets(s.id) : 0}</b><span>${all && activeDiets(s.id) === 1 ? 'Diet' : 'Diets'}</span></span>` }); }).join('') : none ? noMatch(S.spQ, "S.spQ=''") : empty1('No species here');
  return pane(`${cls} pane--home`, top, head + search + clsChips + `<div class="body">${none ? '' : listToggle('spTab', [['all', 'All'], ['cert', 'Certified'], ['uncert', 'Uncertified'], ['without', 'No Diet']])}<div class="list list--8">${rows}</div></div>`, '', 'home');
}

/* a search that finds nothing says so, with a way back (audit, 2 Nov) */
const noMatch = (q, clear) => `<div class="empty1"><div>No match for “${esc(q.trim())}”<button class="az-btn az-btn--outline empty1__btn" onclick="${clear};render()">Clear Search</button></div></div>`;

/* ---------- a species: its photo, facts, the level chips, then the diets or places of that level ---------- */
const lvlOf = sp => { const l = S.lvl[sp] || 'species'; return levelsOf(sp).includes(l) ? l : 'species'; };
/* the species header as the Antz app's species page (owner, 18 Nov): dark, "Species", the name and the scientific name,
   then Population · Sites · Sections · Enclosures big in one box (counted for the site picked). The phone's sheet closes with ×.
   No "Who eats what" line under it (owner, 18 Nov: removed); the level chips follow straight after */
function spHead(sp, close = '') {
  const as = spAnimals(sp.id, S.site), n = k => new Set(as.map(a => pathOfAnimal(a)[k])).size;
  const stats = [[as.length, 'Population'], [n('site'), n('site') === 1 ? 'Site' : 'Sites'], [n('section'), n('section') === 1 ? 'Section' : 'Sections'], [n('enclosure'), n('enclosure') === 1 ? 'Enclosure' : 'Enclosures']];
  return `<div class="sphd">${close ? `<div class="sphd__bar"><button class="az-iconbtn" onclick="${close}" aria-label="Close">${I('close')}</button></div>` : ''}<span class="sphd__k">Species</span><b class="sphd__n">${esc(sp.name)}</b><i class="sphd__s">${esc(sp.sci)}</i>
    <div class="sphd__stats">${stats.map(([v, l]) => `<span><b>${v}</b><small>${l}</small></span>`).join('')}</div></div>`;
}
/* a species has two tabs (owner, 26 Nov 2026): its Diets, and its Version History (js/versions.js) */
const spViewTabs = spId => `<div class="az-tabs sptabs" role="tablist">${thumb(true)}${[['diets', 'Diets'], ['hist', 'Version History']].map(([k, l]) => `<button class="az-tab" role="tab" aria-selected="${(S.spView || 'diets') === k}" onclick="S.spView='${k}';render()">${l}</button>`).join('')}</div>`;
function speciesParts(spId, cur) {
  if (S.spView === 'hist') return { chips: spViewTabs(spId), body: versionsTab(spId) };
  const p = speciesParts0(spId, cur); return { chips: spViewTabs(spId) + p.chips, body: p.body };
}
function speciesParts0(spId, cur) {
  const l = lvlOf(spId);
  if (!slotsOf(spId).length) return { chips: '', body: `<div class="empty1"><div>No diet added for ${esc(species(spId).name)}${canRaise(me()) ? `<button class="az-btn empty1__btn" onclick="go('#/new?dept=diet&sp=${spId}&kind=new')">${I('add_circle')}Request A Diet</button>` : ''}</div></div>` };
  /* one line that scrolls sideways (owner, 19 Nov 2026: "make it horizontal scroll") */
  const chips = `<div class="az-chips az-chips--lvl" role="tablist" aria-label="Level">${levelsOf(spId).map(k => `<button class="az-chip" role="tab" aria-selected="${l === k}" onclick="pickLevel(${spId},'${k}')">${LEVEL[k]} - ${dietCount(spId, k, S.site)}</button>`).join('')}</div>`;
  let body;
  if (l === 'species') {
    const list = slotsOf(spId).filter(a => a.level === 'species'), gone = endedOf(spId);
    body = (list.length ? `<div class="dcards">${list.map(a => dietCard(a, { current: cur === a.id })).join('')}</div>` : `<div class="nodiet">No diet added</div>`)
      /* ended diets open in place, not as a second sheet over the species sheet (design system: a sheet never opens another sheet) */
      + (gone.length ? `<button class="cap lnk" aria-expanded="${S.endOpen === spId}" onclick="S.endOpen=S.endOpen===${spId}?null:${spId};render()">Ended diets - ${gone.length}${I(S.endOpen === spId ? 'expand_less' : 'expand_more', 20)}</button>`
        + (S.endOpen === spId ? `<div class="dcards">${gone.map(a => dietCard(a, { current: cur === a.id })).join('')}</div>` : '') : '');
  } else if (l === 'animal') {
    const all = placesAt(spId, 'animal', S.site), withD = all.filter(p => p.diets.length), rest = all.length - withD.length;
    const shown = S.animAll ? all : withD, q = S.aQ.trim().toLowerCase();
    const list = shown.filter(p => !q || animalName(p.animal).toLowerCase().includes(q) || String(p.id).includes(q) || by('enclosures', p.animal.enc).name.toLowerCase().includes(q));
    const search = S.animAll ? `<label class="az-search az-search--card">${I('search', 20)}<input id="a-q" placeholder="Search animal ID, name or enclosure" value="${esc(S.aQ)}" oninput="S.aQ=this.value;render()" aria-label="Search animals"></label>` : '';
    body = search + list.map(p => animalCard(p.animal, p.diets.length ? p.diets.map(a => placeDietRow(a, cur === a.id)).join('') : '<div class="place__none">No diet added</div>')).join('')
      + (!withD.length && !S.animAll ? `<div class="nodiet">No animal has its own diet</div>` : '')
      + (rest ? `<button class="restline" onclick="S.animAll=!S.animAll;S.aQ='';render()"><span>${S.animAll ? `Showing all ${plural(all.length, 'animal')}` : `No animal diet · ${plural(rest, 'other animal')}${all.filter(p => !p.diets.length).every(p => currentDiet({ sp: spId, level: 'animal', ref: p.id })) ? ' eat a wider diet' : ''}`}</span><b>${S.animAll ? 'Show Fewer' : 'Show All'}</b></button>` : '');
  } else {
    const list = placesAt(spId, l, S.site), withD = list.filter(p => p.diets.length), none = list.filter(p => !p.diets.length);
    body = withD.map(p => placeCard(p, cur)).join('') + (!withD.length ? `<div class="nodiet">No ${LEVEL[l].toLowerCase()} diet</div>` : '')
      + (none.length && withD.length ? `<div class="restline restline--static"><span>No ${LEVEL[l].toLowerCase()} diet</span><span class="sub">${none.map(p => esc(p.name)).join(', ')}</span></div>` : '');
  }
  return { chips, body };
}
/* the iPad's species column */
function paneSpecies(spId, { cls = '', cur = null } = {}) {
  const sp = species(spId), p = speciesParts(spId, cur);
  return pane(cls + (spFab(spId) ? ' has-fab' : ''), spHead(sp) + p.chips, `<div class="body">${p.body}</div>`, '', `sp-${spId}`).replace(/<\/section>$/, `${spFab(spId)}</section>`);
}
/* Raise request from a species: the request starts with it, whole species (a species without a diet has its own button) */
const spFab = spId => canRaise(me()) && slotsOf(spId).length ? `<button class="az-fab az-fab--pill dfab" onclick="SG=null;go('#/suggest?sp=${spId}')">${I('edit_note')}<span class="dfab__t">Suggest A Change</span></button>` : '';
/* the phone's species: a bottom sheet over Diet, with the species header */
function speciesSheet(spId) {
  const sp = species(spId), p = speciesParts(spId, null);
  return `<div class="az-scrim" onclick="if(event.target===this)go('#/diets')"><section class="spsheet" role="dialog" aria-modal="true" aria-label="${esc(sp.name)}" data-k="sps-${spId}">${spHead(sp, "go('#/diets')")}${p.chips}<div class="spsheet__body"><div class="body">${p.body}</div></div>${spFab(spId)}</section></div>`;
}
function pickLevel(sp, l) { S.lvl[sp] = l; S.aQ = ''; render(); }

/* ---------- one diet: the Figma Diet Details (photo header, day pills, the table), with who certified it and its notes as the web ---------- */
/* certification as the Kitchen & Diet web: the dietitian who certified it; when none has, the kitchen's certification */
/* both certifications in one row (owner): the dietitian's and the kitchen's, each certified (who, when) or not */
function certLine(d) {
  const tile = (icon, tone, cap, who, when) => `<div class="cert cert--${tone}">${I(icon, 22, true)}<span><small>${cap}</small><b>${who}</b>${when ? `<small>${when}</small>` : ''}</span></div>`;
  return `<div class="certs certs--2">${d.cert ? tile('verified', 'ok', 'Certified Dietitian', esc(user(d.cert.by).name), fmtDayY(d.cert.at)) : tile('gpp_maybe', 'bad', 'Dietitian', 'Not certified', '')}${d.kcert ? tile('soup_kitchen', 'ok', 'Certified by Kitchen', esc(user(d.kcert.by).name), fmtDayY(d.kcert.at)) : tile('soup_kitchen', 'none', 'Kitchen', 'Not certified', '')}</div>`;
}
/* the notes under the table, as the web: Kitchen Note, Site Note; then Remark (highlighted) and Change Reason */
function notesBlock(d) {
  const rows = [['Kitchen Note', esc(d.note)], ['Site Note', esc(d.site)]].filter(r => r[1]);
  const why = d.reason ? `${esc(d.reason)}${d.remarks ? `<i>${esc(d.remarks)}</i>` : ''}` : '';
  if (!rows.length && !d.remark && !why) return '';
  return `<div class="notes">${rows.map(([k, v]) => `<div class="notes__r"><span>${k}</span><p>${v}</p></div>`).join('')}
    ${d.remark ? `<div class="notes__r notes__r--remark"><span>Remark</span><p>${esc(d.remark)}</p></div>` : ''}${why ? `<div class="notes__r"><span>Change Reason</span><p>${why}</p></div>` : ''}</div>`;
}
/* the diet header's wallpaper: hand-drawn food and animal doodles packed close on a soft tint, as WhatsApp's chat background, in place of the
   species photo (owner, 2 Nov). Thin line drawings on a 24 grid in three sizes; one 260 px tile, built once: each doodle is dropped at random and
   kept where it doesn't touch the others, then copied over the edges so the tile joins with no seam. Small rings, dots and stars fill the gaps */
const DOODLES = {
  apple: '<path d="M12 7.2c-2-1.5-5.8-1-6.4 2.6-.6 3.8 1.8 8.2 4.1 8.2.9 0 1.4-.5 2.3-.5s1.4.5 2.3.5c2.3 0 4.7-4.4 4.1-8.2C17.8 6.2 14 5.7 12 7.2z"/><path d="M12 7.2c0-1.5.5-2.7 1.6-3.4"/><path d="M12.9 5.1c1.4-.3 2.6.3 3.2 1.3-1.4.4-2.6-.1-3.2-1.3z"/>',
  carrot: '<path d="M16.5 7.5c-3 0-9.6 6.8-11.5 12 5.2-1.9 12-8.5 12-11.5z"/><path d="M9 13.2l1.6 1.6M11.6 10.8l1.4 1.4M7.2 16.4l1.3 1.3"/><path d="M16.5 7.5l1-4M16.5 7.5l3.8-1.6M16.5 7.5l4 1"/>',
  banana: '<path d="M4.5 14.5c3.6 3.6 10.2 3 13.6-3.4.7-1.3.8-2.7.6-3.6"/><path d="M4.5 14.5c4.4.9 9.6-1.4 12.6-6.6"/><path d="M18.7 7.5l.9-1.7M4.5 14.5l-1.1.4"/>',
  fish: '<path d="M4 12c2.4-3.6 8.6-5 12.4 0-3.8 5-10 3.6-12.4 0z"/><path d="M16.4 12l4-3.2v6.4z"/><path d="M9.8 9.4c.9 1.6.9 3.6 0 5.2"/><circle cx="7.3" cy="11.3" r=".6"/>',
  egg: '<path d="M12 4c3 0 5.4 4.6 5.4 8.5S15 19.6 12 19.6s-5.4-3.2-5.4-7.1S9 4 12 4z"/><path d="M9.6 9.2c.4-1.1 1-2 1.7-2.5"/>',
  leaf: '<path d="M5 19C5 10.5 10.6 5 19 5c0 8.4-5.5 14-14 14z"/><path d="M5 19l8.4-8.4M9.6 14.4l-.2-3M12 12l3 .2"/>',
  paw: '<circle cx="6.8" cy="10.4" r="1.6"/><circle cx="10.2" cy="7.2" r="1.6"/><circle cx="14.2" cy="7.2" r="1.6"/><circle cx="17.6" cy="10.4" r="1.6"/><path d="M8.6 16.6c0-2.6 1.6-4.6 3.6-4.6s3.6 2 3.6 4.6c0 1.6-1.4 2.2-2.3 1.8-.9-.4-1.8-.4-2.6 0-.9.4-2.3-.2-2.3-1.8z"/>',
  bone: '<path d="M8.2 10.2h7.6M8.2 13.8h7.6"/><circle cx="6.6" cy="9.8" r="1.8"/><circle cx="6.6" cy="14.2" r="1.8"/><circle cx="17.4" cy="9.8" r="1.8"/><circle cx="17.4" cy="14.2" r="1.8"/>',
  grapes: '<circle cx="10" cy="9.4" r="1.8"/><circle cx="14" cy="9.4" r="1.8"/><circle cx="8" cy="12.8" r="1.8"/><circle cx="12" cy="12.8" r="1.8"/><circle cx="16" cy="12.8" r="1.8"/><circle cx="10" cy="16.2" r="1.8"/><circle cx="14" cy="16.2" r="1.8"/><circle cx="12" cy="19.4" r="1.6"/><path d="M12 7.6V4.2M12 5.4c1.4-1.4 3.4-1.4 4.4-.4-1.4 1.4-3.4 1.4-4.4.4z"/>',
  melon: '<path d="M4 9.5a8 8 0 0 0 16 0z"/><path d="M6.6 9.5a5.4 5.4 0 0 0 10.8 0"/><path d="M10 12.4v.8M12 13.6v.8M14 12.4v.8"/>',
  corn: '<path d="M12 4.2c2.3 0 3.6 3.4 3.6 7.6s-1.3 7.6-3.6 7.6-3.6-3.4-3.6-7.6S9.7 4.2 12 4.2z"/><path d="M12 4.6v14.6M8.7 9h6.6M8.5 12.6h7M8.8 16.2h6.4"/><path d="M8.6 14.4c-1.8.8-2.8 2.6-2.8 5.4 1.8 0 3.4-.8 4.4-2.4M15.4 14.4c1.8.8 2.8 2.6 2.8 5.4-1.8 0-3.4-.8-4.4-2.4"/>',
  bowl: '<path d="M4 11.4h16c0 4.4-3.6 7.6-8 7.6s-8-3.2-8-7.6z"/><path d="M9.6 8.6c-.6-.8.6-1.6 0-2.6M12.6 8.6c-.6-.8.6-1.6 0-2.6M8 19.4h8"/>',
  drop: '<path d="M12 4c2.8 3.8 5 6.6 5 9.4a5 5 0 0 1-10 0C7 10.6 9.2 7.8 12 4z"/><path d="M9.6 13.6c0 1.2.8 2.2 1.8 2.4"/>',
  feather: '<path d="M18.4 4.4C10.6 5.4 6.4 11 6 19.6"/><path d="M18.4 4.4c-.8 6-4.8 10.2-10.4 11.2M11.2 10.4l-2.6-.6M13.6 7.8l-2.4-.8M14.2 12.4l-1.4 1.8"/>',
  peas: '<path d="M4 15.2c4-6 11-8 16-7-3 6-10 9-16 7z"/><circle cx="9" cy="13.4" r="1.3"/><circle cx="12.4" cy="11.8" r="1.3"/><circle cx="15.8" cy="10.4" r="1.3"/>',
  worm: '<path d="M4.4 14.2c1.4-2.8 3.4-2.8 4.8 0s3.4 2.8 4.8 0 3.4-2.8 4.8 0"/><circle cx="19.6" cy="13.4" r="1.2"/><path d="M6.8 11.4v1.2M11.6 15.6v1.2M16.4 11.4v1.2"/>',
  cherry: '<circle cx="8" cy="16.4" r="2.8"/><circle cx="16" cy="17.2" r="2.8"/><path d="M8 13.6c1-3.8 3-6.8 6-9M16 14.4c-.4-3.8-1-6.8-2-9.8M14 4.6c1.4-.6 3 0 4 1-1.4.6-3 .4-4-1z"/>',
  seed: '<path d="M12 4.4c2.6 1.8 3.8 4.6 3.8 7.6S14.6 18 12 19.6C9.4 18 8.2 15 8.2 12S9.4 6.2 12 4.4z"/><path d="M12 7.6v8.8"/>',
  tortoise: '<path d="M4.4 15.4c0-4.4 3.4-7.6 7.6-7.6s7.6 3.2 7.6 7.6z"/><path d="M8 15.4l1.6-3.6h4.8l1.6 3.6M9.6 11.8 12 8.1l2.4 3.7"/><path d="M19.6 14c1.2-.4 2.4.2 2.6 1.4-.8.6-1.8.6-2.6.1"/><path d="M6.6 15.4v2.4M10 15.4v2.4M14 15.4v2.4M17.4 15.4v2.4"/>',
  bird: '<path d="M5.6 13.6c0-3 2.6-5 5.6-5 1 0 1.8-1 1.8-2.4S14 3.8 15.4 3.8s2.4 1 2.4 2.4c0 .8-.3 1.4-.8 1.9l2.4.8-2.4.8c-.6 2.6-1 4.4-2.8 5.8-1.6 1.2-3.6 1.4-5.6 1.4-1.8 0-3-1.4-3-3.3z"/><path d="M10 17.1v3.3M13.6 17.1v3.3M8.6 20.4h2.8M12.2 20.4h2.8M8.4 12.4c1.4.4 3 .2 4.4-.8"/><circle cx="15.6" cy="6" r=".5"/>',
  monkey: '<circle cx="12" cy="12" r="6"/><circle cx="5" cy="11.4" r="2"/><circle cx="19" cy="11.4" r="2"/><path d="M8.6 13.4c0-2 1.5-3.2 3.4-3.2s3.4 1.2 3.4 3.2-1.5 3.4-3.4 3.4-3.4-1.4-3.4-3.4z"/><circle cx="10.2" cy="9.6" r=".5"/><circle cx="13.8" cy="9.6" r=".5"/><path d="M11 14.4c.6.5 1.4.5 2 0"/>',
  rabbit: '<path d="M9.4 9.6C8.4 6 8.4 3 9.8 3s2 3 1.6 6.4M14.6 9.6C15.6 6 15.6 3 14.2 3s-2 3-1.6 6.4"/><path d="M6.8 14.8c0-3 2.3-5.2 5.2-5.2s5.2 2.2 5.2 5.2-2.3 5.2-5.2 5.2-5.2-2.2-5.2-5.2z"/><circle cx="10.2" cy="13.6" r=".5"/><circle cx="13.8" cy="13.6" r=".5"/><path d="M11.2 15.8h1.6l-.8.8z"/>',
  butterfly: '<path d="M12 8.4v9.2M12 10.2C10 6.2 5 5.2 5 9.2s4 4 7 3M12 10.2c2-4 7-5 7-1s-4 4-7 3M12 13.2c-2 0-5 1-5 4s3 2 5-1M12 13.2c2 0 5 1 5 4s-3 2-5-1M12 8.4l-1.4-2.4M12 8.4l1.4-2.4"/>',
  pineapple: '<path d="M12 9c3 0 4.6 2.6 4.6 5.6S15 20.2 12 20.2s-4.6-2.6-4.6-5.6S9 9 12 9z"/><path d="M9.2 12.2l5.6 5.6M14.8 12.2l-5.6 5.6"/><path d="M12 9V5.4M12 7.2 9.4 4.8M12 7.2l2.6-2.4M12 5.8l-1.4-2.6M12 5.8l1.4-2.6"/>',
  strawberry: '<path d="M12 8c3.4 0 6 1.2 6 3.8 0 3.6-3.4 8.2-6 8.2s-6-4.6-6-8.2C6 9.2 8.6 8 12 8z"/><path d="M9 8.2l1.4-2.6L12 7.4l1.6-1.8L15 8.2M9.4 12v.6M12 14v.6M14.6 12v.6M10.6 16.4v.6M13.4 16.4v.6"/>',
  broccoli: '<path d="M10.4 20v-5.6M13.6 20v-5.6M10.4 20h3.2"/><path d="M7 14.4a2.8 2.8 0 0 1 .8-5.4 3.2 3.2 0 0 1 5.6-2 2.8 2.8 0 0 1 4.6 2.2 2.6 2.6 0 0 1-1 5.2z"/>',
  scale: '<path d="M5 19.4h14l-1.6-8.2H6.6z"/><circle cx="12" cy="15.2" r="2.2"/><path d="M12 15.2l1.2-1.2M8 11.2V9.2h8v2M12 9.2V7.4"/>',
  clock: '<circle cx="12" cy="12" r="7.4"/><path d="M12 7.8V12l3 2M12 4.6V3.4M10.6 3.4h2.8"/>',
  cutlery: '<path d="M8 4v6.4c0 1-.8 1.8-1.8 1.8M8 4v6.4c0 1 .8 1.8 1.8 1.8M8 12.2V20M6.2 4v5M9.8 4v5"/><path d="M16 4c1.8 0 2.8 2 2.8 4.2S17.6 12 16 12s-2.8-1.6-2.8-3.8S14.2 4 16 4zM16 12v8"/>',
  cricket: '<path d="M6.6 13c0-2.4 2.2-4 5-4s5 1.6 5 4-2.2 3.6-5 3.6-5-1.2-5-3.6z"/><circle cx="18.4" cy="11.4" r="1.6"/><path d="M19.6 10.2c1-1.4 1.6-3 1.6-4.6M18.8 9.9c0-1.6-.4-3-1.4-4.2M8.6 16l-2 3M11.6 16.6v2.8M14.6 16l2 3M8 10.2 5.6 7.8"/>',
  snail: '<path d="M3.6 18.2h12.6c2.4 0 3.8-1.6 3.8-3.6"/><path d="M14 18.2a5 5 0 1 0-5-5c0 2 1.6 3.6 3.6 3.6s3.4-1.6 3.4-3.6-1.4-2.6-2.6-2.6-2 1-2 2"/><path d="M18.6 14.8c.2-1.6.8-3 1.6-4M19.8 14.4c.6-1 1.4-1.6 2.2-1.8"/>',
  hay: '<path d="M4 19.4h16M7 19.4c0-4 1-7 3-9M11 19.4c0-5 1-9 3-12M15 19.4c0-3 1-6 3-7M9.6 19.4c-.4-3-1.6-5-3.6-6"/>',
  flower: '<circle cx="12" cy="12" r="2.6"/><path d="M12 9.4c-1.6-1.8-1.6-4 0-5.4 1.6 1.4 1.6 3.6 0 5.4zM12 14.6c-1.6 1.8-1.6 4 0 5.4 1.6-1.4 1.6-3.6 0-5.4zM9.4 12c-1.8-1.6-4-1.6-5.4 0 1.4 1.6 3.6 1.6 5.4 0zM14.6 12c1.8-1.6 4-1.6 5.4 0-1.4 1.6-3.6 1.6-5.4 0z"/>',
};
const DOODLE_FILL = {
  ring: '<circle cx="12" cy="12" r="5"/>', dot: '<circle cx="12" cy="12" r="2.4"/>', plus: '<path d="M12 7v10M7 12h10"/>',
  star: '<path d="M12 5l2 4.4 4.8.5-3.6 3.2 1 4.7-4.2-2.4-4.2 2.4 1-4.7-3.6-3.2 4.8-.5z"/>', spark: '<path d="M12 4c.6 4.4 3.6 7.4 8 8-4.4.6-7.4 3.6-8 8-.6-4.4-3.6-7.4-8-8 4.4-.6 7.4-3.6 8-8z"/>',
  heart: '<path d="M12 18s-6-3.6-6-7.6C6 8 7.6 6.6 9.4 6.6c1.2 0 2.1.6 2.6 1.5.5-.9 1.4-1.5 2.6-1.5 1.8 0 3.4 1.4 3.4 3.8 0 4-6 7.6-6 7.6z"/>', wave: '<path d="M4 12c2-3 4-3 6 0s4 3 6 0 3-2 4-1"/>',
};
/* as WhatsApp's dark wallpaper, some shapes are filled among the outlines */
const FILLED = ['heart', 'leaf', 'paw', 'drop', 'flower', 'star', 'dot', 'strawberry', 'apple', 'egg', 'cherry'];
let DOODLE_SVG = '';
function doodleSvg() {
  if (DOODLE_SVG) return DOODLE_SVG;
  const W = 260, pts = [], big = ['tortoise', 'bird', 'monkey', 'rabbit', 'butterfly', 'pineapple', 'broccoli', 'scale', 'fish', 'bowl', 'melon', 'corn', 'grapes', 'cherry', 'banana', 'carrot', 'apple', 'snail'];
  const mid = Object.keys(DOODLES).filter(k => !big.includes(k)), small = Object.keys(DOODLE_FILL); let seed = 9;
  const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647, pick = a => a[Math.floor(rnd() * a.length)];
  const gap = (a, b) => Math.min(Math.abs(a - b), W - Math.abs(a - b)), free = (x, y, sz, pad) => pts.every(p => Math.hypot(gap(p.x, x), gap(p.y, y)) > (p.sz + sz) / 2 + pad);
  /* big first, then medium, then small fillers until no gap is left, as WhatsApp's wallpaper */
  /* the drawings are smaller than their boxes, so the boxes may overlap a little (a negative pad) and the drawings still don't touch */
  [[big, 32, 8, 22, -3, 20], [mid, 21, 7, 220, -3, 20], [small, 6, 5, 900, 0, 180]].forEach(([set, min, span, n, pad, tilt]) => {
    for (let k = 0, got = 0; k < 30000 && got < n; k++) { const sz = min + rnd() * span, x = rnd() * W, y = rnd() * W;
      if (free(x, y, sz, pad)) { const g = pick(set); pts.push({ x, y, sz, r: Math.round((rnd() - .5) * tilt * 2), g, f: FILLED.includes(g) && rnd() < .5 }); got++; } }
  });
  const use = (p, x, y) => `<use${p.f ? ' class="f"' : ''} href="#dd-${p.g}" x="${(x - p.sz / 2).toFixed(1)}" y="${(y - p.sz / 2).toFixed(1)}" width="${p.sz.toFixed(1)}" height="${p.sz.toFixed(1)}"${p.r ? ` transform="rotate(${p.r} ${x.toFixed(1)} ${y.toFixed(1)})"` : ''}/>`;
  const all = pts.flatMap(p => [-W, 0, W].flatMap(dx => [-W, 0, W].map(dy => [p.x + dx, p.y + dy])).filter(([x, y]) => x > -p.sz && x < W + p.sz && y > -p.sz && y < W + p.sz).map(([x, y]) => use(p, x, y))).join('');
  /* one line weight whatever the doodle's size */
  const syms = Object.entries({ ...DOODLES, ...DOODLE_FILL }).map(([k, v]) => `<symbol id="dd-${k}" viewBox="0 0 24 24">${v.replace(/<(path|circle)/g, '<$1 vector-effect="non-scaling-stroke"')}</symbol>`).join('');
  return (DOODLE_SVG = `<svg class="dhead__dd" aria-hidden="true"><defs>${syms}<pattern id="dd-food" width="${W}" height="${W}" patternUnits="userSpaceOnUse"><g class="dhead__ddg">${all}</g></pattern></defs><rect width="100%" height="100%" fill="url(#dd-food)"/></svg>`);
}
/* Diet Details in tabs (owner, 2 Nov): what to feed; what it gives; where it is used; what happened to it */
const DTABS = [['ov', 'Overview'], ['nu', 'Nutrition'], ['ap', 'Applied To'], ['hi', 'History']];
function paneDiet(asgId, { cls = '', back = '', wide = isTab() } = {}) {
  const a = by('assigns', asgId);
  if (!a) return pane(cls, '', empty1('Diet not found'));
  const d = diet(a.diet), [tone, state] = dietStatus(a), when = !ended(a) && !a.group ? slotWhen(a) : '';
  if (S.dTabFor !== asgId) { S.dTab = 'ov'; S.dTabFor = asgId; }
  /* Back returns to the screen the diet was opened from; `back` is where to go when there is none (a link, a reload) */
  const lead = back ? `<button class="az-iconbtn" onclick="goBack('${back}')" aria-label="Back">${I('arrow_back')}</button>` : '';
  const head = `<div class="dhead dhead--doodle">${doodleSvg()}<div class="dhead__bar">${lead}<b>Diet Details</b>${iconBtn('picture_as_pdf', 'Diet PDF', `dietPdf('${a.id}')`)}${iconBtn('info', 'Diet Info', `dietInfoSheet('${a.id}')`)}</div>
    <div class="dhead__card"><span class="davatar">${I('restaurant')}</span><span class="dhead__t"><span class="dhead__name">${esc(d.name)}</span><span class="dhead__sub">Diet type : <b>${esc(slotKind(a))}${a.group ? ` · ${esc(a.group.label)}` : ''}</b>${when ? ` · ${esc(when)}` : ''}</span>
    <span class="dhead__tags">${pill(tone, state)}</span></span></div></div>`;
  const tabs = `<div class="az-tabs dtabs" role="tablist">${thumb(true)}${DTABS.map(([k, l]) => `<button class="az-tab" role="tab" aria-selected="${S.dTab === k}" onclick="S.dTab='${k}';render()">${l}</button>`).join('')}</div>`;
  /* the day switch: the design system's segmented control, right above the table it changes and pinned while the table scrolls (audit, 2 Nov) */
  const days = true ? `<div class="dayseg"><div class="az-seg" role="tablist" aria-label="Day">${thumb()}${[[null, 'Full Week'], ...DAYS.map((x, i) => [i, x[0]])].map(([i, l]) => `<span role="tab" tabindex="0" class="${i == null ? 'wide' : ''}" aria-selected="${S.day === i}" aria-label="${i == null ? 'Full Week' : DAYS[i]}" onclick="S.day=${i};render();swapFx('.dtable')" onkeydown="if(event.key==='Enter'){S.day=${i};render();swapFx('.dtable')}">${l}</span>`).join('')}</div></div>` : '';
  const chg = ended(a) ? null : dietChanged(d), coming = ended(a) ? [] : dietComing(a);
  const groups = chg && (chg.h.lines || []).length ? markedGroups(d, chg.h, S.day, 'itemSheet') : dietGroups(d, S.day, 'itemSheet');
  const cards = (coming.length ? comingCard(coming) : '') + (chg ? changedCard(chg) : '');
  const body = S.dTab === 'nu' ? nutriTab(d) : S.dTab === 'ap' ? appliedTo(a) : S.dTab === 'hi' ? historyTab(a, d) : cards + days + `<div class="dtable">${mealTable(groups, wide, S.day == null, { bands: qBands(d) })}</div>` + notesBlock(d);
  const fab = S.dTab === 'ov' && canRaise(me()) && !ended(a) ? `<button class="az-fab az-fab--pill dfab" onclick="raisePick('${a.id}')">${I('edit_note')}<span class="dfab__t">Suggest A Change</span></button>` : '';
  return pane(cls + (fab ? ' has-fab' : ''), head + tabs, `<div class="body">${body}</div>`, '', `diet-${asgId}`).replace(/<\/section>$/, `${fab}</section>`);
}
/* where one diet is applied: every species, level and place it is set on, broad to narrow, each with the animals that eat it there */
const LVL_IC = { species: 'pets', site: 'location_on', section: 'grid_view', enclosure: 'fence', animal: 'cruelty_free' };
const useText = x => x.level === 'species' ? `Species-wide · ${species(x.sp).name}` : `${LEVEL[x.level]} · ${targetName(x)}`;
const dietUses = id => D.assigns.filter(x => x.diet === id && !ended(x))
  .sort((x, y) => (y.sp === diet(id).sp) - (x.sp === diet(id).sp) || species(x.sp).name.localeCompare(species(y.sp).name) || LVL_RANK(x) - LVL_RANK(y));
/* the places above a place, named by level: "Site: Lset · Section: Cassowary Paddock" */
const pathNamed = x => { const p = pathOf(x); return ['site', 'section', 'enclosure'].filter(k => p[k] && LEVELS.indexOf(k) < LEVELS.indexOf(x.level)).map(k => `${LEVEL[k]}: ${placeOf(k, p[k]).name}`).join(' · '); };
/* where one diet is applied, as a species list (owner, 18 Nov): each species with its photo, name and scientific name,
   then the levels and places it is set on, each with the animals that eat it there (the count opens them) */
function appliedTo(a) {
  const d = diet(a.diet), uses = dietUses(d.id), n = x => followersOf(x).length, total = uses.reduce((t, x) => t + n(x), 0), sps = [...new Set(uses.map(x => x.sp))];
  const row = x => { const more = [pathNamed(x), slotKind(x) !== slotKind(a) ? slotText(x) : ''].filter(Boolean).join(' · ');
    return `<button class="apply__r" onclick="dietAnimalsSheet('${x.id}')"${x.id === a.id ? ' aria-current="true"' : ''}>${I(LVL_IC[x.level])}<span class="t"><b>${x.level === 'species' ? 'Species-wide' : `${LEVEL[x.level]} · ${esc(targetName(x))}`}</b>${more ? `<small>${esc(more)}</small>` : ''}</span><span class="apply__n">${plural(n(x), 'animal')}${I('chevron_right', 20)}</span></button>`; };
  return `<div class="apply__h apply__h--top"><b>Applied To</b><span>${plural(sps.length, 'species', 'species')} · ${plural(total, 'animal')}</span></div>`
    + sps.map(sp => { const x = species(sp); return `<div class="apply apsp"><div class="apsp__h">${spThumb(x)}<span class="t"><b>${esc(x.name)}</b><i>${esc(x.sci)}</i></span></div>${uses.filter(u => u.sp === sp).map(row).join('')}</div>`; }).join('');
}
/* Raise request from a diet set at several places asks which place first (audit, 2 Nov) */
function raisePick(id) {
  const a = by('assigns', id), uses = dietUses(a.diet);
  SG = null; if (uses.length < 2) return go(`#/suggest?asg=${id}`);
  openSheet(() => ({ title: 'Which place?', sub: esc(diet(a.diet).name), pick: true,
    body: uses.map(x => `<button class="az-option" onclick="closeAll();go('#/suggest?asg=${x.id}')"><span>${esc(useText(x))}<small>${esc([pathNamed(x), plural(followersOf(x).length, 'animal')].filter(Boolean).join(' · '))}</small></span>${I('chevron_right')}</button>`).join('') }));
}
/* Nutrition: energy as one big number, then each group as Diet Info had it, with the calcium to phosphorus ratio under the minerals */
function nutriTab(d) {
  const nut = nutrition(d), e = nut.find(x => x.name === 'Energy'), ca = nut.find(x => x.name === 'Calcium'), p = nut.find(x => x.name === 'Phosphorus');
  const groups = [...new Set(nut.map(x => x.group))], rows = g => nut.filter(x => x.group === g && x !== e).map(x => `<div class="nutri__r${x.v ? '' : ' zero'}"><span>${x.name}</span><b>${nutriText(x)}</b></div>`).join('')
    + (g === 'Minerals' && ca && p && p.v ? `<div class="nutri__r"><span>Calcium : Phosphorus</span><b>${(ca.v / p.v).toFixed(2)} : 1</b></div>` : '');
  return (e ? `<div class="nbig"><span class="nbig__ic">${I('bolt', 24, true)}</span><span><b>${nutriText(e)}</b><small>per animal, per day</small></span></div>` : '')
    + groups.map(g => rows(g) ? `<div class="nutri"><div class="nutri__h">${g}</div><div class="nutri__rows">${rows(g)}</div></div>` : '').join('');
}
/* History as a stepper (owner, 2 Nov, from their reference): one white card, the steps oldest first on one line. Done steps are filled with a
   tick, the latest is a ring with a dot (where the diet is now), steps still to come are empty rings: a missing certification, the end of a dated diet.
   The line is coloured up to the latest step. Each step: what on the left, the date and time on the right; a change opens to its lines */
function historyTab(a, d) {
  const who = id => `${youName(id)}, ${esc(user(id).title)}`, steps = [], todo = [];
  const hist = changesIn({ dietId: d.id });
  /* within a day: created, then changes, then the certifications (they carry no time), then the end */
  if (d.made && !hist.some(h => h.created && h.diet === d.id)) steps.push({ at: `${d.made.at}T09:00`, o: 0, t: 'Diet Created', p: esc(useText(dietUses(d.id)[0] || a)), w: who(d.made.by), day: true });
  if (d.cert) steps.push({ at: `${d.cert.at}T00:00`, o: 2, t: 'Certified By The Dietitian', w: who(d.cert.by), day: true });
  if (d.kcert) steps.push({ at: `${d.kcert.at}T00:00`, o: 3, t: 'Certified by Kitchen', w: who(d.kcert.by), day: true });
  hist.forEach(h => steps.push({ at: h.at, o: h.created ? 0 : 1, t: h.created ? 'Diet Created' : HTYPE[h.type], p: `${esc(changeSummary(h))}${h.reason ? ` · ${esc(h.reason)}` : ''}`, w: `${who(h.by)}${h.req ? ` · <span class="nw">${h.req}</span>` : ''}${h.doneBy ? ` · Updated in the kitchen by ${youName(h.doneBy)}` : ''}`, open: h.id }));
  if (!d.cert) todo.push({ t: 'Certified By The Dietitian', p: 'Waiting' });
  if (!d.kcert) todo.push({ t: 'Certified by Kitchen', p: 'Waiting' });
  if (a.end && !a.recur && !ended(a)) todo.push({ at: `${a.end}T23:59`, t: 'Diet Ends', p: esc(useText(a)), day: true });
  /* the requests on this diet (owner, 18 Nov: "someone requested changes, that also has to come under History"): a finished one stands where it was
     raised; one still open is a step to come, first. A step opens its request for whoever may see it */
  const asgs = D.assigns.filter(x => x.diet === d.id), ask = [];
  D.requests.filter(r => isDiet(r) && r.state !== 'deleted' && asgs.some(x => touches(r, x) || x.req === r.id)).forEach(r => {
    const s = { at: r.events[0].at, o: 0, t: 'Change Requested', p: `${esc(r.title)} · ${reqNow(r)}`, w: `${who(r.by)} · <span class="nw">${r.id}</span>`, req: visibleTo(r, me()) ? r.id : null };
    (['pending', 'delayed', 'approved', 'in_progress'].includes(r.state) ? ask : steps).push(s);
  });
  steps.sort((x, y) => x.at.slice(0, 10).localeCompare(y.at.slice(0, 10)) || x.o - y.o || x.at.localeCompare(y.at));
  todo.unshift(...ask.sort((x, y) => x.at.localeCompare(y.at)));
  if (ended(a)) steps.push({ at: `${a.end}T23:59`, o: 4, t: 'Diet Ended', p: esc(useText(a)), day: true });
  if (!steps.length && !todo.length) return '<div class="nodiet">No history yet</div>';
  const all = steps.map((x, i) => ({ ...x, st: i === steps.length - 1 ? 'now' : 'done' })).concat(todo.map(x => ({ ...x, st: 'todo' })));
  const row = (x, i) => {
    const mark = x.st === 'done' ? I('check', 18) : x.st === 'now' ? '<i></i>' : '';
    const when = x.at ? `<span class="step__w"><b>${fmtDayY(x.at.slice(0, 10))}</b>${x.day ? '' : `<span>${fmtTime(x.at)}</span>`}</span>` : '';
    const inner = `<span class="step__m step__m--${x.st}">${mark}</span><span class="step__t"><b>${x.t}</b>${x.p ? `<span>${x.p}</span>` : ''}${x.w ? `<small>${x.w}</small>` : ''}</span>${when}`;
    const line = i < all.length - 1 ? ` step--${all[i + 1].st === 'todo' ? 'grey' : 'on'}` : ' step--last';
    return x.req ? `<a class="step pick${line}" href="#/requests/${x.req}">${inner}</a>` : x.open ? `<button class="step pick${line}" onclick="changeSheet('${x.open}')">${inner}</button>` : `<div class="step${line}">${inner}</div>`;
  };
  return `<div class="steps">${all.map(row).join('')}</div>`;
}
/* where a request on a diet stands, in a few words */
function reqNow(r) {
  const by1 = k => { const e = [...r.events].reverse().find(x => x.kind === k); return e ? youName(e.by) : ''; };
  switch (r.state) {
    case 'pending': return `Waiting for ${youName(r.approver)}`;
    case 'delayed': return `Delayed till ${fmtDay(r.delay.until)}`;
    case 'approved': case 'in_progress': return `Approved by ${by1('approved')} · ${changesDiet(r) || r.kind === 'skip' ? 'in the diet' : 'with the kitchen'}`;
    case 'completed': return `${changesDiet(r) ? 'Diet Updated' : 'Completed'} by ${by1('completed')}`;
    case 'rejected': return `Not approved by ${by1('rejected')}`;
    case 'cancelled': return 'Cancelled';
    default: return esc(stateOf(r).label);
  }
}
/* Figma "Diet Info": the diet with its species' photo, then when, sharing, open requests and its ID (nutrition, places and history have their tabs) */
function dietInfoSheet(id) {
  const a = by('assigns', id), d = diet(a.diet), sp = species(a.sp), others = sharedWith(d.id, a.sp), open = openOnSlot(a).filter(r => visibleTo(r, me()));
  const r = (icon, k, v) => `<div class="rsec__r">${I(icon)}<span class="t"><span>${k}</span>${v}</span></div>`;
  openSheet(() => ({ title: 'Diet Info', body: `<div class="dinfo"><img src="${spPhoto(a.sp)}" alt=""><span><b>${esc(d.name)}</b><span>${esc(slotKind(a))} · ${esc(sp.name)}</span></span></div>
    <div class="rsec">${a.group ? r('location_on', 'For', `<b>${esc(sp.name)} ${a.group.kind === 'age' ? 'aged' : a.group.kind === 'sex' ? '·' : 'of'} ${esc(a.group.kind === 'sex' ? GROUP_WORD(a.group) : a.group.label)}</b>`) : ''}
      ${r('event', 'When', `<b>${esc(!a.start && !a.end ? 'All year' : slotWhen(a))}</b>`)}
      ${r('scale', 'Amounts', `<b>${esc(qModeText(d))}</b>${d.qmode && d.qmode.mode !== 'sex' ? `<p>${esc(d.qmode.bands.map(b => b.label).join(' · '))}</p>` : ''}`)}
      ${others.length ? r('share', 'Shared With', others.map(o => { const oa = D.assigns.find(x => x.diet === d.id && x.sp === o.id && !ended(x)); return `<a class="lnk" href="#/diets/${o.id}/${oa.id}">${esc(o.name)}${I('chevron_right', 18)}</a>`; }).join('')) : ''}
      ${open.length ? r('assignment', open.length === 1 ? 'Open Request' : 'Open Requests', open.map(x => `<a class="lnk" href="#/requests/${x.id}">${x.id} · ${esc(stateOf(x).label)}</a>`).join('')) : ''}
      ${r('tag', 'Diet ID', `<p>${d.id}</p>`)}</div>` }));
}
/* Figma "Animals using this Diet": the diet and its count, then the animals */
function dietAnimalsSheet(id) {
  const a = by('assigns', id), list = followersOf(a), d = diet(a.diet);
  openSheet(() => ({ title: 'Animals On This Diet', sub: `${esc(d.name)} · ${esc(useText(a))} · ${list.length}`, body: list.length ? list.map(x => animalCard(x)).join('') : '<div class="nodiet">No animal is on this diet</div>' }), SH.length > 0);
}
/* Figma "Meal details": the item first, then the time, the amount, its preparation and cut (or a mix's parts), the days (audit, 2 Nov) */
function itemSheet(dietId, f, it) {
  const d = diet(dietId), l = entryOf(d, f, it), x = item(it);
  const a = D.assigns.find(z => z.diet === dietId && location.hash.includes(z.id)) || D.assigns.find(z => z.diet === dietId), n = a ? followersOf(a).length : 0, total = toBase(l.qty, l.unit) * n;
  const qb = qBands(d), qcard = qb && l.bq ? `<div class="qcard qcard--bands"><span>Per animal · ${esc(qb.by)}</span><span class="qbands">${qb.list.map((b, i) => `<span><small>${esc(b)}</small><b>${qtyText(l.bq[i], l.unit)}</b></span>`).join('')}</span></div>`
    : `<div class="qcard"><span>Per animal</span><b>${qtyText(l.qty, l.unit)}</b>${n ? `<small>${plural(n, 'animal')} · ${qtyText(total, BASE[l.unit][0])} ${l.cad ? 'a feed' : 'a day'}</small>` : ''}</div>`;
  openSheet(() => ({ title: `${esc(x.name)}${x.mix ? MIXTAG : ''}`, sub: `${I('schedule', 16)} ${bandText(feed(f))}`, body: `${qcard}
    <div class="mcard">${x.mix ? `<span class="mcard__k">Ingredients · per animal</span>${ingrChips(x, toBase(l.qty, l.unit))}`
      : `<span class="mcard__k">Preparation · Cut</span><b class="mcard__n">${esc(l.prep || 'As it comes')} · ${esc(l.cut || 'Whole')}</b>`}
      ${l.cad ? `<span class="mcard__k">Repeats</span><b class="mcard__n">${cadText(l.cad)}</b><span class="mcard__k">Next Feeds</span><span class="nextf">${nextFeeds(l, 3).map(s => `<span>${wday(s)} ${fmtDay(s)}</span>`).join('')}</span>`
        : `<span class="mcard__k">Days</span><b class="mcard__n">${daysText(l.days ?? EVERY_DAY)}</b>`}</div>` }));
}
/* ---------- Diet per device ---------- */
function vDiets(parts) {
  const spId = parts[1] ? +parts[1] : null, asgId = parts[2] === 'v' ? null : parts[2] || null;
  /* View Diet of a version: the phone's own page; on the iPad it takes the species' place on the right, with Back to it */
  if (parts[2] === 'v' && spId) {
    if (isPhone()) return paneVersion(spId, +parts[3], { cls: 'pane--fill', back: `#/diets/${spId}` });
    return paneDietHome({ cls: isLand() ? 'pane--w400' : 'pane--w340', cur: S.land === 'diets' ? null : spId }) + paneVersion(spId, +parts[3], { cls: 'pane--fill pane--dcol', back: `#/diets/${spId}` });
  }
  if (isPhone()) {
    if (asgId) return paneDiet(asgId, { cls: 'pane--fill', back: '#/diets' });
    const home = paneDietHome({ cls: 'pane--fill' });
    return spId ? { html: home, overlay: speciesSheet(spId) } : home;
  }
  /* iPad: Diet on the left. Diet wise: the diet picked on the right (list | detail). Species wise: the species on the right, and a diet
     picked there takes its place with Back to the species, so Meal details and Diet Info never open a sheet on a sheet (3 Nov) */
  const first = S.land === 'diets' ? (dietsFor(S.dKind)[0] || {}).sp : (speciesFor(S.spTab)[0] || {}).id, sp = spId || first || D.species[0].id;
  const a = asgId ? by('assigns', asgId) : null;
  if (a && a.sp === sp) S.lvl[sp] = a.level === 'species' || ended(a) ? 'species' : a.level;
  if (S.land === 'diets' && (!spId || a)) {
    const pickd = a || dietsFor(S.dKind)[0] || null;
    return paneDietHome({ cls: isLand() ? 'pane--w400' : 'pane--w340', cur: pickd ? pickd.id : null }) + (pickd ? paneDiet(pickd.id, { cls: 'pane--fill pane--dcol', wide: isLand() }) : pane('pane--fill', '', empty1('No diet here'), '', 'dcol-none'));
  }
  return paneDietHome({ cls: isLand() ? 'pane--w400' : 'pane--w340', cur: S.land === 'diets' ? (a ? a.id : null) : sp })
    + (a ? paneDiet(a.id, { cls: 'pane--fill pane--dcol', wide: isLand(), back: `#/diets/${sp}` }) : paneSpecies(sp, { cls: 'pane--fill' }));
}
/* a change has its own page on the phone (from a diet's history on the iPad it opens in a side sheet) */
function vHistory(parts) {
  if (parts[1] === 'c') return paneChange(parts[2], { cls: 'pane--fill' });
  return vDiets(['diets']);
}
