// js/helpdesk.js — Help Desk, opened from Home › Modules › Help Desk. Every kind of request; Diet is one department.
// List as the Help Desk app (status count tabs, department chips, "Request (n)" with sort and filter, request cards, the add button).
// A request is the Antz record layout: white header (number · category and priority · requester with call and chat),
// details on a Field fill, What changes for a diet request, Activity with the comment box on top, and one current-status bar.

/* ---------- the list ---------- */
/* sub: the chips under Approved (approved · in_progress · completed) and Closed (rejected · cancelled · deleted); 'all' for the tab counts */
/* mine: only what waits on (or was decided by) this person, the Figma's "My Approvals" (Request Module, 25 Sep 2025) */
const approvesAny = () => D.requests.some(r => r.approver === S.user && visibleTo(r, me()));
function hdList(tab, deptId = S.rDept, sub = 'all', mine = S.rMine && approvesAny()) {
  const u = me(), q = S.rQ.trim().toLowerCase();
  return D.requests.filter(r => visibleTo(r, u) && (!mine || r.approver === u.id) && (tab === 'all' || tabOf(r) === tab) && (!HDSUBS[tab] || sub === 'all' || r.state === sub) && (deptId === 'all' || r.dept === deptId) && (S.rPrio === 'all' || r.prio === S.rPrio)
    && (!q || [r.id, r.title, r.text, dept(r.dept).name, isDiet(r) ? species(r.sp).name : ''].some(x => (x || '').toLowerCase().includes(q))))
    .sort((a, b) => (S.rSort === 'priority' ? PRIO_RANK[a.prio] - PRIO_RANK[b.prio] : 0) || (lastAt(a) < lastAt(b) ? 1 : -1));
}
const ago = s => { const m = Math.round((Date.now() - new Date(s)) / 6e4); return m < 60 ? `${Math.max(m, 1)} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`; };
const flag = p => `<span class="az-flag${p === 'high' ? ' az-flag--high' : p === 'emergency' ? ' az-flag--emergency' : ''}" title="${PRIO[p][1]} priority" aria-label="${PRIO[p][1]} priority">${p === 'emergency' ? I('local_fire_department', 20, true) : PRIO[p][0]}</span>`;
/* what a diet request asks for, in plain words; other requests show their description */
function whatOf(r) {
  if (!isDiet(r) || JOB_KINDS.includes(r.kind)) return r.text;
  const base = diet(r.base);
  if (r.kind === 'skip') return `No diet ${onDay(r.date)} · ${r.feeds === 'all' ? 'all feeds' : r.feeds.map(f => bandText(feed(f))).join(', ') + ' only'}`;
  if (r.kind === 'end') return `${(r.ends || []).map(id => diet(by('assigns', id).diet).name).join(', ')} · last day ${fmtDay(r.stop)}`;
  if (r.kind === 'new') return `${r.name || 'New diet'} · ${howText(r)}`;
  if (r.kind === 'items' && r.base === 'many') return (r.rules || []).map(ruleText).join(', ');
  return r.kind === 'items' ? r.changes.map(c => changeText(c, base)).join(', ') : `${base ? base.name : 'No diet'} → ${diet(r.diet).name}`;
}
/* the card's second line: what changes, or, when the title already says that (a diet request names itself), who it is for and why */
const cardLine = r => { const w = whatOf(r); return w !== r.title || !isDiet(r) ? w : [targetsOf(r).length > 1 ? placesText(targetsOf(r)) : `${species(r.sp).name} · ${placeText(r)}`, r.reason].filter(Boolean).join(' · '); };
/* a diet request says which of the two it is, and its type, in Title Case (Antz Labeling Guidelines): "Diet Request · Skip A Feed", "Diet Change · Another Diet" */
const catOf = r => isDiet(r) ? `${dgOf(dgroupOf(r))[1]} · ${tcase(dtOfKind(r.kind)[2])}` : dept(r.dept).name;
const siteOf = r => r.site ? by('sites', r.site).name : '';
/* the site, and the section when the request is for one place inside it: "Cow Land · Coypu Land" */
function siteLine(r) {
  const ts = isDiet(r) ? targetsOf(r) : [], p = ts.length === 1 && ts[0].level !== 'species' && ts[0].level !== 'site' ? pathOf(ts[0]) : null;
  return [siteOf(r), p && p.section && ts[0].level !== 'section' ? by('sections', p.section).name : ''].filter(Boolean).join(' · ');
}
const lastComment = r => [...r.events].reverse().find(e => e.kind === 'comment');
const stripTime = r => isOpen(r) || r.state === 'in_progress' ? `Since ${ago(lastAt(r))}` : fmtDay(lastAt(r).slice(0, 10));
/* the card's one fact, as the Figma card's Estimate / Tentative Date: when it is for (a diet request), or the estimate (other departments) */
const JOB_WHEN = ['From', 'Which day', 'Needed from', 'When'], JOB_LONG = ['For'];
function cardFact(r) {
  if (!isDiet(r)) return r.f && r.f.cost ? ['Estimate', `₹ ${(+r.f.cost).toLocaleString('en-IN')}`] : null;
  if (r.kind === 'skip') return ['Which Day', `${cap(dayText(r.date))} · ${r.feeds === 'all' ? 'All Feeds' : r.feeds.map(f => bandText(feed(f))).join(', ')}`];
  if (r.kind === 'end') return ['Last Day', fmtDayY(r.stop)];
  if (JOB_KINDS.includes(r.kind)) { const rows = (r.f && r.f.rows) || [], w = rows.find(([k]) => JOB_WHEN.includes(k)), l = rows.find(([k]) => JOB_LONG.includes(k));
    return w ? [w[0] === 'Which day' ? 'Which Day' : 'When', [w[1].split(' · ')[0], l ? tcase(l[1]) : ''].filter(Boolean).join(' · ')] : null; }
  return ['When', r.how === 'always' && r.start ? `From ${fmtDayY(r.start)}` : howText(r)];
}
function hdCard(r, cur = false) {
  const s = stateOf(r), c = lastComment(r), low = r.approver === S.user && isOpen(r) && shortOf(r).length, fact = cardFact(r), nf = (r.files || []).length;
  return `<a class="hdcard pick" href="#/requests/${r.id}"${cur ? ' aria-current="true"' : ''}>
    <span class="hdcard__top"><span class="grow"><b class="hdcard__id">${r.id}</b><span class="hdcard__cat">${esc(catOf(r))}</span></span>${flag(r.prio)}</span>
    <span class="hdcard__body"><b class="hdcard__t">${esc(r.title)}</b><span class="hdcard__d">${esc(r.text || cardLine(r))}</span>
      <span class="hdcard__by"><b>${youName(r.by)}</b> • ${fmtDayY(r.events[0].at.slice(0, 10))}${low ? ` ${pill('pending', 'Low Stock')}` : ''}</span>
      ${fact || nf ? `<span class="hdcard__facts">${fact ? `<span><small>${fact[0]}</small><b${fact[0] === 'Estimate' ? ' class="amt-green"' : ''}>${esc(fact[1])}</b></span>` : '<span></span>'}${nf ? `<span class="hdcard__files">${I('attach_file', 18)}${nf}</span>` : ''}</span>` : ''}</span>
    ${c ? `<span class="hdcard__cmt">${I('format_quote', 22, true)}<span><i>${esc(c.note)}</i><small>${youName(c.by)} • ${fmtTime(c.at)} • ${fmtDayY(c.at.slice(0, 10))}</small></span></span>` : ''}
    <span class="az-strip az-strip--${s.tone}">${I(s.icon, 20)}${esc(s.label)}<span class="az-strip__time">${stripTime(r)}</span></span></a>`;
}
function paneHelpDesk({ cls = '', cur = null } = {}) {
  const deptsHere = DEPTS.filter(x => D.requests.some(r => r.dept === x.id && visibleTo(r, me())));
  if (S.rDept !== 'all' && !deptsHere.some(x => x.id === S.rDept)) S.rDept = 'all';
  /* the phone has count tabs; the iPad has the same as one row of chips with counts, the selected one dark (Hospital iPad, 22 Sep 2026) */
  const tabs = isPhone() ? `<div class="az-counttabs az-counttabs--fit" role="tablist">${HDTABS.map(([k, l]) => `<button class="az-counttab" role="tab" aria-selected="${S.rTab === k}" onclick="S.rTab='${k}';S.rSub='all';go('#/requests')"><span class="az-counttab__in"><b>${hdList(k).length}</b><span>${l}</span></span></button>`).join('')}</div>`
    : `<div class="az-chips hdstat" role="tablist" aria-label="Status">${HDTABS.map(([k, l]) => `<button class="az-chip" role="tab" aria-selected="${S.rTab === k}" onclick="S.rTab='${k}';S.rSub='all';go('#/requests')">${l} - ${hdList(k).length}</button>`).join('')}</div>`;
  /* My Approvals | All (Figma Request Module, 25 Sep 2025), for anyone who approves requests */
  const mineChips = approvesAny() ? `<span class="hdscope" role="tablist" aria-label="Whose requests">${[[true, 'My Approvals'], [false, 'All']].map(([v, l]) => `<button class="az-chip" role="tab" aria-selected="${!!S.rMine === v}" onclick="S.rMine=${v};go('#/requests')">${l} - ${hdList(S.rTab, S.rDept, S.rSub, v).length}</button>`).join('')}</span>` : '';
  const chips = `<div class="az-chips" role="tablist" aria-label="Department">${[{ id: 'all', name: 'All' }, ...deptsHere].map(x => `<button class="az-chip" role="tab" aria-selected="${S.rDept === x.id}" onclick="S.rDept='${x.id}';go('#/requests')">${x.name} - ${hdList(S.rTab, x.id, S.rSub).length}</button>`).join('')}</div>`;
  const search = S.rSearch ? `<div class="az-searchrow"><label class="az-search">${I('search', 20)}<input id="hd-q" placeholder="Search requests" value="${esc(S.rQ)}" oninput="S.rQ=this.value;render()" aria-label="Search requests"></label></div>` : '';
  /* under Approved (as the Help Desk app: All · Approved · In progress · Completed) and Closed (All · Rejected · Canceled · Deleted), each with its count; a chip with nothing in it is left out */
  const subOpts = (HDSUBS[S.rTab] || []).filter(([k]) => k === 'all' || k === S.rSub || hdList(S.rTab, S.rDept, k).length);
  const subs = subOpts.length > 2 ? `<div class="az-chips az-chips--sub" role="tablist" aria-label="${HDTABS.find(x => x[0] === S.rTab)[1]} requests">${subOpts.map(([k, l]) => `<button class="az-chip" role="tab" aria-selected="${S.rSub === k}" onclick="S.rSub='${k}';go('#/requests')">${l} - ${hdList(S.rTab, S.rDept, k).length}</button>`).join('')}</div>` : '';
  const list = hdList(S.rTab, S.rDept, S.rSub), filt = S.rPrio !== 'all';
  const tools = `<span class="hdtools">${iconBtn('swap_vert', `Sort: ${S.rSort === 'priority' ? 'priority' : 'newest'}`, "S.rSort=S.rSort==='priority'?'newest':'priority';render();toast('Sorted by '+(S.rSort==='priority'?'priority':'newest'))")}<button class="az-iconbtn${filt ? ' on' : ''}" onclick="hdFilterSheet()" aria-label="Filter">${I('tune')}</button></span>`;
  /* the phone: the chips on their own line, then Requests (n); the iPad: the chips share the line with sort and filter */
  const count = isPhone() || !mineChips ? `${mineChips ? `<div class="hdscope-row">${mineChips}</div>` : ''}<p class="az-countline">Requests (${list.length})${tools}</p>` : `<p class="az-countline hdscope-line">${mineChips}${tools}</p>`;
  const body = `<div class="body">${subs}${count}${list.length ? `<div class="list list--16">${list.map(r => hdCard(r, cur === r.id)).join('')}</div>` : empty1('No requests here')}</div>${isPhone() ? `<a class="az-fab" href="#/new" aria-label="New request">${I('add_circle', 32)}</a>` : `<a class="az-fab az-fab--pill az-fab--no-nav" href="#/new">${I('add_circle')}New Request</a>`}`;
  return pane(cls, topbar({ back: '#/home', title: 'Help Desk', end: whoBtn(), actions: iconBtn('search', 'Search requests', "S.rSearch=!S.rSearch;S.rQ='';render();setTimeout(()=>{const i=document.getElementById('hd-q');if(i)i.focus()},30)") }) + search + chips + tabs, body, '', 'hd');
}
function hdFilterSheet() { optionSheet('Priority', [['all', 'All Priorities'], ...Object.entries(PRIO).map(([k, [, l]]) => [k, l, PRI_TEXT[k]])], S.rPrio, 'pickRPrio'); }
function pickRPrio(v) { S.rPrio = v; closeAll(); render(); }

/* ---------- one request (record layout) ---------- */
const lastEv = (r, k) => [...r.events].reverse().find(e => e.kind === k);
const EVT = { raised: ['Request raised', 'send', ''], edited: ['Request edited', 'edit', ''], delayed: ['Delayed', 'timer', 'wait'], approved: ['Approved', 'check', 'ok'], rejected: ['Rejected', 'close', 'bad'], cancelled: ['Canceled', 'do_not_disturb_on', 'bad'],
  started: ['Moved to In progress', 'progress_activity', 'ok'], assigned: ['Job In Charge', 'badge', ''], completed: ['Completed', 'task_alt', 'ok'], reopened: ['Moved back to In progress', 'undo', 'wait'] };
/* what the team wrote when completing: the notes, the team, the files */
const teamText = e => [plural(e.team || 1, 'person', 'people'), e.people].filter(Boolean).join(' · ');
/* a request's facts in the Figma's order (Request Module, Req Details 25 Sep 2025): { k, icon, label, v, link } */
const REQ_JI = { Feed: 'schedule', From: 'event', 'Which day': 'event', 'Needed from': 'event', 'Start from': 'restaurant', Food: 'restaurant', When: 'event', With: 'schedule', Medicine: 'medication', Dose: 'science', 'Mix into': 'schedule', For: 'date_range', 'Which feed': 'schedule', 'What was wrong': 'report' };
const JOB_WHENISH = ['From', 'Which day', 'Needed from', 'When', 'Feed', 'Which feed', 'For'];
const goLnk = (t, js) => `<button class="lnk" onclick="${js}">${t}${I('chevron_right', 18)}</button>`;
const callChat = u => u.id === S.user ? '' : `<span class="rperson__acts">${iconBtn('call', `Call ${u.name}`, `toast('Calling ${esc(u.name)}')`)}${iconBtn('chat', `Chat with ${u.name}`, `toast('Chat with ${esc(u.name)}')`)}</span>`;
const personRow = (uid, extra = '') => { const u = user(uid); return `<div class="rperson">${avatar(u.name)}<span class="grow"><b>${youName(uid)}</b><span>${esc(u.title)}${extra}</span></span>${callChat(u)}</div>`; };
/* who or where a diet request is for, as the design system's entity card: an animal by its AID with the sex badge; a place or the species with its photo */
function forCard(r) {
  const ts = targetsOf(r);
  if (ts.length > 1) return `<b>${esc(placesText(ts))}</b>`;
  const t = ts[0], sp = species(t.sp), a = t.level === 'animal' ? by('animals', t.ref) : null, sx = a ? SEXT[a.sex] || 'UD' : '';
  const tag = a ? `AID: ${a.id}` : t.level === 'species' ? 'Whole Species' : `${LEVEL[t.level]}: ${targetName(t)}`;
  const last = a ? `Encl: ${by('enclosures', a.enc).name}` : t.group ? `${GROUP_WORD(t.group)} Only` : '';
  return `<div class="az-animal forcard"><span class="az-photo"><img src="${spPhoto(t.sp)}" alt="" loading="lazy">${a ? `<span class="az-photo__sex az-photo__sex--${sx}">${sx}</span>` : ''}</span><span class="az-animal__d"><span class="az-animal__tag">${esc(tag)}</span><span>${esc(a && a.name ? `${a.name} · ${sp.name}` : sp.name)}</span><span class="az-animal__sci">${esc(sp.sci)}</span>${last ? `<span>${esc(last)}</span>` : ''}</span></div>`;
}
function reqFacts(r) {
  const acts = actionsFor(r, me()), F = [], add = (k, icon, label, v, link = '') => F.push({ k, icon, label, v, link });
  add('site', 'location_on', 'Requested Site', `<span class="v">${esc(siteLine(r))}</span>`);
  add('req', 'subject', 'Request', `<b>${esc(r.title)}</b>${r.text ? `<p>${esc(r.text)}</p>` : ''}`);
  /* the department's own answers */
  const form = DEPT_FORMS[r.dept];
  if (form && r.f) form.fields.forEach(x => { const v = r.f[x.k];
    const t = x.type === 'switch' ? (v ? 'Yes' : 'No') : x.type === 'date' ? (v ? fmtDayY(v) : '') : x.type === 'money' ? (v ? `₹ ${(+v).toLocaleString('en-IN')}` : '') : x.type === 'items' ? (v || []).map(i => `${esc(i.name)} × ${i.qty}`).join('<br>') : esc(v || '');
    if (t) add('form', x.icon, tcase(x.label), `<b${x.type === 'money' ? ' class="amt-green"' : ''}>${t}</b>`); });
  if (isDiet(r)) {
    const s = r.kind === 'items' ? slotFor(r) : null, base = r.base && r.base !== 'many' ? diet(r.base) : null;
    add('for', 'pets', 'For', forCard(r), goLnk('See Animals', `animalsSheet('${r.id}')`));
    const open = s && !ended(s) && base ? `<a class="lnk" href="#/diets/${s.sp}/${s.id}">Open Diet${I('chevron_right', 18)}</a>` : '';
    /* what changes, as the review showed it before sending: Food | Was | Now, the old value struck through */
    if (r.kind === 'items' && base && (r.changes || []).length) add('chg', 'swap_horiz', 'What Changes', `<span class="sub">${esc(base.name)}${s ? ` · Set for ${esc(whereSet(s))}` : ''}</span>${diffTable(r.changes, base)}`, open);
    if (r.kind === 'items' && r.base === 'many') add('chg', 'swap_horiz', 'What Changes', `<b>All their diets, changed by item</b>${(r.rules || []).map(u => `<p>${esc(ruleText(u))}</p>`).join('')}`);
    if (r.kind === 'new') add('diet', 'add_circle', 'New Diet', `<b>${esc(r.name || (planOf(r).ops.find(o => o.type === 'new') || {}).name || 'New diet')}</b><span class="sub">${r.base && diet(r.base) ? `From ${esc(diet(r.base).name)}` : 'Made from empty'}</span>`);
    if (r.kind === 'diet' && base) add('diet', 'restaurant', 'Instead Of', `<b>${esc(base.name)}</b>`);
    if (r.kind === 'end') add('diet', 'restaurant', 'Diet To End', (r.ends || []).map(id => { const a = by('assigns', id); return `<b>${esc(diet(a.diet).name)}</b><span class="sub">Set for ${esc(whereSet(a))}</span>`; }).join(''));
    if (JOB_KINDS.includes(r.kind)) {
      /* a request in words: when, which feed and how long in one row (From · Feed · For), the rest as their own rows */
      const rows = (r.f && r.f.rows) || [], when = rows.filter(([k]) => JOB_WHENISH.includes(k)), rest = rows.filter(x => !when.includes(x));
      if (when.length) add('when', 'calendar_month', 'When', `<div class="az-kvgrid rkv3">${when.map(([k, v]) => `<div><span>${esc(tcase(k))}</span><b>${esc(v)}</b></div>`).join('')}</div>`);
      rest.forEach(([k, v]) => add('job', REQ_JI[k] || 'info', tcase(k), `<b>${esc(v)}</b>`));
    } else add('when', 'calendar_month', r.kind === 'end' ? 'Last Day' : 'When', `<b>${r.kind === 'skip' ? `${wday(r.date)} ${fmtDayY(r.date)} · ${r.feeds === 'all' ? 'all feeds' : r.feeds.map(f => bandText(feed(f))).join(', ')}` : r.kind === 'end' ? `${wday(r.stop)} ${fmtDayY(r.stop)}` : howText(r)}</b>${r.how && r.kind !== 'skip' ? ktag(HOW_KIND[r.how]) : ''}`);
  }
  /* the work after approval: who is in charge (the team can change it while in progress), and what the team wrote when completing */
  if (['in_progress', 'completed'].includes(r.state)) {
    const can = acts.includes('assign'), who = r.assignee ? user(r.assignee) : null, done = r.state === 'completed' ? lastEv(r, 'completed') : null;
    if (who || can) add('assign', 'badge', 'Job In Charge', who ? personRow(r.assignee) : '<span class="v">Not set yet</span>', can ? `<button class="lnk" onclick="assignSheet('${r.id}')">${who ? 'Change' : `${I('add', 18)}Add`}</button>` : '');
    if (done) {
      if (done.note) add('done', 'task_alt', 'Completion Notes', `<p>${esc(done.note)}</p>`);
      if (!isDiet(r)) add('done', 'groups', 'Team', `<b>${esc(teamText(done))}</b>`);
      if ((done.files || []).length) add('done', 'attach_file', 'Completion Files', fileTiles(done.files));
    }
  }
  /* why, with the note to the kitchen under it */
  if (isDiet(r) && (r.reason || r.note)) add('why', 'label', r.reason ? 'Why' : 'Note To Kitchen', `${r.reason ? `<b>${esc(r.reason)}</b>` : ''}${r.note ? `<p class="${r.reason ? 'sub' : ''}">${r.reason ? 'Note To Kitchen: ' : ''}${esc(r.note)}</p>` : ''}`);
  add('by', 'person', 'Requested By', personRow(r.by));
  /* the approval (Figma note: no names here before approval; the approvers are in the sheet behind View) */
  { const rej = r.state === 'rejected', ok = wasApproved(r), e = lastEv(r, rej ? 'rejected' : 'approved');
    add('appr', rej ? 'block' : ok ? 'verified' : 'how_to_reg', rej ? 'Rejected By' : ok ? 'Approved By' : 'Approval',
      ok || rej ? personRow(r.approver, e ? ` · ${fmtAt(e.at)}` : '') : r.state === 'cancelled' ? '<span class="v">Canceled before approval</span>'
        : `<span class="v">${r.approver === S.user ? 'Awaiting Your Approval' : 'Awaiting Approval'}</span>${r.state === 'delayed' ? `<span class="sub">Delayed until ${fmtDay(r.delay.until)} · ${esc(r.delay.reason)}</span>` : ''}`,
      goLnk('View', `approversSheet('${r.id}')`)); }
  if ((r.files || []).length) add('files', 'attach_file', 'Attachments', fileTiles(r.files));
  return F;
}
/* the diet-only parts after the rows: the new diet or the feeds (a skipped day), Save it as, what approving does, the diet now */
function reqExtra(r) {
  if (!isDiet(r)) return '';
  const [t, lines] = r.kind === 'items' ? ['', ''] : reqLines(r);
  return (lines ? `<p class="secttl">${t}</p>${lines}` : '') + saveAsSec(r) + reqEffect(r) + reqDietNow(r);
}
/* the Request page (owner, 20 Nov 2026, the Figma alignment mockup): a dark header (number, category with its flag, when, the requester
   with call and chat), any low stock, then one fact per row with its icon, the diet parts, Activity, and the status bar.
   iPad landscape: the same facts as white section cards in two columns (Hospital iPad, 22 Sep 2026) */
function paneRequest(id, { cls = '' } = {}) {
  const r = by('requests', id), back = isPhone() ? '#/requests' : '';
  if (!r || !visibleTo(r, me())) return pane(cls, topbar({ back, title: 'Request' }), empty1('Not one of your requests'));
  const more = iconBtn('more_vert', 'More', `moreMenu('${r.id}',this)`);
  const req = user(r.by), edited = r.events.some(e => e.kind === 'edited');
  const head = `<div class="rhead rhead--dark"><span class="rhead__row"><span class="az-dept">${I(isDiet(r) ? KIND[r.kind][1] : dept(r.dept).icon, 20)}</span><span class="rhead__catn">${esc(catOf(r))}</span>${flag(r.prio)}</span>
    <span class="meta">${fmtTime(r.events[0].at)} • ${fmtDayY(r.events[0].at.slice(0, 10))}${edited ? '<span class="rhead__edited">Edited</span>' : ''}</span>
    <span class="rhead__who">${avatar(req.name, '28')}<span class="az-who__name">${youName(r.by)}</span>${callChat(req)}</span></div>`;
  const low = reqLowStock(r), F = reqFacts(r), extra = reqExtra(r);
  const row = f => `<div class="rrow rrow--${f.k}">${I(f.icon, 20)}<div class="rrow__b"><div class="rrow__h"><span>${f.label}</span>${f.link}</div>${f.v}</div></div>`;
  let body;
  if (isLand()) {
    const card = (title, inner, { link = '', span = false, k = '' } = {}) => `<section class="rcard${span ? ' rcard--span' : ''}${k ? ` rcard--${k}` : ''}"><div class="rcard__h"><b>${title}</b>${link}</div>${inner}</section>`;
    const kv = fs => `<div class="rkv">${fs.map(f => `<div class="rkv__c rkv__c--${f.k}"><span class="rkv__k">${f.label}</span>${f.v}${f.link ? `<span class="rkv__l">${f.link}</span>` : ''}</div>`).join('')}</div>`;
    const reqF = F.find(f => f.k === 'req'), chg = F.find(f => f.k === 'chg'), files = F.find(f => f.k === 'files');
    const det = F.filter(f => !['req', 'chg', 'files'].includes(f.k)), act = activityView(r, { bare: true });
    body = `${low ? `<div class="rlow">${low}</div>` : ''}<div class="body rgrid">${card('Request', reqF.v, { span: true, k: 'req' })}${chg ? card('What Changes', chg.v, { link: chg.link, k: 'chg' }) : ''}${card('Details', kv(det), { span: !chg })}
      ${files ? card('Attachments', files.v) : ''}${card('Activity', act.html, { link: act.filter, span: !files })}${extra ? `<div class="rcard--span rextra">${extra}</div>` : ''}</div>`;
  } else body = `${low ? `<div class="rlow">${low}</div>` : ''}<div class="rrows">${F.map(row).join('')}</div>${extra ? `<div class="body rextra">${extra}</div>` : ''}${activityView(r)}`;
  /* the record header scrolls away with the request; only the top bar and the status bar stay */
  return pane(`${cls} req-a${isLand() ? ' req-wide' : ''}`, topbar({ back, title: r.id, actions: more }), head + body, statusBar(r), `req-${r.id}`);
}
/* Activity, as the Figma (Comment Input, 1 Sep 2025): Show All with its filter, an attach button and "Add Your Comment", then each entry;
   a status change shows old → new in its colour */
const ST_TO = { raised: 'Awaiting Approval', edited: 'Awaiting Approval', delayed: 'Delayed', approved: 'Approved', rejected: 'Rejected', cancelled: 'Canceled', started: 'In Progress', completed: 'Completed', reopened: 'In Progress' };
const ST_TONE = { 'Awaiting Approval': 'wait', Delayed: 'wait', Approved: 'ok', 'In Progress': 'prog', Completed: 'done', 'Diet Updated': 'done', Rejected: 'bad', Canceled: 'cancel' };
const stPill = t => `<span class="stp stp--${ST_TONE[t] || 'wait'}">${esc(t)}</span>`;
const ACT_F = [['all', 'Show All'], ['c', 'Comments'], ['s', 'Status Updates']];
function actFilterSheet() { optionSheet('Show', ACT_F, S.actF || 'all', 'pickActF'); }
function pickActF(v) { S.actF = v; closeAll(); render(); }
function activityView(r, { bare = false } = {}) {
  const f = S.actF || 'all'; let prev = null;
  const items = r.events.map(e => { if (e.kind === 'comment' || e.kind === 'assigned') return { e }; const to = e.kind === 'completed' && changesDiet(r) ? 'Diet Updated' : ST_TO[e.kind], x = { e, from: e.kind === 'raised' ? null : prev, to }; prev = to; return x; })
    .filter(x => f === 'all' || (f === 'c' ? x.e.kind === 'comment' : x.e.kind !== 'comment')).reverse();
  /* each entry in a tinted box, as the Hub's Help Desk: a comment is a yellow note, a status change a light box in its colour, raised or edited grey */
  const card = x => { const e = x.e, who = `<span class="act__who">${avatar(user(e.by).name, '24')}<b>${youName(e.by)}</b><span>${fmtTime(e.at)} • ${fmtDayY(e.at.slice(0, 10))}</span></span>`;
    if (e.kind === 'comment') return `<div class="act">${who}<div class="act__box act__box--note"><p>${esc(e.note)}</p></div></div>`;
    if (e.kind === 'assigned') return `<div class="act">${who}<div class="act__box"><small>Update</small><p>Job In Charge: <b>${youName(e.to)}</b></p></div></div>`;
    const t = e.kind === 'raised' ? 'Request Raised' : e.kind === 'edited' ? 'Request Edited' : e.kind === 'delayed' ? `Delayed Until ${fmtDay(e.until)}` : '';
    const box = e.kind === 'raised' || e.kind === 'edited' ? '' : ` act__box--${ST_TONE[x.to] || 'wait'}`;
    return `<div class="act act--st">${who}<div class="act__box${box}"><small>${t ? 'Update' : 'Status Update'}</small><p class="act__st">${t ? `<span class="act__t">${t}</span>` : ''}${x.from && x.from !== x.to ? `${stPill(x.from)}${I('arrow_forward', 16)}` : ''}${stPill(x.to)}</p>${e.reason || e.note ? `<p>${esc([e.reason, e.note].filter(Boolean).join('. '))}</p>` : ''}${e.kind === 'completed' && !isDiet(r) ? `<p class="plain">${esc(teamText(e))}</p>` : ''}${(e.files || []).length ? fileTiles(e.files) : ''}</div></div>`; };
  const filter = `<button class="lnk act-fbtn" onclick="actFilterSheet()" aria-label="Show: ${ACT_F.find(x => x[0] === f)[1]}">${ACT_F.find(x => x[0] === f)[1]}${I('filter_list', 20)}</button>`;
  const html = `<div class="act-comp"><button class="act-attach" onclick="toast('Attach a photo or a file')" aria-label="Attach a photo or a file">${I('attach_file')}</button><div class="az-composer">${avatar(me().name, '24')}<input id="cmt" placeholder="Add Your Comment" onkeydown="if(event.key==='Enter')addComment('${r.id}')" aria-label="Add your comment"><button class="send" onclick="addComment('${r.id}')" aria-label="Send">${I('send', 20)}</button></div></div>
    <div class="acts">${items.map(card).join('') || '<p class="act__none">Nothing here yet</p>'}</div>`;
  return bare ? { filter, html } : `<section class="actsec"><div class="act-head"><b>${I('forum')}Activity</b>${filter}</div>${html}</section>`;
}
/* the Approvers List, as the app's: who approved (or rejected) on top, then the others who could have, faded */
function approversSheet(id) {
  const r = by('requests', id), rej = r.state === 'rejected', ok = wasApproved(r), others = (isDiet(r) ? DIET_APPROVERS : [r.approver]).filter(u => u !== r.approver);
  const card = (uid, faded) => { const x = user(uid); return `<div class="apr${faded ? ' apr--faded' : ''}${rej && !faded ? ' apr--bad' : ''}">${avatar(x.name)}<span class="grow"><b>${youName(uid)}</b><span>${esc(x.title)}</span></span>${uid === S.user || faded ? '' : iconBtn('call', `Call ${x.name}`, `toast('Calling ${esc(x.name)}')`)}</div>`; };
  openSheet(() => ({ title: 'Approvers List', bottom: true, body: `<p class="apr__h">${rej ? 'Rejected By' : ok ? 'Approved By' : 'To Be Approved By'}</p>${card(r.approver)}${others.length ? `<p class="apr__h">Could Also Approve</p>${others.map(u => card(u, true)).join('')}` : ''}` }));
}
/* no diet for a day: each feed time of the diet in force, given or not */
function skipView(r) {
  const w = currentDiet(r), all = r.feeds === 'all';
  return w ? `<div class="rsec">${w.diet.meals.map(m => `<div class="rsec__r">${I('schedule')}<span class="t"><span>${bandText(feed(m.feed))}</span><b>${all || r.feeds.includes(m.feed) ? 'Not given' : 'Given'}</b><p>${esc(m.items.map(i => item(i.item).name).join(', '))}</p></span></div>`).join('')}</div>` : '<div class="nodiet">No diet added here</div>';
}
function addComment(id) { const el = $('#cmt'), t = el && el.value.trim(); if (!t) return; by('requests', id).events.push({ kind: 'comment', by: S.user, at: nowStamp(), note: t }); storeSave(); render(); }
/* the one place the status shows: current status · time, the next step, and this person's buttons */
function nextLine(r) {
  const mineToDecide = r.approver === S.user, name = user(r.approver).name;
  if (r.state === 'pending') return mineToDecide ? 'Waiting for your approval' : `Waiting for ${name}`;
  if (r.state === 'delayed') return `${r.delay.reason}${r.delay.note ? '. ' + r.delay.note : ''}`;
  if (r.state === 'in_progress') { const back = [...r.events].reverse().find(e => ['started', 'reopened'].includes(e.kind));
    return back && back.kind === 'reopened' ? `${youName(back.by)}: ${esc(back.reason)}` : r.assignee ? `Job In Charge: ${youName(r.assignee)}` : back ? `By ${youName(back.by)}` : ''; }
  if (r.state === 'completed') return `By ${youName(lastEv(r, 'completed').by)}`;
  const e = lastEv(r, r.state === 'cancelled' ? 'cancelled' : r.state);
  if (r.state === 'approved') return isDiet(r) ? (r.kind === 'ask' ? 'The dietician builds the diet' : changesDiet(r) || r.kind === 'skip' ? 'In the diet · the kitchen has it' : 'With the kitchen') : `By ${youName(e.by)}`;
  return `${youName(e.by)}: ${e.reason}`;
}
/* the status bar, as the app's ButtonLogsComponent: Current Status · time, the status, a big line once it is decided ("You Approved",
   "Request Rejected"…), and this person's buttons. Approve goes at once, as the app; Reject asks a reason. The requester's Edit and
   Cancel are in the ⋮ menu, as the app */
function statusBar(r) {
  const a = actionsFor(r, me()), at = r.events.filter(e => !['comment', 'assigned'].includes(e.kind)).pop().at, s = stateOf(r), mine = e => e && e.by === S.user;
  const big = r.state === 'approved' ? (mine(lastEv(r, 'approved')) ? 'You Approved' : 'Approved') : r.state === 'rejected' ? 'Request Rejected' : r.state === 'cancelled' ? (mine(lastEv(r, 'cancelled')) ? 'You Canceled' : 'Request Canceled') : r.state === 'completed' ? (changesDiet(r) ? 'Diet Updated' : 'Request Completed') : '';
  const tone = r.state === 'rejected' ? ' az-statusbar--bad' : r.state === 'cancelled' ? ' az-statusbar--cancel' : r.state === 'approved' && mine(lastEv(r, 'approved')) ? ' az-statusbar--ok' : '';
  let btns = '';
  if (a.includes('approve')) btns = `<button class="az-btn az-btn--reject" onclick="reasonSheet('${r.id}','reject')">Reject</button><button class="az-btn az-btn--approve" onclick="doAct('${r.id}','approve')">${I('check')}Approve</button>`;
  /* the team's one next step, as the Help Desk app (the design system: one main green button; going back is outline) */
  else if (a.includes('start')) btns = `<button class="az-btn az-btn--approve" onclick="doAct('${r.id}','start')">${I('progress_activity')}Move To In Progress</button>`;
  else if (a.includes('complete')) btns = `<button class="az-btn az-btn--approve" onclick="completeSheet('${r.id}')">${I('task_alt')}${changesDiet(r) ? 'Diet Updated' : isDiet(r) ? 'Done' : 'Move To Completed'}</button>`;
  else if (a.includes('reopen')) btns = `<button class="az-btn az-btn--outline az-btn--approve" onclick="reasonSheet('${r.id}','reopen')">${I('undo')}Move Back To In Progress</button>`;
  return `<div class="az-statusbar${tone}"><span>Current Status • ${ago(at)} ago</span>${big ? `<b class="az-statusbar__big">${big}</b>` : `<b class="tone-${s.tone}">${esc(s.label)}</b>`}${sbLine(r)}${btns ? `<div class="az-statusbar__actions">${btns}</div>` : ''}</div>`;
}
/* who the request waits on, with their faces (Hub Help Desk and Incident Reporting: "Waiting on you · Site approver") */
function sbLine(r) {
  const ap = user(r.approver), x = dept(r.dept), team = r.assignee ? [user(r.assignee)] : (x.team || [x.head]).map(user);
  const who = r.state === 'pending' || r.state === 'delayed' ? [ap] : ['approved', 'in_progress'].includes(r.state) ? team : null;
  const t = r.state === 'pending' ? (r.approver === S.user ? `Your turn to approve · ${esc(ap.title)}` : `Waiting for ${esc(ap.name)} · ${esc(ap.title)}`) : nextLine(r);
  return `<span class="sb-who">${who ? `<span class="sb-avs">${who.slice(0, 3).map(u => avatar(u.name, '24')).join('')}</span>` : ''}<span>${t}</span></span>`;
}
const MENU_ACTS = ['assign', 'delay', 'edit', 'cancel'];
/* the more menu: what is not the main decision. The design system's Menu, not a sheet: record actions go in a menu (3 Nov) */
function moreMenu(id, btn) {
  const r = by('requests', id), a = actionsFor(r, me()), item = (icon, l, js, danger) => `<button role="menuitem"${danger ? ' class="az-danger"' : ''} onclick="closeMenu();${js}">${I(icon, 20)}${l}</button>`;
  const clone = isDiet(r) ? canRaise(me()) : true;
  openMenu(btn, [clone ? item('content_copy', 'Clone Request', `S.draft=null;go('#/new?clone=${id}')`) : '',
    a.includes('assign') ? item('badge', 'Job In Charge', `assignSheet('${id}')`) : '', a.includes('delay') ? item('timer', r.state === 'delayed' ? 'Change The Delay' : 'Delay', `delaySheet('${id}')`) : '',
    a.includes('edit') ? item('edit', 'Edit Request', `go('#/new?edit=${id}')`) : '', a.includes('cancel') ? item('do_not_disturb_on', 'Cancel Request', `reasonSheet('${id}','cancel')`, true) : ''].join('') || `<p class="az-menu__none">Nothing to do here</p>`);
}

/* ---------- sheets: approve · delay · reject or cancel · the animals ---------- */
let AP = {};
function approveSheet(id) { AP = { id, note: '' }; openSheet(() => {
  const r = by('requests', AP.id), lows = shortOf(r);
  return { title: `Approve ${r.id}?`, sub: esc(r.title), form: true, body: `${lows.map(x => `<div class="az-warnline">${I('warning', 18)}<span><b>${esc(x.item.name)}</b>: ${x.have <= 0 ? 'none' : 'only ' + stockText(x.item)} in stock, needs ${x.need} a day.</span></div>`).join('')}
    ${isDiet(r) ? (p => p.block ? `<div class="az-warnline az-warnline--bad">${I('error', 18)}<span>${esc(p.block)}</span></div>` : p.lines.length ? `<div class="az-hintline">${I('info', 18)}<span>${esc(p.lines.slice(0, 2).map(l => l.b).join('. '))}.</span></div>` : '')(planOf(r)) : ''}
    <label class="az-field"><span class="az-label">Note For ${esc(first(user(r.by).name))} (Optional)</span><span class="az-input az-input--text az-textarea"><textarea id="ap-note" rows="3" oninput="AP.note=this.value">${esc(AP.note)}</textarea></span></label>`,
    foot: `<button class="az-btn az-btn--outline" onclick="closeSheet()">Back</button><button class="az-btn" onclick="doAct(AP.id,'approve',{note:AP.note})">${I('check')}Approve</button>` };
}); }
let DL = {};
function delaySheet(id) { const r = by('requests', id); DL = { id, until: r.delay && r.delay.until > TODAY ? r.delay.until : addDays(TODAY, 2), reason: r.delay ? r.delay.reason : shortOf(r).length ? DELAY_REASONS[0] : null, note: r.delay ? r.delay.note : '' }; openSheet(delayHtml); }
function delayHtml() {
  const r = by('requests', DL.id), quick = [[1, 'Tomorrow'], [2, 'In 2 Days'], [7, 'In A Week']];
  return { title: `Delay ${r.id}`, sub: esc(r.title), form: true, body: `<div class="az-field"><span class="az-label">Ready From</span><div class="daychips">${quick.map(([n, l]) => `<button aria-pressed="${DL.until === addDays(TODAY, n)}" onclick="DL.until='${addDays(TODAY, n)}';redrawSheet()">${l}</button>`).join('')}</div>
    <label class="az-input az-input--text">${I('calendar_month')}<input type="date" id="dl-until" min="${addDays(TODAY, 1)}" value="${DL.until}" onchange="DL.until=this.value;redrawSheet()" aria-label="Ready From"></label></div>
    <div class="az-field"><span class="az-label">Reason</span>${DELAY_REASONS.map(t => `<button class="az-option" role="radio" aria-checked="${DL.reason === t}" onclick="DL.reason='${t}';redrawSheet()"><span>${t}</span>${I(DL.reason === t ? 'radio_button_checked' : 'radio_button_unchecked', 24, DL.reason === t)}</button>`).join('')}</div>
    <label class="az-field"><span class="az-label">Note (Optional)</span><span class="az-input az-input--text az-textarea"><textarea id="dl-note" rows="3" oninput="DL.note=this.value">${esc(DL.note)}</textarea></span></label>`,
    foot: `<button class="az-btn az-btn--outline" onclick="closeSheet()">Back</button><button class="az-btn"${DL.reason && DL.until > TODAY ? '' : ' disabled'} onclick="doAct(DL.id,'delay',{until:DL.until,reason:DL.reason,note:DL.note})">${I('timer')}Delay Till ${fmtDay(DL.until)}</button>` };
}
let RS = {};
function reasonSheet(id, kind) { RS = { id, kind, reason: '' }; openSheet(() => {
  const r = by('requests', RS.id), rej = RS.kind === 'reject', back = RS.kind === 'reopen';
  return { title: back ? 'Move Back To In Progress?' : `${rej ? 'Reject' : 'Cancel'} ${r.id}?`, sub: rej || back ? `${esc(user(r.by).name)} sees your reason` : `${esc(user(r.approver).name)} sees your reason`,
    form: true, body: `<label class="az-field"><span class="az-label">Reason <span class="az-req">*</span></span><span class="az-input az-input--text az-textarea"><textarea id="rs-reason" rows="4" oninput="RS.reason=this.value;document.getElementById('rs-go').disabled=this.value.trim().length<3">${esc(RS.reason)}</textarea></span></label>`,
    foot: `<button class="az-btn az-btn--outline" onclick="closeSheet()">Back</button><button id="rs-go" class="az-btn ${back ? '' : 'az-btn--reject'}"${RS.reason.trim().length < 3 ? ' disabled' : ''} onclick="doAct(RS.id,'${RS.kind}',{reason:RS.reason})">${back ? `${I('undo')}Move Back` : rej ? 'Reject Request' : 'Cancel Request'}</button>` };
}); setTimeout(() => { const t = $('#rs-reason'); if (t) t.focus(); }, 30); }
/* Job In Charge: one of the department's team, as the Help Desk app's Job Incharge */
let ASG = null;
function assignSheet(id) { ASG = id; const r = by('requests', id), x = dept(r.dept); optionSheet('Job In Charge', (x.team || [x.head]).map(u => [u, user(u).name, user(u).title]), r.assignee, 'pickAssignee'); }
function pickAssignee(v) { doAct(ASG, 'assign', { to: v }); }
/* Complete Request, as the Help Desk app: completion notes, team size, people involved, attachments */
let CP = {};
function completeSheet(id) { if (isDiet(by('requests', id))) return dietDoneSheet(id); const r = by('requests', id); CP = { id, note: '', team: 1, people: '', files: [] }; openSheet(() => ({
  title: `Complete ${r.id}?`, sub: esc(r.title), form: true,
  body: `<label class="az-field"><span class="az-label">Completion Notes</span><span class="az-input az-input--text az-textarea"><textarea id="cp-note" rows="3" oninput="CP.note=this.value">${esc(CP.note)}</textarea></span></label>
    <div class="az-field"><span class="az-label">Team Size</span><div class="qtyf"><button class="qtyf__b" aria-label="Fewer" onclick="CP.team=Math.max(1,CP.team-1);redrawSheet()">${I('remove')}</button><input id="cp-team" type="number" inputmode="numeric" min="1" value="${CP.team}" oninput="CP.team=Math.max(1,+this.value||1)" aria-label="Team Size"><span class="qtyf__u">${CP.team === 1 ? 'person' : 'people'}</span><button class="qtyf__b" aria-label="More" onclick="CP.team++;redrawSheet()">${I('add')}</button></div></div>
    <label class="az-field"><span class="az-label">People Involved</span><span class="az-input az-input--text"><input id="cp-people" placeholder="Names" value="${esc(CP.people)}" oninput="CP.people=this.value"></span></label>
    <div class="az-field"><span class="az-label">Attachments</span>${CP.files.length ? `<div class="files">${CP.files.map((f, i) => `<span class="file">${I(f.kind === 'image' ? 'image' : f.kind === 'pdf' ? 'picture_as_pdf' : 'description', 20)}${esc(f.name)}<button class="az-iconbtn" style="width:28px;height:28px" onclick="CP.files.splice(${i},1);redrawSheet()" aria-label="Remove ${esc(f.name)}">${I('close', 18)}</button></span>`).join('')}</div>` : ''}
    <button class="az-upload" onclick="addCpFile()"><i class="az-i" aria-hidden="true">add_photo_alternate</i><b>Add Photos Or Files</b><span>PDF, images or documents</span></button></div>`,
  foot: `<button class="az-btn az-btn--outline" onclick="closeSheet()">Back</button><button class="az-btn" onclick="doAct(CP.id,'complete',CP)">${I('task_alt')}Complete Request</button>` })); }
const CP_FILES = [{ name: 'First feed served.jpg', kind: 'image', size: '1.8 MB' }, { name: 'Feed sheet.pdf', kind: 'pdf', size: '180 KB' }];
function addCpFile() { const f = CP_FILES.find(x => !CP.files.some(y => y.name === x.name)); if (f) CP.files.push(f); redrawSheet(); }
const DONE = { approve: 'Approved', delay: 'Delayed', reject: 'Rejected', cancel: 'Canceled', start: 'In Progress', assign: 'Job In Charge Set', complete: 'Completed', reopen: 'Back To In Progress' };
function doAct(id, kind, x = {}) {
  const r = by('requests', id);
  try { act(r, kind, S.user, x); } catch (e) { toast(e.message); return; }
  storeSave(); closeAll(); toast(`${DONE[kind]} · ${id}`); render();
}
function animalsSheet(id) { animalsSheetFor(by('requests', id)); }
function animalsSheetFor(t) {
  const list = animalsIn(t);
  /* no count (owner, 19 Nov 2026: no animal counts in request screens); the title says where, as the Figma's sheet titles */
  const ts = targetsOf(t), one = ts.length === 1 ? ts[0] : null;
  openSheet(() => ({ title: one ? `Animals In ${one.level === 'species' ? species(one.sp).name : targetName(one)}` : 'Animals', sub: esc(one ? (one.level === 'species' ? species(one.sp).sci : species(one.sp).name) : placesText(ts)), body: list.length ? list.map(a => animalCard(a)).join('') : '<div class="nodiet">No animal here</div>' }), SH.length > 0);
}

/* ---------- Help Desk per device ---------- */
function vHelpDesk(parts) {
  const id = parts[1] || null;
  if (isPhone()) return id ? paneRequest(id, { cls: 'pane--fill' }) : paneHelpDesk({ cls: 'pane--fill' });
  const cur = id || (hdList(S.rTab)[0] || {}).id;
  return paneHelpDesk({ cls: isLand() ? 'pane--w420' : 'pane--w360', cur }) + (cur ? paneRequest(cur, { cls: 'pane--fill' }) : pane('pane--fill', topbar({ title: 'Request' }), empty1('No requests here')));
}
