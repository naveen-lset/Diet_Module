// js/kitchen.js — the kitchen's side of an approved diet request (owner, 27 Nov 2026): "once it is approved the diet plan changes for that
// place; the kitchen is notified, sees it somewhere and changes the items. If an item is not there, give me an idea." The kitchen hears it
// from the bell and works from To Update (Requests); on the request it taps Items Updated, or Item Not In Stock: use a substitute (the
// Dietitian OKs it in one tap and it goes into the diet) or wait for the stock till a day (the old diet runs till then).

/* ---------- Item Not In Stock ---------- */
let NS = null;
const NS_DAYS = [[1, 'Tomorrow'], [2, 'In 2 Days'], [3, 'In 3 Days'], [7, 'In A Week']];
function noStockSheet(id) {
  const r = by('requests', id), its = kitItems(r), chk = stockCheck(r);
  NS = { id, item: (chk.find(x => x.status !== 'ok') || chk[0] || {}).item?.id ?? its[0]?.id, mode: 'sub', to: null, days: 2, note: '', q: '' };
  openSheet(noStockHtml);
}
function noStockHtml() {
  const r = by('requests', NS.id), chk = stockCheck(r), it = NS.item != null ? item(NS.item) : null;
  const st = x => x.status === 'ok' ? `In store · ${esc(x.need)} a day` : x.status === 'out' ? 'Out of stock' : `Short · ${esc(x.need)} a day`;
  const which = `<div class="az-field"><span class="az-label">Which Item <span class="az-req">*</span></span><div class="sg-list">${chk.map(x => pkRow(`NS.item=${x.item.id};NS.to=null;redrawSheet()`, pkIc(x.status === 'ok' ? 'inventory_2' : 'warning'), esc(x.item.name), st(x), undefined, NS.item === x.item.id)).join('')}</div></div>`;
  const how = `<div class="az-field"><span class="az-label">What To Do <span class="az-req">*</span></span><div class="az-segment ns-seg" role="tablist" aria-label="What to do">${thumb()}${[['sub', 'Use A Substitute'], ['wait', 'Wait For Stock']].map(([k, l]) => `<button role="tab" aria-selected="${NS.mode === k}" onclick="NS.mode='${k}';redrawSheet()">${l}</button>`).join('')}</div></div>`;
  let more = '';
  if (NS.mode === 'sub') {
    const q = NS.q.trim().toLowerCase(), opts = D.items.filter(x => !x.mix && it && x.id !== it.id && x.unit === it.unit && (!q || x.name.toLowerCase().includes(q))).sort((a, b) => (b.stock > 0) - (a.stock > 0) || a.name.localeCompare(b.name));
    more = `<div class="az-field"><span class="az-label">Substitute <span class="az-req">*</span></span>${pkSearch('ns-q', NS.q, 'Search items', 'NS.q=this.value;redrawSheet()')}<div class="sg-list ns-list">${opts.slice(0, 30).map(x => pkRow(`NS.to=${x.id};redrawSheet()`, pkIc('restaurant'), esc(x.name), x.stock > 0 ? `In store · ${x.stock} ${esc(x.stockUnit)}` : 'Out of stock', undefined, NS.to === x.id)).join('') || '<p class="sg-none">No item by that name</p>'}</div></div>
      <p class="ns-say">${I('info', 18)}<span>${esc(user(r.approver).name)} (Dietitian) OKs the substitute, then it goes into the diet.</span></p>`;
  } else {
    more = `<div class="az-field"><span class="az-label">Stock Expected <span class="az-req">*</span></span><div class="az-chips ns-days">${NS_DAYS.map(([n, l]) => `<button class="az-chip" aria-selected="${NS.days === n}" onclick="NS.days=${n};redrawSheet()">${l}</button>`).join('')}</div><small class="ns-sub">${wday(addDays(TODAY, NS.days))} ${fmtDayY(addDays(TODAY, NS.days))} · the old diet runs till then; ${esc(user(r.by).name)} and ${esc(user(r.approver).name)} see it</small></div>`;
  }
  const note = `<label class="az-field"><span class="az-label">Note (optional)</span><span class="az-input az-input--text az-textarea"><textarea id="ns-note" rows="2" placeholder="For example, the supplier comes on Monday" oninput="NS.note=this.value">${esc(NS.note)}</textarea></span></label>`;
  const ok = NS.item != null && (NS.mode === 'wait' || NS.to != null);
  return { title: 'Item Not In Stock', sub: `${esc(r.id)} · ${esc(diet(r.base)?.name || r.title)}`, bottom: true, form: true, tall: true,
    body: which + how + more + note,
    foot: `<button class="az-btn az-btn--outline" onclick="closeSheet()">Back</button><button class="az-btn"${ok ? '' : ' disabled'} onclick="doAct(NS.id,'nostock',{item:NS.item,mode:NS.mode,to:NS.to,until:addDays(TODAY,NS.days),note:NS.note})">${NS.mode === 'sub' ? `Send To ${esc(user(r.approver).name)}` : 'Wait For Stock'}</button>` };
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
      if (e.kind === 'completed') add(r, e.at, 'task_alt', `Items updated: ${nm}`, `By ${by_}`);
    }
    if (ownsReq(r, uid) && e.by !== uid && ['approved', 'rejected', 'completed', 'nostock'].includes(e.kind))
      add(r, e.at, EVT[e.kind][1], `${e.kind === 'completed' ? 'Items updated' : e.kind === 'nostock' ? 'Item not in stock' : EVT[e.kind][0]}: ${nm}`, `By ${by_}`);
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
/* To Update: approved changes still to make (with a substitute waiting on the Dietitian, or waiting for stock); Done: updated in the kitchen */
function kitchenParts(cur = null) {
  const u = me(), q = S.rQ.trim().toLowerCase(), k = S.kTab || 'todo';
  const mine = r => isDiet(r) && visibleTo(r, u) && (!q || [r.id, r.title, r.text, species(r.sp)?.name].some(x => (x || '').toLowerCase().includes(q)));
  const todo = D.requests.filter(r => mine(r) && ['approved', 'subcheck', 'waitstock'].includes(r.state)), done = D.requests.filter(r => mine(r) && r.state === 'completed');
  const list = (k === 'todo' ? todo : done).sort((a, b) => (PRIO_RANK[a.prio] - PRIO_RANK[b.prio]) || (lastAt(a) < lastAt(b) ? 1 : -1));
  const search = `<div class="az-searchrow"><label class="az-search">${I('search', 20)}<input id="hd-q" placeholder="Search request, diet or ID" value="${esc(S.rQ)}" oninput="S.rQ=this.value;render()" aria-label="Search requests"></label></div>`;
  const seg = `<div class="ltoggle"><div class="az-segment az-segment--sm" role="tablist" aria-label="Kitchen">${thumb()}${[['todo', `To Update - ${todo.length}`], ['done', `Done - ${done.length}`]].map(([v, l]) => `<button role="tab" aria-selected="${k === v}" onclick="S.kTab='${v}';render();swapFx('.pane .list')">${l}</button>`).join('')}</div></div>`;
  const body = `<div class="body">${seg}<p class="az-countline lcount">${plural(list.length, 'request')}</p>${list.length ? `<div class="list list--16 hdlist">${list.map(r => hdCard(r, cur === r.id)).join('')}</div>` : empty1(k === 'todo' ? 'Nothing to update in the kitchen' : 'Nothing updated yet')}</div>`;
  return { search, body };
}
