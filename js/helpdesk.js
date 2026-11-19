// js/helpdesk.js — Help Desk, opened from Home › Modules › Help Desk. Every kind of request; Diet is one department.
// List as the Help Desk app (status count tabs, department chips, "Request (n)" with sort and filter, request cards, the add button).
// A request is the Antz record layout: white header (number · category and priority · requester with call and chat),
// details on a Field fill, What changes for a diet request, Activity with the comment box on top, and one current-status bar.

/* ---------- the list ---------- */
/* sub: the chips under Approved (approved · in_progress · completed) and Closed (rejected · cancelled · deleted); 'all' for the tab counts */
function hdList(tab, deptId = S.rDept, sub = 'all') {
  const u = me(), q = S.rQ.trim().toLowerCase();
  return D.requests.filter(r => visibleTo(r, u) && (tab === 'all' || tabOf(r) === tab) && (!HDSUBS[tab] || sub === 'all' || r.state === sub) && (deptId === 'all' || r.dept === deptId) && (S.rPrio === 'all' || r.prio === S.rPrio)
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
/* a diet request says which of the two it is, and its type: "Diet request · Skip a feed", "Diet change · Another diet" */
const catOf = r => isDiet(r) ? `${dgOf(dgroupOf(r))[1]} · ${dtOfKind(r.kind)[2]}` : dept(r.dept).name;
const siteOf = r => r.site ? by('sites', r.site).name : '';
const lastComment = r => [...r.events].reverse().find(e => e.kind === 'comment');
const stripTime = r => isOpen(r) || r.state === 'in_progress' ? `Since ${ago(lastAt(r))}` : fmtDay(lastAt(r).slice(0, 10));
function hdCard(r, cur = false) {
  const s = stateOf(r), c = lastComment(r), low = r.approver === S.user && isOpen(r) && shortOf(r).length;
  return `<a class="hdcard pick" href="#/requests/${r.id}"${cur ? ' aria-current="true"' : ''}>
    <span class="hdcard__top"><span class="grow"><b class="hdcard__id">${r.id}</b><span class="hdcard__cat">${esc(catOf(r))}</span><span class="hdcard__site">${esc(siteOf(r))}</span></span>${flag(r.prio)}</span>
    <span class="hdcard__body"><b class="hdcard__t">${esc(r.title)}</b><span class="hdcard__d">${esc(cardLine(r))}</span>
      <span class="hdcard__by"><b>${youName(r.by)}</b> • ${fmtDayY(r.events[0].at.slice(0, 10))}${low ? ` ${pill('pending', 'Low stock')}` : ''}${r.f && r.f.cost ? `<span class="amt-green">₹ ${(+r.f.cost).toLocaleString('en-IN')}</span>` : ''}${(r.files || []).length ? `<span class="hdcard__files">${I('attach_file', 18)}${r.files.length}</span>` : ''}</span></span>
    ${c ? `<span class="hdcard__cmt">${I('format_quote', 22, true)}<span><i>${esc(c.note)}</i><small>${youName(c.by)} ${fmtDayY(c.at.slice(0, 10))} • ${fmtTime(c.at)}</small></span></span>` : ''}
    <span class="az-strip az-strip--${s.tone}">${I(s.icon, 20)}${esc(s.label)}<span class="az-strip__time">${stripTime(r)}</span></span></a>`;
}
function paneHelpDesk({ cls = '', cur = null } = {}) {
  const deptsHere = DEPTS.filter(x => D.requests.some(r => r.dept === x.id && visibleTo(r, me())));
  if (S.rDept !== 'all' && !deptsHere.some(x => x.id === S.rDept)) S.rDept = 'all';
  const tabs = `<div class="az-counttabs az-counttabs--fit" role="tablist">${HDTABS.map(([k, l]) => `<button class="az-counttab" role="tab" aria-selected="${S.rTab === k}" onclick="S.rTab='${k}';S.rSub='all';go('#/requests')"><span class="az-counttab__in"><b>${hdList(k).length}</b><span>${l}</span></span></button>`).join('')}</div>`;
  const chips = `<div class="az-chips" role="tablist" aria-label="Department">${[{ id: 'all', name: 'All' }, ...deptsHere].map(x => `<button class="az-chip" role="tab" aria-selected="${S.rDept === x.id}" onclick="S.rDept='${x.id}';go('#/requests')">${x.name} - ${hdList(S.rTab, x.id, S.rSub).length}</button>`).join('')}</div>`;
  const search = S.rSearch ? `<div class="az-searchrow"><label class="az-search">${I('search', 20)}<input id="hd-q" placeholder="Search requests" value="${esc(S.rQ)}" oninput="S.rQ=this.value;render()" aria-label="Search requests"></label></div>` : '';
  /* under Approved (as the Help Desk app: All · Approved · In progress · Completed) and Closed (All · Rejected · Canceled · Deleted), each with its count; a chip with nothing in it is left out */
  const subOpts = (HDSUBS[S.rTab] || []).filter(([k]) => k === 'all' || k === S.rSub || hdList(S.rTab, S.rDept, k).length);
  const subs = subOpts.length > 2 ? `<div class="az-chips az-chips--sub" role="tablist" aria-label="${HDTABS.find(x => x[0] === S.rTab)[1]} requests">${subOpts.map(([k, l]) => `<button class="az-chip" role="tab" aria-selected="${S.rSub === k}" onclick="S.rSub='${k}';go('#/requests')">${l} - ${hdList(S.rTab, S.rDept, k).length}</button>`).join('')}</div>` : '';
  const list = hdList(S.rTab, S.rDept, S.rSub), filt = S.rPrio !== 'all';
  const count = `<p class="az-countline">Request (${list.length})<span class="hdtools">${iconBtn('swap_vert', `Sort: ${S.rSort === 'priority' ? 'priority' : 'newest'}`, "S.rSort=S.rSort==='priority'?'newest':'priority';render();toast('Sorted by '+(S.rSort==='priority'?'priority':'newest'))")}<button class="az-iconbtn${filt ? ' on' : ''}" onclick="hdFilterSheet()" aria-label="Filter">${I('tune')}</button></span></p>`;
  const body = `<div class="body">${subs}${count}${list.length ? `<div class="list list--16">${list.map(r => hdCard(r, cur === r.id)).join('')}</div>` : empty1('No requests here')}</div>${isPhone() ? `<a class="az-fab" href="#/new" aria-label="New request">${I('add_circle', 32)}</a>` : `<a class="az-fab az-fab--pill az-fab--no-nav" href="#/new">${I('add_circle')}New Request</a>`}`;
  return pane(cls, topbar({ back: '#/home', title: 'Help Desk', end: whoBtn(), actions: iconBtn('search', 'Search requests', "S.rSearch=!S.rSearch;S.rQ='';render();setTimeout(()=>{const i=document.getElementById('hd-q');if(i)i.focus()},30)") }) + search + chips + tabs, body, '', 'hd');
}
function hdFilterSheet() { optionSheet('Priority', [['all', 'All priorities'], ...Object.entries(PRIO).map(([k, [, l]]) => [k, l, PRI_TEXT[k]])], S.rPrio, 'pickRPrio'); }
function pickRPrio(v) { S.rPrio = v; closeAll(); render(); }

/* ---------- one request (record layout) ---------- */
const lastEv = (r, k) => [...r.events].reverse().find(e => e.kind === k);
const EVT = { raised: ['Request raised', 'send', ''], edited: ['Request edited', 'edit', ''], delayed: ['Delayed', 'timer', 'wait'], approved: ['Approved', 'check', 'ok'], rejected: ['Rejected', 'close', 'bad'], cancelled: ['Canceled', 'do_not_disturb_on', 'bad'],
  started: ['Moved to In progress', 'progress_activity', 'ok'], assigned: ['Job in charge', 'badge', ''], completed: ['Completed', 'task_alt', 'ok'], reopened: ['Moved back to In progress', 'undo', 'wait'] };
/* what the team wrote when completing: the notes, the team, the files */
const teamText = e => [plural(e.team || 1, 'person', 'people'), e.people].filter(Boolean).join(' · ');
const fileBtns = fs => `<span class="files">${fs.map(f => `<button class="file" onclick="toast('Opens ${esc(f.name)}')">${I(f.kind === 'image' ? 'image' : f.kind === 'pdf' ? 'picture_as_pdf' : 'description', 20)}${esc(f.name)}</button>`).join('')}</span>`;
/* a request's facts, said once for every version of the page (reqviews.js): { k, icon, label, v } in the order the Help Desk app shows them */
const REQ_JI = { Feed: 'schedule', From: 'event', 'Which day': 'event', 'Needed from': 'event', 'Start from': 'restaurant', Food: 'restaurant', When: 'event', With: 'schedule', Medicine: 'medication', Dose: 'science', 'Mix into': 'schedule', For: 'date_range', 'Which feed': 'schedule', 'What was wrong': 'report' };
function reqFacts(r) {
  const acts = actionsFor(r, me()), F = [], add = (k, icon, label, v) => F.push({ k, icon, label, v });
  add('site', 'location_on', 'Requesting site', `<b>${esc(siteOf(r))}</b>`);
  add('req', 'subject', 'Request', `<b>${esc(r.title)}</b>${r.text ? `<p>${esc(r.text)}</p>` : ''}`);
  /* the department's own answers */
  const form = DEPT_FORMS[r.dept];
  if (form && r.f) form.fields.forEach(x => { const v = r.f[x.k];
    const t = x.type === 'switch' ? (v ? 'Yes' : 'No') : x.type === 'date' ? (v ? fmtDayY(v) : '') : x.type === 'money' ? (v ? `₹ ${(+v).toLocaleString('en-IN')}` : '') : x.type === 'items' ? (v || []).map(i => `${esc(i.name)} × ${i.qty}`).join('<br>') : esc(v || '');
    if (t) add('form', x.icon, x.label, `<b${x.type === 'money' ? ' class="amt-green"' : ''}>${t}</b>`); });
  if (isDiet(r)) {
    const ts = targetsOf(r), s = r.kind === 'items' ? slotFor(r) : null, n = animalsIn(r).length;
    const forText = ts.length > 1 ? placesText(ts) : `${species(r.sp).name} · ${ts[0].group ? `${GROUP_WORD(ts[0].group)} only` : placeText(r)}`;
    add('for', 'pets', 'For', `<b>${esc(forText)}</b><button class="lnk" onclick="animalsSheet('${r.id}')">See animals${I('chevron_right', 18)}</button>`);
    if (s && diet(r.base)) add('diet', 'restaurant', 'Diet to change', `<b>${esc(diet(r.base).name)}</b><span>Set for ${esc(whereSet(s))}</span>${!ended(s) ? `<a class="lnk" href="#/diets/${s.sp}/${s.id}">Open diet${I('chevron_right', 18)}</a>` : ''}`);
    if (r.kind === 'items' && r.base === 'many') add('diet', 'restaurant', 'Diets to change', '<b>All their diets, changed by item</b>');
    if (r.kind === 'new') add('diet', 'restaurant', 'New diet', `<b>${esc(r.name || (planOf(r).ops.find(o => o.type === 'new') || {}).name || 'New diet')}</b><span>${r.base && diet(r.base) ? `From ${esc(diet(r.base).name)}` : 'Made from empty'}</span>`);
    if (r.kind === 'diet' && r.base && diet(r.base)) add('diet', 'restaurant', 'Instead of', `<b>${esc(diet(r.base).name)}</b>`);
    if (r.kind === 'end') add('diet', 'restaurant', 'Diet to end', (r.ends || []).map(id => { const a = by('assigns', id); return `<b>${esc(diet(a.diet).name)}</b><span>Set for ${esc(whereSet(a))}</span>`; }).join(''));
    if (JOB_KINDS.includes(r.kind)) ((r.f && r.f.rows) || []).forEach(([k, v]) => add('job', REQ_JI[k] || 'info', k, `<b>${esc(v)}</b>`));
    else add('when', 'event', r.kind === 'end' ? 'Last day' : r.kind === 'skip' ? 'When' : 'How long', `<b>${r.kind === 'skip' ? `${wday(r.date)} ${fmtDayY(r.date)} · ${r.feeds === 'all' ? 'all feeds' : r.feeds.map(f => bandText(feed(f))).join(', ')}` : r.kind === 'end' ? `${wday(r.stop)} ${fmtDayY(r.stop)}` : howText(r)}</b>${r.how && r.kind !== 'skip' ? ktag(HOW_KIND[r.how]) : ''}`);
  }
  /* the work after approval: who is in charge (the team can change it while in progress), and what the team wrote when completing */
  if (['in_progress', 'completed'].includes(r.state)) {
    const can = acts.includes('assign'), who = r.assignee ? user(r.assignee) : null, done = r.state === 'completed' ? lastEv(r, 'completed') : null;
    if (who || can) add('assign', 'badge', 'Job in charge', `${who ? `<span class="person">${avatar(who.name, '24')}<span><b>${youName(r.assignee)}</b><span>${esc(who.title)}</span></span></span>` : ''}${can ? `<button class="lnk" onclick="assignSheet('${r.id}')">${who ? 'Change' : `${I('add', 18)}Add`}</button>` : ''}`);
    if (done) {
      if (done.note) add('done', 'task_alt', 'Completion notes', `<p>${esc(done.note)}</p>`);
      if (!isDiet(r)) add('done', 'groups', 'Team', `<b>${esc(teamText(done))}</b>`);
      if ((done.files || []).length) add('done', 'attach_file', 'Completion files', fileBtns(done.files));
    }
  }
  if (isDiet(r) && r.reason) add('reason', 'label', 'Reason', `<b>${esc(r.reason)}</b>`);
  /* the approval, as the app: its label follows the status, the approver's card, and View for the Approvers List */
  { const ap = user(r.approver), rej = r.state === 'rejected', ok = wasApproved(r), e = lastEv(r, rej ? 'rejected' : 'approved');
    add('appr', rej ? 'block' : ok ? 'verified' : 'how_to_reg', rej ? 'Approval rejected' : ok ? 'Approved' : 'Awaiting approval', `<span class="person">${avatar(ap.name, '24')}<span><b>${youName(r.approver)}</b><span>${esc(ap.title)}${(ok || rej) && e ? ` · ${fmtAt(e.at)}` : ''}</span></span></span><button class="lnk" onclick="approversSheet('${r.id}')">View${I('chevron_right', 18)}</button>`); }
  if (r.note) add('note', 'sticky_note_2', 'Note to kitchen', `<p>${esc(r.note)}</p>`);
  if ((r.files || []).length) add('files', 'attach_file', plural(r.files.length, 'Attachment'), fileBtns(r.files));
  return F;
}
/* the Request page in the version picked in Prototype controls (owner, 19 Nov 2026: "more iterations, check with the Hub designs") */
function paneRequest(id, o = {}) { const v = S.rdv || RD_DEFAULT; return v === 'b' ? paneRequestB(id, o) : v === 'c' ? paneRequestC(id, o) : paneRequestA(id, o); }
/* A · Help Desk: as the Help Desk app's RequestDetails and Sourav's Help Desk build on the Hub */
function paneRequestA(id, { cls = '' } = {}) {
  const r = by('requests', id), back = isPhone() ? '#/requests' : '';
  if (!r || !visibleTo(r, me())) return pane(cls, topbar({ back, title: 'Request' }), empty1('Not one of your requests'));
  /* as the Help Desk app's RequestDetails: the ⋮ menu always (Clone request), then a dark summary (department, priority, when, Edited, the requester), one
     container of rows (Requesting site, Request, …, the approval, attachments), Activity with its filter, and the status bar (owner, 18 Nov 2026).
     19 Nov: the top bar is dark too, so the header reads as one block, as the Hub's Help Desk */
  const more = iconBtn('more_vert', 'More', `moreMenu('${r.id}',this)`);
  const req = user(r.by), edited = r.events.some(e => e.kind === 'edited');
  const head = `<div class="rhead rhead--dark"><span class="rhead__row"><span class="az-dept">${I(isDiet(r) ? KIND[r.kind][1] : dept(r.dept).icon, 20)}</span><span class="rhead__catn">${esc(catOf(r))}</span>${flag(r.prio)}</span>
    <span class="meta">${wday(r.events[0].at.slice(0, 10))} ${fmtAt(r.events[0].at)}${edited ? '<span class="rhead__edited">Edited</span>' : ''}</span>
    <span class="rhead__who">${avatar(req.name)}<span class="grow"><span class="az-who__name">${youName(r.by)}</span><span class="az-who__sub">${esc(req.title)}</span></span>${r.by === S.user ? '' : iconBtn('call', `Call ${req.name}`, `toast('Calling ${esc(req.name)}')`) + iconBtn('chat', `Chat with ${req.name}`, `toast('Chat with ${esc(req.name)}')`)}</span></div>`;
  const row = (icon, k, v) => `<div class="rsec__r">${I(icon)}<span class="t"><span>${k}</span>${v}</span></div>`;
  let body = `<div class="rsec">${reqFacts(r).map(f => row(f.icon, f.label, f.v)).join('')}</div>`;
  body += reqLowStock(r);
  if (isDiet(r)) { const [t, lines] = reqLines(r); if (lines) body += `<p class="secttl">${t}</p>${lines}`; body += saveAsSec(r) + reqEffect(r) + reqDietNow(r); }
  body += activityView(r);
  /* the record header scrolls away with the request; only the top bar and the status bar stay */
  return pane(`${cls} req-a`, topbar({ back, title: r.id, actions: more }), head + `<div class="body">${body}</div>`, statusBar(r), `req-${r.id}`);
}
/* Activity, as the app's: Show all · Comments · Status updates, "Add your comment", and each status change as old → new in its colour */
const ST_TO = { raised: 'Awaiting approval', edited: 'Awaiting approval', delayed: 'Delayed', approved: 'Approved', rejected: 'Rejected', cancelled: 'Canceled', started: 'In progress', completed: 'Completed', reopened: 'In progress' };
const ST_TONE = { 'Awaiting approval': 'wait', Delayed: 'wait', Approved: 'ok', 'In progress': 'prog', Completed: 'done', 'Diet updated': 'done', Rejected: 'bad', Canceled: 'cancel' };
const stPill = t => `<span class="stp stp--${ST_TONE[t] || 'wait'}">${esc(t)}</span>`;
function activityView(r) {
  const f = S.actF || 'all'; let prev = null;
  const items = r.events.map(e => { if (e.kind === 'comment' || e.kind === 'assigned') return { e }; const to = e.kind === 'completed' && changesDiet(r) ? 'Diet updated' : ST_TO[e.kind], x = { e, from: e.kind === 'raised' ? null : prev, to }; prev = to; return x; })
    .filter(x => f === 'all' || (f === 'c' ? x.e.kind === 'comment' : x.e.kind !== 'comment')).reverse();
  /* (19 Nov) each entry in a tinted box, as the Hub's Help Desk: a comment is a yellow note, a status change a light cyan box, raised or edited grey */
  const card = x => { const e = x.e, who = `<span class="act__who">${avatar(user(e.by).name, '24')}<b>${youName(e.by)}</b><span>${fmtAt(e.at)}</span></span>`;
    if (e.kind === 'comment') return `<div class="act">${who}<div class="act__box act__box--note"><p>${esc(e.note)}</p></div></div>`;
    if (e.kind === 'assigned') return `<div class="act">${who}<div class="act__box"><small>Update</small><p>Job in charge: <b>${youName(e.to)}</b></p></div></div>`;
    const t = e.kind === 'raised' ? 'Request raised' : e.kind === 'edited' ? 'Request edited' : e.kind === 'delayed' ? `Delayed till ${fmtDay(e.until)}` : '';
    const box = e.kind === 'raised' || e.kind === 'edited' ? '' : ` act__box--${ST_TONE[x.to] || 'wait'}`;
    return `<div class="act act--st">${who}<div class="act__box${box}"><small>${t ? 'Update' : 'Status update'}</small><p class="act__st">${t ? `<span class="act__t">${t}</span>` : ''}${x.from && x.from !== x.to ? `${stPill(x.from)}${I('arrow_forward', 16)}` : ''}${stPill(x.to)}</p>${e.reason || e.note ? `<p>${esc([e.reason, e.note].filter(Boolean).join('. '))}</p>` : ''}${e.kind === 'completed' && !isDiet(r) ? `<p class="plain">${esc(teamText(e))}</p>` : ''}${(e.files || []).length ? fileBtns(e.files) : ''}</div></div>`; };
  return `<div class="act-head"><p class="secttl">Activity</p><div class="az-chips act-f" role="tablist" aria-label="Show">${[['all', 'Show all'], ['c', 'Comments'], ['s', 'Status updates']].map(([k, l]) => `<button class="az-chip" role="tab" aria-selected="${f === k}" onclick="S.actF='${k}';render()">${l}</button>`).join('')}</div></div>
    <div class="act-list"><div class="az-composer">${avatar(me().name)}<input id="cmt" placeholder="Add your comment" onkeydown="if(event.key==='Enter')addComment('${r.id}')" aria-label="Add your comment"><button class="send" onclick="addComment('${r.id}')" aria-label="Send">${I('send', 20)}</button></div>
    <div class="acts">${items.map(card).join('') || '<p class="act__none">Nothing here yet</p>'}</div></div>`;
}
/* the Approvers List, as the app's: who approved (or rejected) on top, then the others who could have, faded */
function approversSheet(id) {
  const r = by('requests', id), rej = r.state === 'rejected', ok = wasApproved(r), others = (isDiet(r) ? DIET_APPROVERS : [r.approver]).filter(u => u !== r.approver);
  const card = (uid, faded) => { const x = user(uid); return `<div class="apr${faded ? ' apr--faded' : ''}${rej && !faded ? ' apr--bad' : ''}">${avatar(x.name)}<span class="grow"><b>${youName(uid)}</b><span>${esc(x.title)}</span></span>${uid === S.user || faded ? '' : iconBtn('call', `Call ${x.name}`, `toast('Calling ${esc(x.name)}')`)}</div>`; };
  openSheet(() => ({ title: 'Approvers List', bottom: true, body: `<p class="apr__h">${rej ? 'Rejected by' : ok ? 'Approved by' : 'To be approved by'}</p>${card(r.approver)}${others.length ? `<p class="apr__h">Could also approve</p>${others.map(u => card(u, true)).join('')}` : ''}` }));
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
    return back && back.kind === 'reopened' ? `${youName(back.by)}: ${esc(back.reason)}` : r.assignee ? `Job in charge: ${youName(r.assignee)}` : back ? `By ${youName(back.by)}` : ''; }
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
  const big = r.state === 'approved' ? (mine(lastEv(r, 'approved')) ? 'You Approved' : 'Approved') : r.state === 'rejected' ? 'Request Rejected' : r.state === 'cancelled' ? (mine(lastEv(r, 'cancelled')) ? 'You Canceled' : 'Request Canceled') : r.state === 'completed' ? (changesDiet(r) ? 'Diet updated' : 'Request Completed') : '';
  const tone = r.state === 'rejected' ? ' az-statusbar--bad' : r.state === 'cancelled' ? ' az-statusbar--cancel' : r.state === 'approved' && mine(lastEv(r, 'approved')) ? ' az-statusbar--ok' : '';
  let btns = '';
  if (a.includes('approve')) btns = `<button class="az-btn az-btn--reject" onclick="reasonSheet('${r.id}','reject')">Reject</button><button class="az-btn az-btn--approve" onclick="doAct('${r.id}','approve')">${I('check')}Approve</button>`;
  /* the team's one next step, as the Help Desk app (the design system: one main green button; going back is outline) */
  else if (a.includes('start')) btns = `<button class="az-btn az-btn--approve" onclick="doAct('${r.id}','start')">${I('progress_activity')}Move to In progress</button>`;
  else if (a.includes('complete')) btns = `<button class="az-btn az-btn--approve" onclick="completeSheet('${r.id}')">${I('task_alt')}${changesDiet(r) ? 'Diet updated' : isDiet(r) ? 'Done' : 'Move to Completed'}</button>`;
  else if (a.includes('reopen')) btns = `<button class="az-btn az-btn--outline az-btn--approve" onclick="reasonSheet('${r.id}','reopen')">${I('undo')}Move back to In progress</button>`;
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
  openMenu(btn, [clone ? item('content_copy', 'Clone request', `S.draft=null;go('#/new?clone=${id}')`) : '',
    a.includes('assign') ? item('badge', 'Job in charge', `assignSheet('${id}')`) : '', a.includes('delay') ? item('timer', r.state === 'delayed' ? 'Change the delay' : 'Delay', `delaySheet('${id}')`) : '',
    a.includes('edit') ? item('edit', 'Edit request', `go('#/new?edit=${id}')`) : '', a.includes('cancel') ? item('do_not_disturb_on', 'Cancel request', `reasonSheet('${id}','cancel')`, true) : ''].join('') || `<p class="az-menu__none">Nothing to do here</p>`);
}

/* ---------- sheets: approve · delay · reject or cancel · the animals ---------- */
let AP = {};
function approveSheet(id) { AP = { id, note: '' }; openSheet(() => {
  const r = by('requests', AP.id), lows = shortOf(r);
  return { title: `Approve ${r.id}?`, sub: esc(r.title), form: true, body: `${lows.map(x => `<div class="az-warnline">${I('warning', 18)}<span><b>${esc(x.item.name)}</b>: ${x.have <= 0 ? 'none' : 'only ' + stockText(x.item)} in stock, needs ${x.need} a day.</span></div>`).join('')}
    ${isDiet(r) ? (p => p.block ? `<div class="az-warnline az-warnline--bad">${I('error', 18)}<span>${esc(p.block)}</span></div>` : p.lines.length ? `<div class="az-hintline">${I('info', 18)}<span>${esc(p.lines.slice(0, 2).map(l => l.b).join('. '))}.</span></div>` : '')(planOf(r)) : ''}
    <label class="az-field"><span class="az-label">Note for ${esc(first(user(r.by).name))} (optional)</span><span class="az-input az-input--text az-textarea"><textarea id="ap-note" rows="3" oninput="AP.note=this.value">${esc(AP.note)}</textarea></span></label>`,
    foot: `<button class="az-btn az-btn--outline" onclick="closeSheet()">Back</button><button class="az-btn" onclick="doAct(AP.id,'approve',{note:AP.note})">${I('check')}Approve</button>` };
}); }
let DL = {};
function delaySheet(id) { const r = by('requests', id); DL = { id, until: r.delay && r.delay.until > TODAY ? r.delay.until : addDays(TODAY, 2), reason: r.delay ? r.delay.reason : shortOf(r).length ? DELAY_REASONS[0] : null, note: r.delay ? r.delay.note : '' }; openSheet(delayHtml); }
function delayHtml() {
  const r = by('requests', DL.id), quick = [[1, 'Tomorrow'], [2, 'In 2 days'], [7, 'In a week']];
  return { title: `Delay ${r.id}`, sub: esc(r.title), form: true, body: `<div class="az-field"><span class="az-label">Ready from</span><div class="daychips">${quick.map(([n, l]) => `<button aria-pressed="${DL.until === addDays(TODAY, n)}" onclick="DL.until='${addDays(TODAY, n)}';redrawSheet()">${l}</button>`).join('')}</div>
    <label class="az-input az-input--text">${I('calendar_month')}<input type="date" id="dl-until" min="${addDays(TODAY, 1)}" value="${DL.until}" onchange="DL.until=this.value;redrawSheet()" aria-label="Ready from"></label></div>
    <div class="az-field"><span class="az-label">Reason</span>${DELAY_REASONS.map(t => `<button class="az-option" role="radio" aria-checked="${DL.reason === t}" onclick="DL.reason='${t}';redrawSheet()"><span>${t}</span>${I(DL.reason === t ? 'radio_button_checked' : 'radio_button_unchecked', 24, DL.reason === t)}</button>`).join('')}</div>
    <label class="az-field"><span class="az-label">Note (optional)</span><span class="az-input az-input--text az-textarea"><textarea id="dl-note" rows="3" oninput="DL.note=this.value">${esc(DL.note)}</textarea></span></label>`,
    foot: `<button class="az-btn az-btn--outline" onclick="closeSheet()">Back</button><button class="az-btn"${DL.reason && DL.until > TODAY ? '' : ' disabled'} onclick="doAct(DL.id,'delay',{until:DL.until,reason:DL.reason,note:DL.note})">${I('timer')}Delay till ${fmtDay(DL.until)}</button>` };
}
let RS = {};
function reasonSheet(id, kind) { RS = { id, kind, reason: '' }; openSheet(() => {
  const r = by('requests', RS.id), rej = RS.kind === 'reject', back = RS.kind === 'reopen';
  return { title: back ? 'Move back to In progress?' : `${rej ? 'Reject' : 'Cancel'} ${r.id}?`, sub: rej || back ? `${esc(user(r.by).name)} sees your reason` : `${esc(user(r.approver).name)} sees your reason`,
    form: true, body: `<label class="az-field"><span class="az-label">Reason <span class="az-req">*</span></span><span class="az-input az-input--text az-textarea"><textarea id="rs-reason" rows="4" oninput="RS.reason=this.value;document.getElementById('rs-go').disabled=this.value.trim().length<3">${esc(RS.reason)}</textarea></span></label>`,
    foot: `<button class="az-btn az-btn--outline" onclick="closeSheet()">Back</button><button id="rs-go" class="az-btn ${back ? '' : 'az-btn--reject'}"${RS.reason.trim().length < 3 ? ' disabled' : ''} onclick="doAct(RS.id,'${RS.kind}',{reason:RS.reason})">${back ? `${I('undo')}Move back` : rej ? 'Reject request' : 'Cancel request'}</button>` };
}); setTimeout(() => { const t = $('#rs-reason'); if (t) t.focus(); }, 30); }
/* Job in charge: one of the department's team, as the Help Desk app's Job Incharge */
let ASG = null;
function assignSheet(id) { ASG = id; const r = by('requests', id), x = dept(r.dept); optionSheet('Job in charge', (x.team || [x.head]).map(u => [u, user(u).name, user(u).title]), r.assignee, 'pickAssignee'); }
function pickAssignee(v) { doAct(ASG, 'assign', { to: v }); }
/* Complete request, as the Help Desk app: completion notes, team size, people involved, attachments */
let CP = {};
function completeSheet(id) { if (isDiet(by('requests', id))) return dietDoneSheet(id); const r = by('requests', id); CP = { id, note: '', team: 1, people: '', files: [] }; openSheet(() => ({
  title: `Complete ${r.id}?`, sub: esc(r.title), form: true,
  body: `<label class="az-field"><span class="az-label">Completion notes</span><span class="az-input az-input--text az-textarea"><textarea id="cp-note" rows="3" oninput="CP.note=this.value">${esc(CP.note)}</textarea></span></label>
    <div class="az-field"><span class="az-label">Team size</span><div class="qtyf"><button class="qtyf__b" aria-label="Fewer" onclick="CP.team=Math.max(1,CP.team-1);redrawSheet()">${I('remove')}</button><input id="cp-team" type="number" inputmode="numeric" min="1" value="${CP.team}" oninput="CP.team=Math.max(1,+this.value||1)" aria-label="Team size"><span class="qtyf__u">${CP.team === 1 ? 'person' : 'people'}</span><button class="qtyf__b" aria-label="More" onclick="CP.team++;redrawSheet()">${I('add')}</button></div></div>
    <label class="az-field"><span class="az-label">People involved</span><span class="az-input az-input--text"><input id="cp-people" placeholder="Names" value="${esc(CP.people)}" oninput="CP.people=this.value"></span></label>
    <div class="az-field"><span class="az-label">Attachments</span>${CP.files.length ? `<div class="files">${CP.files.map((f, i) => `<span class="file">${I(f.kind === 'image' ? 'image' : f.kind === 'pdf' ? 'picture_as_pdf' : 'description', 20)}${esc(f.name)}<button class="az-iconbtn" style="width:28px;height:28px" onclick="CP.files.splice(${i},1);redrawSheet()" aria-label="Remove ${esc(f.name)}">${I('close', 18)}</button></span>`).join('')}</div>` : ''}
    <button class="az-upload" onclick="addCpFile()"><i class="az-i" aria-hidden="true">add_photo_alternate</i><b>Add photos or files</b><span>PDF, images or documents</span></button></div>`,
  foot: `<button class="az-btn az-btn--outline" onclick="closeSheet()">Back</button><button class="az-btn" onclick="doAct(CP.id,'complete',CP)">${I('task_alt')}Complete request</button>` })); }
const CP_FILES = [{ name: 'First feed served.jpg', kind: 'image', size: '1.8 MB' }, { name: 'Feed sheet.pdf', kind: 'pdf', size: '180 KB' }];
function addCpFile() { const f = CP_FILES.find(x => !CP.files.some(y => y.name === x.name)); if (f) CP.files.push(f); redrawSheet(); }
const DONE = { approve: 'Approved', delay: 'Delayed', reject: 'Rejected', cancel: 'Canceled', start: 'In progress', assign: 'Job in charge set', complete: 'Completed', reopen: 'Back to In progress' };
function doAct(id, kind, x = {}) {
  const r = by('requests', id);
  try { act(r, kind, S.user, x); } catch (e) { toast(e.message); return; }
  storeSave(); closeAll(); toast(`${DONE[kind]} · ${id}`); render();
}
function animalsSheet(id) { animalsSheetFor(by('requests', id)); }
function animalsSheetFor(t) {
  const list = animalsIn(t);
  openSheet(() => ({ title: 'Animals', sub: `${esc(targetsOf(t).length > 1 ? placesText(targetsOf(t)) : `${species(t.sp).name} · ${placeText(t)}`)} · ${list.length}`, body: list.length ? list.map(a => animalCard(a)).join('') : '<div class="nodiet">No animal here</div>' }), SH.length > 0);
}

/* ---------- Help Desk per device ---------- */
function vHelpDesk(parts) {
  const id = parts[1] || null;
  if (isPhone()) return id ? paneRequest(id, { cls: 'pane--fill' }) : paneHelpDesk({ cls: 'pane--fill' });
  const cur = id || (hdList(S.rTab)[0] || {}).id;
  return paneHelpDesk({ cls: isLand() ? 'pane--w420' : 'pane--w360', cur }) + (cur ? paneRequest(cur, { cls: 'pane--fill' }) : pane('pane--fill', topbar({ title: 'Request' }), empty1('No requests here')));
}
