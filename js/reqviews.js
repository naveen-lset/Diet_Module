// js/reqviews.js — the Request page in three versions to compare (owner, 19 Nov 2026: "Request Details pages: more iterations, check with the Hub designs").
// A · Help Desk (helpdesk.js paneRequestA): Sourav's Help Desk build and the Antz app — dark header, one container of rows, Activity, the status bar.
// B · Item requests: Sourav's Item requests build — a white hero with the status pill, Details | Activity, each part a tray with a white card,
//     the approval as flat rows (who decides, then who does it), the changes as a receipt.
// C · Summary first: VVMS and Incident Reporting — the doodle header with what it asks and where it stands, a white body over it with round top
//     corners, Progress as the History stepper, the changes as a receipt, the details, Activity.
// Every version keeps the status bar (who it waits on, and this person's buttons). Pick one in Prototype controls › Request page, or ?rd=a|b|c.

const RD = [['a', 'A · Help Desk'], ['b', 'B · Item requests'], ['c', 'C · Summary first']];
const RD_DEFAULT = 'c';
function setRd(v) { S.rdv = v; storeSave(); render(); toast(`Request page: ${RD.find(x => x[0] === v)[1]}`); }

/* ---------- parts every version uses ---------- */
const reqLowStock = r => r.approver === S.user && isOpen(r) ? shortOf(r).map(x => `<div class="az-warnline">${I('warning', 18)}<span class="grow"><b>${esc(x.item.name)} is low.</b> ${x.have <= 0 ? 'None' : 'Only ' + stockText(x.item)} in stock; the kitchen needs ${x.need} a day.</span><button class="lnk" onclick="delaySheet('${r.id}')">Delay</button></div>`).join('') : '';
/* what a diet request changes, as the Kitchen table (version A): [title, html] */
function reqLines(r) {
  const many = r.kind === 'items' && r.base === 'many', fresh = r.kind === 'new' ? { meals: applyChanges(r.base && diet(r.base) ? diet(r.base).meals : [], r.changes || []) } : null;
  const html = many ? `<div class="rsec">${(r.rules || []).map(u => `<div class="rsec__r">${I(RULE_IC[u.op])}<span class="t"><b>${esc(ruleText(u))}</b></span></div>`).join('')}</div>`
    : r.kind === 'items' ? linesView(changeGroups(diet(r.base), r.changes)) : r.kind === 'new' ? linesView(dietDiffGroups(r.base && diet(r.base), fresh)) : r.kind === 'diet' ? linesView(dietDiffGroups(r.base && diet(r.base), diet(r.diet))) : r.kind === 'skip' ? skipView(r) : '';
  return [r.kind === 'items' ? 'What changes' : r.kind === 'new' ? `The new diet${r.base && diet(r.base) ? ' · what differs' : ''}` : r.kind === 'diet' ? `New diet · ${esc(diet(r.diet).name)}` : 'Feeds', html];
}
/* what a food change does, line by line, as the review sheet showed it before sending (Item requests: what you review is what you see after) */
function reqReceipt(r) {
  if (r.kind === 'items' && r.base && r.base !== 'many' && diet(r.base) && (r.changes || []).length) return diffTable(r.changes, diet(r.base));
  return '';
}
/* When approved (Kitchen & Diet's plan) until the kitchen updates the diet; What changed after */
const reqPlan = r => r.outcome ? r.outcome : ['pending', 'delayed', 'approved', 'in_progress'].includes(r.state) ? planOf(r) : null;
const reqEffect = (r, o = {}) => { const p = isDiet(r) && reqPlan(r); return p && p.lines.length ? effectView(r, p, o) : (o.bare ? null : ''); };
/* once the kitchen updated it, the diet as it is now, so the request leads straight to the diet it changed */
function reqDietNow(r, bare = false) {
  if (!r.outcome) return '';
  const now = [...new Map(D.history.filter(h => h.req === r.id && h.diet && (h.lines || h.follows || h.created)).map(h => [h.diet, asgOfChange(h)])).values()].filter(a => a && !ended(a));
  if (!now.length) return '';
  const links = now.map(a => `<a class="lnk" href="#/diets/${a.sp}/${a.id}">${esc(diet(a.diet).name)}${I('chevron_right', 18)}</a>`).join('');
  return bare ? links : `<div class="rsec"><div class="rsec__r">${I('restaurant')}<span class="t"><span>${now.length > 1 ? 'Diets now' : 'Diet now'}</span>${links}</span></div></div>`;
}
/* where the request is up to: sent → the approver decides → the team does it → (a diet change) the diet changes. Each step: done, now, to come, or stopped */
function reqChain(r) {
  const ap = user(r.approver), x = dept(r.dept), team = (x.team || [x.head]).map(user), st = r.state, ev = k => lastEv(r, k), first0 = r.events[0];
  const ok = wasApproved(r), rej = st === 'rejected', can = st === 'cancelled', done = st === 'completed', ae = ev('approved');
  const out = [{ k: 'sent', st: 'done', icon: 'send', t: r.events.some(e => e.kind === 'edited') ? 'Request sent · edited' : 'Request sent', who: [user(r.by)], p: `${youName(r.by)} · ${esc(user(r.by).title)}`, at: first0.at }];
  out.push({ k: 'appr', st: ok ? 'done' : rej ? 'bad' : can ? 'stop' : 'now', icon: 'how_to_reg', who: [ap],
    t: ok ? 'Approved' : rej ? 'Not approved' : can ? 'Cancelled' : st === 'delayed' ? `Delayed till ${fmtDay(r.delay.until)}` : r.approver === S.user ? 'Your approval' : 'Waiting for approval',
    p: `${youName(r.approver)} · ${esc(ap.title)}`, at: ok && ae ? ae.at : rej ? ev('rejected').at : can ? ev('cancelled').at : null,
    note: rej ? ev('rejected').reason : can ? ev('cancelled').reason : st === 'delayed' ? r.delay.reason : '', since: isOpen(r) ? lastAt(r) : null });
  if (rej || can) return out;
  /* a diet request ends at approval (owner, 19 Nov 2026): a Diet change (and a skipped feed) goes into the diet then, and the kitchen works from it;
     a request in words goes to the kitchen; a new diet with nothing to start from, to the dietician to build */
  if (isDiet(r)) {
    const intoDiet = changesDiet(r) && r.kind !== 'ask' || r.kind === 'skip', at = ok && ae ? ae.at : null, day = r.kind === 'skip' ? r.date : r.kind === 'end' ? r.stop : r.start;
    if (intoDiet) out.push({ k: 'diet', st: ok ? 'done' : 'todo', icon: r.kind === 'skip' ? 'no_meals' : r.kind === 'end' ? 'event_busy' : 'restaurant', who: [],
      t: r.kind === 'skip' ? (ok ? `No feed ${dayText(r.date)}` : 'The feed is skipped') : r.kind === 'end' ? (ok ? 'Diet ends early' : 'The diet ends early') : r.kind === 'new' ? (ok ? 'New diet added' : 'The new diet is added') : ok ? 'Diet updated' : 'The diet is updated',
      p: r.kind === 'skip' ? `${fmtDayY(r.date)} · ${r.feeds === 'all' ? 'all feeds' : r.feeds.map(f => bandText(feed(f))).join(', ')}` : r.kind === 'end' ? `Last day ${fmtDayY(r.stop)}` : r.how === 'yearly' ? `Every year, ${mdText(r.start)} – ${mdText(r.end)}` : r.how === 'once' ? `${fmtDay(r.start)} – ${fmtDayY(r.end)}` : day && day > TODAY ? `From ${dayText(day)}` : 'From now on', at });
    if (r.kind === 'ask') out.push({ k: 'build', st: ok ? 'now' : 'todo', icon: 'add_circle', who: [ap], t: ok ? 'The dietician builds the diet' : 'Then the dietician builds it', p: `${youName(r.approver)} · ${esc(ap.title)}`, at: null });
    else out.push({ k: 'kitchen', st: ok ? 'done' : 'todo', icon: 'soup_kitchen', who: team, t: ok ? 'With the kitchen' : 'The kitchen gets it', p: team.map(u => esc(u.name)).join(' and '), at });
    return out;
  }
  const ce = ev('completed'), dietCh = isDiet(r) && changesDiet(r), who = r.assignee ? [user(r.assignee)] : team;
  out.push({ k: 'team', st: done ? 'done' : ok ? 'now' : 'todo', icon: isDiet(r) ? 'soup_kitchen' : x.icon, who: done && ce ? [user(ce.by)] : who,
    t: done ? (dietCh ? 'Diet updated in the kitchen' : 'Done') : dietCh ? 'The kitchen updates the diet' : isDiet(r) ? 'The kitchen does it' : `${x.name} does the work`,
    p: done && ce ? `${youName(ce.by)} · ${esc(user(ce.by).title)}` : r.assignee ? `Job in charge: ${youName(r.assignee)}` : who.map(u => esc(u.name)).join(' or '), at: done && ce ? ce.at : null });
  if (dietCh) {
    const live = done && phaseOf(r) !== 'next', day = r.kind === 'skip' ? r.date : r.kind === 'end' ? r.stop : r.start;
    out.push({ k: 'live', st: live ? 'done' : 'todo', icon: r.kind === 'skip' ? 'no_meals' : 'restaurant', who: [],
      t: r.kind === 'skip' ? `No feed ${dayText(r.date)}` : r.kind === 'end' ? 'The diet ends' : live ? 'In the diet' : 'The diet changes',
      p: r.kind === 'skip' ? fmtDayY(r.date) : r.kind === 'end' ? `Last day ${fmtDayY(r.stop)}` : r.how === 'yearly' ? `Every year, ${mdText(r.start)} – ${mdText(r.end)}` : r.how === 'once' ? `${fmtDay(r.start)} – ${fmtDayY(r.end)}` : day ? `From ${dayText(day)}` : 'From now on', at: null });
  }
  return out;
}
/* the people on a step, overlapping a little */
const avStack = us => us.length ? `<span class="avs">${us.slice(0, 3).map(u => avatar(u.name, '32')).join('')}</span>` : '';
/* the status as a pill with a dot (Item requests) */
const RV_TONE = { awaiting: 'wait', positive: 'ok', negative: 'bad', neutral: 'off' };
const rvPill = r => { const s = stateOf(r); return `<span class="rvpill rvpill--${RV_TONE[s.tone] || 'wait'}"><i></i>${esc(r.state === 'pending' && r.approver === S.user ? 'Awaiting your approval' : s.label)}</span>`; };
/* attachments as tiles with a tinted preview (Hub Help Desk) */
const fileTiles = fs => `<div class="ftiles">${fs.map(f => `<button class="ftile ftile--${f.kind}" onclick="toast('Opens ${esc(f.name)}')"><span class="ftile__p">${I(f.kind === 'image' ? 'image' : f.kind === 'audio' ? 'graphic_eq' : f.kind === 'pdf' ? 'picture_as_pdf' : 'description', 32)}</span><b>${esc(f.name)}</b><small>${esc(f.size || '')}</small></button>`).join('')}</div>`;
const reqTopbar = r => topbar({ back: isPhone() ? '#/requests' : '', title: r.id, actions: iconBtn('more_vert', 'More', `moreMenu('${r.id}',this)`) });
const reqGuard = (r, cls) => !r || !visibleTo(r, me()) ? pane(cls, topbar({ back: isPhone() ? '#/requests' : '', title: 'Request' }), empty1('Not one of your requests')) : '';

/* ---------- B · Item requests ---------- */
function paneRequestB(id, { cls = '' } = {}) {
  const r = by('requests', id), g = reqGuard(r, cls); if (g) return g;
  if (S.rdFor !== id) { S.rdTab = 'd'; S.rdFor = id; }
  const F = reqFacts(r), n = isDiet(r) ? animalsIn(r).length : 0, req = user(r.by);
  const hero = `<div class="rvh"><span class="rvh__ic">${I(isDiet(r) ? KIND[r.kind][1] : dept(r.dept).icon, 28)}</span><div class="rvh__t"><span class="rvh__cat">${esc(catOf(r))}${r.prio !== 'normal' ? ` <span class="rvh__prio rvh__prio--${r.prio}">${I('local_fire_department', 16, true)}${PRIO[r.prio][1]}</span>` : ''}</span><b>${esc(r.title)}</b>
    <span class="rvh__meta">${rvPill(r)}<span>Raised ${fmtDayY(r.events[0].at.slice(0, 10))}</span></span></div></div>`;
  const nAct = r.events.length, tabs = `<div class="rvtabs" role="tablist" aria-label="Request">${[['d', 'Details'], ['a', `Activity <em>${nAct}</em>`]].map(([k, l]) => `<button role="tab" aria-selected="${S.rdTab === k}" onclick="S.rdTab='${k}';render()">${l}</button>`).join('')}</div>`;
  const panel = (icon, t, inner, end = '') => `<section class="rvp"><div class="rvp__h">${I(icon, 20)}<b>${t}</b>${end}</div><div class="rvp__b">${inner}</div></section>`;
  let body = '';
  if (S.rdTab === 'a') body = activityView(r);
  else {
    /* Request information: who raised it first, then the facts in two columns on a wide screen (the title is the hero; approval and files have their own) */
    const fact = f => `<div class="rvf${['req', 'job', 'done', 'note', 'form'].includes(f.k) && /<p>|<br>/.test(f.v) ? ' rvf--wide' : ''}"><span class="rvf__ic">${I(f.icon, 20)}</span><span class="rvf__t"><small>${f.label}</small>${f.v}</span></div>`;
    const by1 = `<div class="rvf"><span class="rvf__ic rvf__ic--av">${avatar(req.name)}</span><span class="rvf__t"><small>Raised by</small><b>${youName(r.by)}</b><span>${esc(req.title)}</span></span>${r.by === S.user ? '' : `<span class="rvf__acts">${iconBtn('call', `Call ${req.name}`, `toast('Calling ${esc(req.name)}')`)}${iconBtn('chat', `Chat with ${req.name}`, `toast('Chat with ${esc(req.name)}')`)}</span>`}</div>`;
    const what = r.text ? `<div class="rvq"><small>What it's for</small><p>${esc(r.text)}</p></div>` : '';
    body += reqLowStock(r);
    body += panel('info', 'Request information', `${what}<div class="rvfacts">${by1}${F.filter(f => !['req', 'appr', 'files'].includes(f.k)).map(fact).join('')}</div>`);
    if (isDiet(r)) {
      const rc = reqReceipt(r), [t, lines] = reqLines(r), sl = r.kind === 'items' ? slotFor(r) : null;
      const open = sl && !ended(sl) && diet(r.base) ? `<a class="lnk rvp__end" href="#/diets/${sl.sp}/${sl.id}">Open diet${I('chevron_right', 18)}</a>` : '';
      if (rc) body += panel('restaurant', `What changes · ${r.changes.length}`, rc, open);
      else if (lines) body += panel('restaurant', t, lines);
      const sa = saveAsSec(r); if (sa) body += panel('tune', 'Save it as', sa.replace(/<p class="secttl">Save it as<\/p>/, ''));
      const ef = reqEffect(r, { bare: true }); if (ef) body += panel(r.outcome ? 'task_alt' : 'auto_awesome', ef.title, ef.html + reqDietNow(r));
    }
    body += panel('how_to_reg', 'Approval', rvApproval(r));
    if ((r.files || []).length) body += panel('attach_file', plural(r.files.length, 'Attachment'), fileTiles(r.files));
  }
  return pane(`${cls} req-b`, reqTopbar(r), hero + tabs + `<div class="body rvbody">${body}</div>`, statusBar(r), `req-${r.id}`);
}
/* the approval as flat rows (Item requests, 13: "approvers sit flat"): one line of where it stands, then each step with its people and one mark */
function rvApproval(r) {
  const ch = reqChain(r).slice(1), s = stateOf(r), MK = { done: ['check_circle', true], now: ['schedule', false], todo: ['radio_button_unchecked', false], bad: ['cancel', true], stop: ['do_not_disturb_on', true] };
  const head = `<div class="rva__h rva__h--${RV_TONE[s.tone] || 'wait'}">${I(s.icon, 20, true)}<b>${esc(s.label)}</b>${isOpen(r) ? `<span>· since ${ago(lastAt(r))}</span>` : ''}</div>`;
  return head + ch.map(x => `<div class="rva__r rva__r--${x.st}">${x.who.length ? avStack(x.who) : `<span class="rva__ic">${I(x.icon, 20)}</span>`}<span class="grow"><b>${x.t}</b><span>${x.p}${x.at ? ` · ${fmtAt(x.at)}` : ''}</span>${x.note ? `<q>${esc(x.note)}</q>` : ''}</span>${x.k === 'appr' ? `<button class="lnk" onclick="approversSheet('${r.id}')">View</button>` : ''}<span class="rva__m rva__m--${x.st}">${I(MK[x.st][0], 22, MK[x.st][1])}</span></div>`).join('');
}

/* ---------- C · Summary first ---------- */
function paneRequestC(id, { cls = '' } = {}) {
  const r = by('requests', id), g = reqGuard(r, cls); if (g) return g;
  const s = stateOf(r), d = isDiet(r), n = d ? animalsIn(r).length : 0, req = user(r.by), F = reqFacts(r), f1 = k => F.find(x => x.k === k);
  const ts = d ? targetsOf(r) : [], forT = d ? (ts.length > 1 ? placesText(ts) : ts[0].group ? `${GROUP_WORD(ts[0].group)} only` : placeText(r)) : '';
  /* the hero, on the Diet Details doodles: where it stands, what it asks, for whom, and three facts as chips */
  const chips = d ? [r.kind === 'items' && diet(r.base) ? ['restaurant', diet(r.base).name] : r.kind === 'new' ? ['add_circle', r.name || 'New diet'] : null,
      r.kind === 'skip' ? ['event', `${wday(r.date)} ${fmtDay(r.date)}`] : r.kind === 'end' ? ['event', `Last day ${fmtDay(r.stop)}`] : r.how ? ['event', r.how === 'always' ? 'From now on' : howText(r)] : null,
      r.reason ? ['label', r.reason] : null].filter(Boolean) : [['location_on', siteOf(r)]].filter(c => c[1]);
  const st = `<span class="rch__st rch__st--${RV_TONE[s.tone] || 'wait'}"><i></i>${esc(r.state === 'pending' && r.approver === S.user ? 'Awaiting your approval' : s.label)}${isOpen(r) ? ` · ${ago(lastAt(r))}` : ''}</span>`;
  const forRow = d ? `<span class="rch__for">${spThumb(species(r.sp))}<span class="grow"><b>${esc(species(r.sp).name)}</b><span>${esc(forT)}</span></span><button class="rch__n" onclick="animalsSheet('${r.id}')">See animals${I('chevron_right', 18)}</button></span>`
    : `<span class="rch__for"><span class="rch__dept">${I(dept(r.dept).icon, 24)}</span><span class="grow"><b>${esc(dept(r.dept).name)}</b><span>${esc(siteOf(r))}</span></span></span>`;
  const hero = `<div class="rch dhead--doodle">${doodleSvg()}<div class="rch__in">${st}${r.prio !== 'normal' ? `<span class="rch__prio">${I('local_fire_department', 16, true)}${PRIO[r.prio][1]}</span>` : ''}
    <b class="rch__t">${esc(r.title)}</b>${forRow}${chips.length ? `<span class="rch__chips">${chips.map(([ic, t]) => `<span>${I(ic, 16)}${esc(t)}</span>`).join('')}</span>` : ''}</div></div>`;
  /* Progress: the History stepper (owner's reference, 2 Nov) — a tick for done, a ring with a dot for now, empty rings to come */
  const ch = reqChain(r), row = (x, i) => {
    const mark = x.st === 'done' ? I('check', 18) : x.st === 'now' ? '<i></i>' : x.st === 'bad' || x.st === 'stop' ? I('close', 18) : '';
    const when = x.at ? `<span class="step__w"><b>${fmtDayY(x.at.slice(0, 10))}</b><span>${fmtTime(x.at)}</span></span>` : x.since ? `<span class="step__w"><b class="rcw">Since ${ago(x.since)}</b></span>` : '';
    const line = i < ch.length - 1 ? ` step--${ch[i + 1].st === 'todo' || ch[i + 1].st === 'now' && x.st !== 'done' ? 'grey' : 'on'}` : ' step--last';
    return `<div class="step${line}"><span class="step__m step__m--${x.st === 'bad' || x.st === 'stop' ? 'bad' : x.st}">${mark}</span><span class="step__t"><b>${x.t}</b><span class="rc-who">${x.who.length ? avStack(x.who) : ''}${x.p}</span>${x.note ? `<q class="rc-q">${esc(x.note)}</q>` : ''}${x.k === 'appr' ? `<button class="lnk" onclick="approversSheet('${r.id}')">Approvers${I('chevron_right', 18)}</button>` : ''}</span>${when}</div>`; };
  let body = reqLowStock(r) + `<section class="rcc"><h2>${I('route', 20)}Progress</h2><div class="steps">${ch.map(row).join('')}</div></section>`;
  if (d) {
    const rc = reqReceipt(r), [t, lines] = reqLines(r), sl = r.kind === 'items' ? slotFor(r) : null;
    const open = sl && !ended(sl) && diet(r.base) ? `<a class="lnk" href="#/diets/${sl.sp}/${sl.id}">Open diet${I('chevron_right', 18)}</a>` : '';
    if (rc) body += `<section class="rcc"><h2>${I('restaurant', 20)}What changes<small>${plural(r.changes.length, 'change')}</small>${open}</h2>${rc}</section>`;
    else if (lines) body += `<section class="rcc rcc--flush"><h2>${I('restaurant', 20)}${t}</h2>${lines}</section>`;
    const sa = saveAsSec(r); if (sa) body += `<section class="rcc"><h2>${I('tune', 20)}Save it as</h2>${sa.replace(/<p class="secttl">Save it as<\/p>/, '')}</section>`;
    const ef = reqEffect(r, { bare: true }); if (ef) body += `<section class="rcc"><h2>${I(r.outcome ? 'task_alt' : 'auto_awesome', 20)}${ef.title}</h2>${ef.html}${reqDietNow(r)}</section>`;
  }
  /* the details, the few that are left: who raised it (call, chat), the note, the site, the department's answers, files */
  const det = [`<div class="rcd"><span class="rcd__k">Raised by</span><span class="rcd__v rcd__v--who">${avatar(req.name, '24')}<b>${youName(r.by)}</b><span>${esc(req.title)}</span>${r.by === S.user ? '' : `<span class="rcd__acts">${iconBtn('call', `Call ${req.name}`, `toast('Calling ${esc(req.name)}')`)}${iconBtn('chat', `Chat with ${req.name}`, `toast('Chat with ${esc(req.name)}')`)}</span>`}</span></div>`];
  const dRow = (k, v) => `<div class="rcd"><span class="rcd__k">${k}</span><span class="rcd__v">${v}</span></div>`;
  if (r.text) det.push(dRow(d ? 'Details' : 'Request', `<p>${esc(r.text)}</p>`));
  F.filter(x => ['form', 'job', 'assign', 'done', 'note'].includes(x.k)).forEach(x => det.push(dRow(x.label, x.v)));
  if (d && f1('diet') && r.kind !== 'items') det.push(dRow(f1('diet').label, f1('diet').v));
  det.push(dRow('Requesting site', `<b>${esc(siteOf(r))}</b>`), dRow('Request no.', `<b>${r.id}</b><span>Raised ${wday(r.events[0].at.slice(0, 10))} ${fmtAt(r.events[0].at)}</span>`));
  body += `<section class="rcc"><h2>${I('info', 20)}Details</h2>${det.join('')}</section>`;
  if ((r.files || []).length) body += `<section class="rcc"><h2>${I('attach_file', 20)}${plural(r.files.length, 'Attachment')}</h2>${fileTiles(r.files)}</section>`;
  body += activityView(r);
  return pane(`${cls} req-c`, reqTopbar(r), hero + `<div class="body rcbody">${body}</div>`, statusBar(r), `req-${r.id}`);
}
