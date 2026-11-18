// js/helpdesk.js — Help Desk, opened from Home › Modules › Help Desk. Every kind of request; Diet is one department.
// List as the Help Desk app (status count tabs, department chips, "Request (n)" with sort and filter, request cards, the add button).
// A request is the Antz record layout: white header (number · category and priority · requester with call and chat),
// details on a Field fill, What changes for a diet request, Activity with the comment box on top, and one current-status bar.

/* ---------- the list ---------- */
/* sub: under Approved, the app's chips (approved · in_progress · completed); 'all' for the tab counts */
function hdList(tab, deptId = S.rDept, sub = 'all') {
  const u = me(), q = S.rQ.trim().toLowerCase();
  return D.requests.filter(r => visibleTo(r, u) && (tab === 'all' || tabOf(r) === tab) && (tab !== 'approved' || sub === 'all' || r.state === sub) && (deptId === 'all' || r.dept === deptId) && (S.rPrio === 'all' || r.prio === S.rPrio)
    && (!q || [r.id, r.title, r.text, dept(r.dept).name, isDiet(r) ? species(r.sp).name : ''].some(x => (x || '').toLowerCase().includes(q))))
    .sort((a, b) => (S.rSort === 'priority' ? PRIO_RANK[a.prio] - PRIO_RANK[b.prio] : 0) || (lastAt(a) < lastAt(b) ? 1 : -1));
}
const ago = s => { const m = Math.round((Date.now() - new Date(s)) / 6e4); return m < 60 ? `${Math.max(m, 1)} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`; };
const flag = p => `<span class="az-flag${p === 'high' ? ' az-flag--high' : p === 'emergency' ? ' az-flag--emergency' : ''}" title="${PRIO[p][1]} priority" aria-label="${PRIO[p][1]} priority">${p === 'emergency' ? I('local_fire_department', 20, true) : PRIO[p][0]}</span>`;
/* what a diet request asks for, in plain words; other requests show their description */
function whatOf(r) {
  if (!isDiet(r)) return r.text;
  const base = diet(r.base);
  if (r.kind === 'skip') return `No diet ${onDay(r.date)} · ${r.feeds === 'all' ? 'all feeds' : r.feeds.map(f => bandText(feed(f))).join(', ') + ' only'}`;
  if (r.kind === 'end') return `${(r.ends || []).map(id => diet(by('assigns', id).diet).name).join(', ')} · last day ${fmtDay(r.stop)}`;
  if (r.kind === 'new') return `${r.name || 'New diet'} · ${howText(r)}`;
  if (r.kind === 'items' && r.base === 'many') return (r.rules || []).map(ruleText).join(', ');
  return r.kind === 'items' ? r.changes.map(c => changeText(c, base)).join(', ') : `${base ? base.name : 'No diet'} → ${diet(r.diet).name}`;
}
/* the card's second line: what changes, or, when the title already says that (a diet request names itself), who it is for and why */
const cardLine = r => { const w = whatOf(r); return w !== r.title || !isDiet(r) ? w : [targetsOf(r).length > 1 ? placesText(targetsOf(r)) : `${species(r.sp).name} · ${placeText(r)}`, r.reason].filter(Boolean).join(' · '); };
const catOf = r => isDiet(r) ? `Diet · ${KIND[r.kind][0]}` : dept(r.dept).name;
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
  const tabs = `<div class="az-counttabs" role="tablist">${HDTABS.map(([k, l]) => `<button class="az-counttab" role="tab" aria-selected="${S.rTab === k}" onclick="S.rTab='${k}';go('#/requests')"><span class="az-counttab__in"><b>${hdList(k).length}</b><span>${l}</span></span></button>`).join('')}</div>`;
  const chips = `<div class="az-chips" role="tablist" aria-label="Department">${[{ id: 'all', name: 'All' }, ...deptsHere].map(x => `<button class="az-chip" role="tab" aria-selected="${S.rDept === x.id}" onclick="S.rDept='${x.id}';go('#/requests')">${x.name} - ${hdList(S.rTab, x.id, S.rSub).length}</button>`).join('')}</div>`;
  const search = S.rSearch ? `<div class="az-searchrow"><label class="az-search">${I('search', 20)}<input id="hd-q" placeholder="Search requests" value="${esc(S.rQ)}" oninput="S.rQ=this.value;render()" aria-label="Search requests"></label></div>` : '';
  /* under Approved, as the Help Desk app: All · Approved · In progress · Completed, each with its count */
  const subs = S.rTab === 'approved' ? `<div class="az-chips az-chips--sub" role="tablist" aria-label="Approved requests">${HDSUB.map(([k, l]) => `<button class="az-chip" role="tab" aria-selected="${S.rSub === k}" onclick="S.rSub='${k}';go('#/requests')">${l} - ${hdList('approved', S.rDept, k).length}</button>`).join('')}</div>` : '';
  const list = hdList(S.rTab, S.rDept, S.rSub), filt = S.rPrio !== 'all';
  const count = `<p class="az-countline">Request (${list.length})<span class="hdtools">${iconBtn('swap_vert', `Sort: ${S.rSort === 'priority' ? 'priority' : 'newest'}`, "S.rSort=S.rSort==='priority'?'newest':'priority';render();toast('Sorted by '+(S.rSort==='priority'?'priority':'newest'))")}<button class="az-iconbtn${filt ? ' on' : ''}" onclick="hdFilterSheet()" aria-label="Filter">${I('tune')}</button></span></p>`;
  const body = `<div class="body">${subs}${count}${list.length ? `<div class="list list--16">${list.map(r => hdCard(r, cur === r.id)).join('')}</div>` : empty1('No requests here')}</div>${isPhone() ? `<a class="az-fab" href="#/new" aria-label="New request">${I('add_circle', 32)}</a>` : `<a class="az-fab az-fab--pill az-fab--no-nav" href="#/new">${I('add_circle')}New Request</a>`}`;
  return pane(cls, topbar({ back: '#/home', title: 'Help Desk', actions: iconBtn('search', 'Search requests', "S.rSearch=!S.rSearch;S.rQ='';render();setTimeout(()=>{const i=document.getElementById('hd-q');if(i)i.focus()},30)") }) + search + chips + tabs, body, '', 'hd');
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
function paneRequest(id, { cls = '' } = {}) {
  const r = by('requests', id), back = isPhone() ? '#/requests' : '';
  if (!r || !visibleTo(r, me())) return pane(cls, topbar({ back, title: 'Request' }), empty1('Not one of your requests'));
  const acts = actionsFor(r, me()), more = acts.some(k => MENU_ACTS.includes(k)) ? iconBtn('more_vert', 'More', `moreMenu('${r.id}',this)`) : '';
  const req = user(r.by);
  const head = `<div class="rhead"><span class="rhead__row"><span class="az-dept">${I(isDiet(r) ? KIND[r.kind][1] : dept(r.dept).icon, 20)}</span><span class="rhead__catn">${esc(catOf(r))}</span>${flag(r.prio)}</span>
    <span class="meta">${wday(r.events[0].at.slice(0, 10))} ${fmtAt(r.events[0].at)}</span>
    <span class="rhead__who">${avatar(req.name)}<span class="grow"><span class="az-who__name">${youName(r.by)}</span><span class="az-who__sub">${esc(req.title)}</span></span>${r.by === S.user ? '' : iconBtn('call', `Call ${req.name}`, `toast('Calling ${esc(req.name)}')`) + iconBtn('chat', `Chat with ${req.name}`, `toast('Chat with ${esc(req.name)}')`)}</span></div>`;
  const row = (icon, k, v) => `<div class="rsec__r">${I(icon)}<span class="t"><span>${k}</span>${v}</span></div>`;
  let body = isDiet(r) ? dietTrack(r) : '';
  const sec1 = [row('subject', 'Request', `<b>${esc(r.title)}</b>${r.text ? `<p>${esc(r.text)}</p>` : ''}`)];
  /* the department's own answers */
  const form = DEPT_FORMS[r.dept];
  if (form && r.f) form.fields.forEach(x => { const v = r.f[x.k];
    const t = x.type === 'switch' ? (v ? 'Yes' : 'No') : x.type === 'date' ? (v ? fmtDayY(v) : '') : x.type === 'money' ? (v ? `₹ ${(+v).toLocaleString('en-IN')}` : '') : x.type === 'items' ? (v || []).map(i => `${esc(i.name)} × ${i.qty}`).join('<br>') : esc(v || '');
    if (t) sec1.push(row(x.icon, x.label, `<b${x.type === 'money' ? ' class="amt-green"' : ''}>${t}</b>`)); });
  if (isDiet(r)) {
    const ts = targetsOf(r), s = r.kind === 'items' ? slotFor(r) : null, n = animalsIn(r).length;
    const forText = ts.length > 1 ? placesText(ts) : `${species(r.sp).name} · ${ts[0].group ? `${GROUP_WORD(ts[0].group)} only` : placeText(r)}`;
    sec1.push(row('pets', 'For', `<b>${esc(forText)}</b><button class="lnk" onclick="animalsSheet('${r.id}')">${plural(n, 'animal')}${I('chevron_right', 18)}</button>`));
    if (s && diet(r.base)) sec1.push(row('restaurant', 'Diet to change', `<b>${esc(diet(r.base).name)}</b><span>Set for ${esc(whereSet(s))}</span>${!ended(s) ? `<a class="lnk" href="#/diets/${s.sp}/${s.id}">Open diet${I('chevron_right', 18)}</a>` : ''}`));
    if (r.kind === 'items' && r.base === 'many') sec1.push(row('restaurant', 'Diets to change', '<b>All their diets, changed by item</b>'));
    if (r.kind === 'new') sec1.push(row('restaurant', 'New diet', `<b>${esc(r.name || 'New diet')}</b><span>${r.base && diet(r.base) ? `From ${esc(diet(r.base).name)}` : 'Made from empty'}</span>`));
    if (r.kind === 'diet' && r.base && diet(r.base)) sec1.push(row('restaurant', 'Instead of', `<b>${esc(diet(r.base).name)}</b>`));
    if (r.kind === 'end') sec1.push(row('restaurant', 'Diet to end', (r.ends || []).map(id => { const a = by('assigns', id); return `<b>${esc(diet(a.diet).name)}</b><span>Set for ${esc(whereSet(a))}</span>`; }).join('')));
    sec1.push(row('event', r.kind === 'end' ? 'Last day' : r.kind === 'skip' ? 'When' : 'How long', `<b>${r.kind === 'skip' ? `${wday(r.date)} ${fmtDayY(r.date)} · ${r.feeds === 'all' ? 'all feeds' : r.feeds.map(f => bandText(feed(f))).join(', ')}` : r.kind === 'end' ? `${wday(r.stop)} ${fmtDayY(r.stop)}` : howText(r)}</b>${r.how && r.kind !== 'skip' ? ktag(HOW_KIND[r.how]) : ''}`));
  }
  body += `<div class="rsec">${sec1.join('')}</div>`;
  /* the work after approval: who is in charge (the team can change it while in progress), and what the team wrote when completing */
  if (['in_progress', 'completed'].includes(r.state)) {
    const can = acts.includes('assign'), who = r.assignee ? user(r.assignee) : null, done = r.state === 'completed' ? lastEv(r, 'completed') : null;
    const rows = [];
    if (who || can) rows.push(row('badge', 'Job in charge', `${who ? `<span class="person">${avatar(who.name, '24')}<span><b>${youName(r.assignee)}</b><span>${esc(who.title)}</span></span></span>` : ''}${can ? `<button class="lnk" onclick="assignSheet('${r.id}')">${who ? 'Change' : `${I('add', 18)}Add`}</button>` : ''}`));
    if (done) {
      if (done.note) rows.push(row('task_alt', 'Completion notes', `<p>${esc(done.note)}</p>`));
      if (!isDiet(r)) rows.push(row('groups', 'Team', `<b>${esc(teamText(done))}</b>`));
      if ((done.files || []).length) rows.push(row('attach_file', 'Completion files', fileBtns(done.files)));
    }
    if (rows.length) body += `<div class="rsec">${rows.join('')}</div>`;
  }
  if (r.approver === S.user && isOpen(r)) shortOf(r).forEach(x => body += `<div class="az-warnline">${I('warning', 18)}<span class="grow"><b>${esc(x.item.name)} is low.</b> ${x.have <= 0 ? 'None' : 'Only ' + stockText(x.item)} in stock; the kitchen needs ${x.need} a day.</span><button class="lnk" onclick="delaySheet('${r.id}')">Delay</button></div>`);
  if (isDiet(r)) {
    const many = r.kind === 'items' && r.base === 'many', fresh = r.kind === 'new' ? { meals: applyChanges(r.base && diet(r.base) ? diet(r.base).meals : [], r.changes || []) } : null;
    const lines = many ? `<div class="rsec">${(r.rules || []).map(u => `<div class="rsec__r">${I(RULE_IC[u.op])}<span class="t"><b>${esc(ruleText(u))}</b></span></div>`).join('')}</div>`
      : r.kind === 'items' ? linesView(changeGroups(diet(r.base), r.changes)) : r.kind === 'new' ? linesView(dietDiffGroups(r.base && diet(r.base), fresh)) : r.kind === 'diet' ? linesView(dietDiffGroups(r.base && diet(r.base), diet(r.diet))) : r.kind === 'skip' ? skipView(r) : '';
    if (lines) body += `<p class="secttl">${r.kind === 'items' ? 'What changes' : r.kind === 'new' ? `The new diet${r.base && diet(r.base) ? ' · what differs' : ''}` : r.kind === 'diet' ? `New diet · ${esc(diet(r.diet).name)}` : 'Feeds'}</p>${lines}`;
    body += saveAsSec(r);
    /* When approved: what Kitchen & Diet does (worked out until the kitchen updates the diet; as it was done after) */
    const p = r.outcome ? r.outcome : ['pending', 'delayed', 'approved', 'in_progress'].includes(r.state) ? planOf(r) : null;
    if (p && p.lines.length) body += `<p class="secttl">${r.outcome ? 'What changed' : isOpen(r) ? 'When approved' : 'When the kitchen updates it'}</p><div class="forcard effect">${p.lines.map(l => { const v = l.view && !wasApproved(r);
      return `<${v ? 'button' : 'div'} class="forrow${v ? '' : ' forrow--static'}"${v ? ` onclick="reachSheet('${l.view}','${r.id}')"` : ''}><span class="eav">${I(l.icon, 20)}</span><span class="grow"><b>${esc(l.b)}</b>${l.small ? `<small>${esc(l.small)}</small>` : ''}${l.x ? `<small>${esc(l.x)}</small>` : ''}</span>${l.tag ? ktag(l.tag) : v ? I('chevron_right', 20) : ''}</${v ? 'button' : 'div'}>`; }).join('')}</div>${p.block ? `<div class="az-warnline az-warnline--bad">${I('error', 18)}<span>${esc(p.block)}</span></div>` : ''}`;
  }
  const appr = user(r.approver);
  body += `<div class="rsec">${isDiet(r) ? row('label', 'Reason', `<b>${esc(r.reason)}</b>`) : ''}${row('location_on', 'Requesting site', `<b>${esc(siteOf(r))}</b>`)}
    ${row('how_to_reg', 'To be approved by', `<span class="person">${avatar(appr.name, '24')}<span><b>${youName(r.approver)}</b><span>${esc(appr.title)}</span></span></span>`)}
    ${r.note ? row('sticky_note_2', 'Note to kitchen', `<p>${esc(r.note)}</p>`) : ''}
    ${(r.files || []).length ? row('attach_file', 'Attachments', fileBtns(r.files)) : ''}</div>`;
  body += `<p class="secttl">Activity</p><div class="act-list"><div class="az-composer">${avatar(me().name)}<input id="cmt" placeholder="Add a comment" onkeydown="if(event.key==='Enter')addComment('${r.id}')" aria-label="Add a comment"><button class="send" onclick="addComment('${r.id}')" aria-label="Send">${I('send', 20)}</button></div>
    <div class="az-timeline">${[...r.events].reverse().map(e => {
      if (e.kind === 'comment') return `<div class="az-tl"><span class="az-tl__dot">${avatar(user(e.by).name, '24')}</span><span class="az-tl__text"><span class="az-tl__title">${youName(e.by)}</span><span class="az-tl__meta">${fmtAt(e.at)}</span><p>${esc(e.note)}</p></span></div>`;
      const [t, ic, tone] = isDiet(r) && e.kind === 'completed' ? ['Diet updated', 'task_alt', 'ok'] : EVT[e.kind];
      const extra = e.kind === 'completed' ? `<p class="plain">${esc(teamText(e))}</p>${(e.files || []).length ? fileBtns(e.files) : ''}` : '';
      return `<div class="az-tl"><span class="az-tl__dot ${tone}">${I(ic, 20)}</span><span class="az-tl__text"><span class="az-tl__title">${t}${e.kind === 'delayed' ? ` till ${fmtDay(e.until)}` : e.kind === 'assigned' ? `: ${youName(e.to)}` : ''}</span><span class="az-tl__meta">${youName(e.by)} • ${fmtAt(e.at)}</span>${e.reason || e.note ? `<p class="plain">${esc([e.reason, e.note].filter(Boolean).join('. '))}</p>` : ''}${extra}</span></div>`; }).join('')}</div></div>`;
  /* the record header scrolls away with the request; only the top bar and the status bar stay */
  return pane(cls, topbar({ back, title: r.id, actions: more }), head + `<div class="body">${body}</div>`, statusBar(r), `req-${r.id}`);
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
  if (r.state === 'approved') return isDiet(r) ? `By ${youName(e.by)} · ${onTeam(r, me()) ? 'update the diet' : 'with the kitchen'}` : `By ${youName(e.by)}`;
  return `${youName(e.by)}: ${e.reason}`;
}
function statusBar(r) {
  const a = actionsFor(r, me()), at = r.events.filter(e => !['comment', 'assigned'].includes(e.kind)).pop().at, s = stateOf(r);
  let btns = '';
  /* Reject and Approve side by side on every device, so the request keeps most of the phone screen (audit, 2 Nov) */
  if (a.includes('approve')) btns = `<button class="az-btn az-btn--reject" onclick="reasonSheet('${r.id}','reject')">Reject</button><button class="az-btn az-btn--approve" onclick="approveSheet('${r.id}')">${I('check')}Approve</button>`;
  else if (a.includes('edit')) btns = `<button class="az-btn az-btn--outline az-btn--approve" onclick="reasonSheet('${r.id}','cancel')">Cancel request</button><button class="az-btn az-btn--approve" onclick="go('#/new?edit=${r.id}')">${I('edit')}Edit request</button>`;
  /* the team's one next step, as the Help Desk app (the design system: one main green button; going back is outline) */
  else if (a.includes('start')) btns = `<button class="az-btn az-btn--approve" onclick="doAct('${r.id}','start')">${I('progress_activity')}Move to In progress</button>`;
  else if (a.includes('complete')) btns = `<button class="az-btn az-btn--approve" onclick="completeSheet('${r.id}')">${I('task_alt')}${isDiet(r) ? 'Diet updated' : 'Move to Completed'}</button>`;
  else if (a.includes('reopen')) btns = `<button class="az-btn az-btn--outline az-btn--approve" onclick="reasonSheet('${r.id}','reopen')">${I('undo')}Move back to In progress</button>`;
  return `<div class="az-statusbar"><span>Current status • ${ago(at)} ago</span><b class="tone-${s.tone}">${esc(s.label)}</b><span>${nextLine(r)}</span>${btns ? `<div class="az-statusbar__actions">${btns}</div>` : ''}</div>`;
}
const MENU_ACTS = ['assign', 'delay', 'edit', 'cancel'];
/* the more menu: what is not the main decision. The design system's Menu, not a sheet: record actions go in a menu (3 Nov) */
function moreMenu(id, btn) {
  const r = by('requests', id), a = actionsFor(r, me()), item = (icon, l, js, danger) => `<button role="menuitem"${danger ? ' class="az-danger"' : ''} onclick="closeMenu();${js}">${I(icon, 20)}${l}</button>`;
  openMenu(btn, [a.includes('assign') ? item('badge', 'Job in charge', `assignSheet('${id}')`) : '', a.includes('delay') ? item('timer', r.state === 'delayed' ? 'Change the delay' : 'Delay', `delaySheet('${id}')`) : '', a.includes('edit') ? item('edit', 'Edit request', `go('#/new?edit=${id}')`) : '', a.includes('cancel') ? item('do_not_disturb_on', 'Cancel request', `reasonSheet('${id}','cancel')`, true) : ''].join(''));
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
