// js/kitchen.js — the kitchen's side of an approved diet request (owner, 27 Nov 2026): "once it is approved the diet plan changes for that
// place; the kitchen is notified, sees it somewhere and changes the items. If an item is not there, give me an idea." The kitchen hears it
// from the bell and works from To Update (Requests); on the request it taps Updated, or Delay till a day for a reason from a list (owner,
// 28 Nov 2026: "no substitute; Updated, Delay, that's all"; reasons and Overdue from Sourav's Diet Tab). The old diet runs till then.

/* ---------- Delay (owner, 28 Nov 2026: "no substitute; Updated, Delay, that's all") ---------- */
/* till a day and why, from Sourav's list; the old diet runs till then. Everyone else just sees it */
let KD = null;
const KD_DAYS = [[1, 'Tomorrow'], [2, '2 Days'], [3, '3 Days'], [7, '1 Week']];
function kDelaySheet(id) { KD = { id, days: 2, reason: null, note: '' }; openSheet(kDelayHtml); }
function kDelayHtml() {
  const r = by('requests', KD.id), until = addDays(TODAY, KD.days);
  const till = `<div class="az-field"><span class="az-label">Delay Till <span class="az-req">*</span></span><div class="az-chips ns-days">${KD_DAYS.map(([n, l]) => `<button class="az-chip" aria-selected="${KD.days === n}" onclick="KD.days=${n};redrawSheet()">${l}</button>`).join('')}</div><small class="ns-sub">${wday(until)} ${fmtDayY(until)} · the old diet runs till then</small></div>`;
  const why = `<div class="az-field"><span class="az-label">Why <span class="az-req">*</span></span><div class="sg-list">${KDELAY_REASONS.map(([t, ic]) => pkRow(`KD.reason='${t}';redrawSheet()`, pkIc(ic), t, '', undefined, KD.reason === t)).join('')}</div></div>`;
  const note = `<label class="az-field"><span class="az-label">Note (optional)</span><span class="az-input az-input--text az-textarea"><textarea id="kd-note" rows="2" placeholder="For example, the supplier comes on Monday" oninput="KD.note=this.value">${esc(KD.note)}</textarea></span></label>`;
  return { title: 'Delay', sub: `${esc(r.id)} · ${esc(diet(r.base)?.name || r.title)}`, bottom: true, form: true, tall: true,
    body: till + why + note,
    foot: `<button class="az-btn az-btn--outline" onclick="closeSheet()">Back</button><button class="az-btn"${KD.reason ? '' : ' disabled'} onclick="doAct(KD.id,'kdelay',{until:addDays(TODAY,KD.days),reason:KD.reason,note:KD.note})">Delay</button>` };
}

/* ---------- the bell: what is new for this person ---------- */
/* the kitchen: diets changed (approved), substitutes OK'd or not; the Dietitian: requests and substitutes waiting for her; the requester:
   what happened to their requests. New since the bell was last opened shows as a count */
function notesFor(uid) {
  const u = user(uid), out = [], add = (r, at, icon, t, sub) => out.push({ id: r.id, at, icon, t, sub });
  D.requests.filter(r => isDiet(r) && visibleTo(r, u)).forEach(r => r.events.forEach(e => {
    const by_ = youName(e.by), nm = esc(r.title);
    if (onTeam(r, u)) {
      if (e.kind === 'approved') add(r, e.at, 'restaurant', `Diet changed: ${nm}`, `Approved by ${by_} · update the items`);
      if (e.kind === 'subok') add(r, e.at, 'swap_horiz', `Substitute approved: ${esc(item(e.to).name)}`, `${nm} · update the items`);
      if (e.kind === 'subno') add(r, e.at, 'close', `Substitute rejected: ${esc(item(e.to).name)}`, `${nm} · ${esc(e.reason)}`);
    }
    if (r.approver === uid && e.by !== uid) {
      if (e.kind === 'raised') add(r, e.at, 'add_circle', `New request: ${nm}`, `From ${by_}`);
      if (e.kind === 'nostock') add(r, e.at, 'inventory_2', e.mode === 'sub' ? `Substitute to approve: ${esc(item(e.to).name)}` : `Waiting for stock: ${esc(item(e.item).name)}`, `${nm} · ${by_}`);
      if (e.kind === 'completed') add(r, e.at, 'task_alt', `Updated in the kitchen: ${nm}`, `By ${by_}`);
      if (e.kind === 'kdelay') add(r, e.at, 'schedule', `Delayed till ${fmtDay(e.until)}: ${nm}`, `${esc(e.reason)} · ${by_}`);
    }
    if (ownsReq(r, uid) && e.by !== uid && ['approved', 'rejected', 'completed', 'nostock', 'kdelay'].includes(e.kind))
      add(r, e.at, EVT[e.kind][1], `${e.kind === 'completed' ? 'Updated in the kitchen' : e.kind === 'kdelay' ? `Delayed till ${fmtDay(e.until)}` : e.kind === 'nostock' ? 'Item not in stock' : EVT[e.kind][0]}: ${nm}`, e.kind === 'kdelay' ? `${esc(e.reason)} · ${by_}` : `By ${by_}`);
  }));
  return out.sort((a, b) => b.at.localeCompare(a.at));
}
const seenKey = () => `seen-${S.user}`;
const bellNew = () => { const seen = (S.seen || {})[S.user] || ''; return notesFor(S.user).filter(n => n.at > seen).length; };
const bellBtn = () => { const n = bellNew(); return `<button class="az-iconbtn bellbtn" onclick="bellSheet()" aria-label="Notifications${n ? `, ${n} new` : ''}">${I('notifications')}${n ? `<b class="bell__n">${n > 99 ? '99+' : n}</b>` : ''}</button>`; };
function bellSheet() {
  const seen = (S.seen || {})[S.user] || '', list = notesFor(S.user).slice(0, 40);
  S.seen = { ...(S.seen || {}), [S.user]: nowStamp() }; storeSave(); render();
  openSheet(() => ({ title: 'Notifications', bottom: true, tall: true,
    body: list.length ? `<div class="sg-list">${list.map(n => pkRow(`closeAll();go('#/requests/${n.id}')`, pkIc(n.icon), `${n.at > seen ? '<span class="bell__dot" aria-label="New"></span>' : ''}${n.t}`, `${esc(n.sub)} · ${fmtTime(n.at)} • ${fmtDay(n.at.slice(0, 10))}`, I('chevron_right', 20))).join('')}</div>` : empty1('Nothing new') }));
}

/* ---------- the kitchen's To Update tab ---------- */
/* To Update: approved changes still to make; Delayed: the kitchen put them off till a day (Overdue past it); Done: updated in the kitchen */
function kitchenParts(cur = null) {
  const u = me(), q = S.rQ.trim().toLowerCase(), k = S.kTab || 'todo';
  const mine = r => isDiet(r) && visibleTo(r, u) && (!q || [r.id, r.title, r.text, species(r.sp)?.name].some(x => (x || '').toLowerCase().includes(q)));
  const todo = D.requests.filter(r => mine(r) && ['approved', 'subcheck'].includes(r.state)), late = D.requests.filter(r => mine(r) && r.state === 'waitstock'), done = D.requests.filter(r => mine(r) && r.state === 'completed');
  const list = (k === 'todo' ? todo : k === 'late' ? late : done).sort((a, b) => (PRIO_RANK[a.prio] - PRIO_RANK[b.prio]) || (lastAt(a) < lastAt(b) ? 1 : -1));
  const search = `<div class="az-searchrow"><label class="az-search">${I('search', 20)}<input id="hd-q" placeholder="Search request, diet or ID" value="${esc(S.rQ)}" oninput="S.rQ=this.value;render()" aria-label="Search requests"></label></div>`;
  const seg = `<div class="ltoggle"><div class="az-segment az-segment--sm" role="tablist" aria-label="Kitchen">${thumb()}${[['todo', `To Update - ${todo.length}`], ['late', `Delayed - ${late.length}`], ['done', `Done - ${done.length}`]].map(([v, l]) => `<button role="tab" aria-selected="${k === v}" onclick="S.kTab='${v}';render();swapFx('.pane .list')">${l}</button>`).join('')}</div></div>`;
  const body = `<div class="body">${seg}<p class="az-countline lcount">${countText(list.length, 'request')}</p>${list.length ? `<div class="list list--16 hdlist">${list.map(r => hdCard(r, cur === r.id)).join('')}</div>` : empty1(k === 'todo' ? 'Nothing to update in the kitchen' : k === 'late' ? 'Nothing delayed' : 'Nothing updated yet')}</div>`;
  return { search, body };
}
