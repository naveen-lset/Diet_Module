// js/history.js — a diet's own history, as Kitchen & Diet's diet plan history (Created · Shared · Edited · Lifecycle):
// one row per change in the diet's History sheet, and one change with what, who, why and the lines marked the Kitchen way.

/* one change, one row; in the diet's History sheet it opens over the list */
function changeRow(h, { noDiet = false, current = false, sheet = false } = {}) {
  const sp = species(h.sp), d = diet(h.diet);
  const where = esc([sp.name, h.level === 'species' ? 'Species-wide' : `${LEVEL[h.level]} · ${targetName(h)}`, noDiet || !d ? '' : d.name].filter(Boolean).join(' · '));
  const who = `${youName(h.by)}${h.req ? ` · From ${h.req}` : ''}`;
  const inner = `<span class="chrow__top">${pill(HTONE[h.type], HTYPE[h.type])}<span class="meta">${noDiet ? `${fmtDay(h.at.slice(0, 10))}, ` : ''}${fmtTime(h.at)}</span></span><b>${esc(changeSummary(h))}</b><span class="sub">${where}</span><span class="meta">${who}</span>`;
  return sheet ? `<button class="chrow pick" onclick="changeSheet('${h.id}')">${inner}</button>` : `<a class="chrow pick" href="#/history/c/${h.id}"${current ? ' aria-current="true"' : ''}>${inner}</a>`;
}

/* one change: what, who, why, and the lines as the Kitchen marks them */
function changeView(h) {
  const sp = species(h.sp), d = diet(h.diet), a = asgOfChange(h);
  const head = `<div class="rhead"><span class="chrow__top">${pill(HTONE[h.type], HTYPE[h.type])}<span class="meta">${wday(h.at.slice(0, 10))} ${fmtAt(h.at)}</span></span><span class="rhead__t">${esc(changeSummary(h))}</span>
    <span class="rhead__cat">${I('pets', 20)}<span>${esc(sp.name)} · ${esc(h.level === 'species' ? 'Species-wide' : `${LEVEL[h.level]} · ${targetName(h)}`)}${h.level !== 'species' && targetPath(h) ? `<span class="sub" style="display:block;margin-top:2px">${esc(targetPath(h))}</span>` : ''}</span></span></div>`;
  const r = (icon, k, v) => `<div class="rsec__r">${I(icon)}<span class="t"><span>${k}</span>${v}</span></div>`;
  const req = h.req ? by('requests', h.req) : null;
  const rows = [
    d ? r('restaurant', 'Diet', `<b>${esc(d.name)}</b>${a && !ended(a) ? `<a class="lnk" href="#/diets/${a.sp}/${a.id}">Open diet${I('chevron_right', 18)}</a>` : ''}`) : '',
    r('person', h.req ? 'Asked by' : 'Changed by', `<b>${youName(h.by)} · ${esc(user(h.by).title)}</b>`),
    req ? r('assignment', 'From Help Desk request', `${visibleTo(req, me()) ? `<a class="lnk" href="#/requests/${req.id}">${req.id} · ${esc(req.title)}</a>` : `<b>${req.id}</b>`}<p>Approved by ${youName(h.approvedBy)}</p>`) : '',
    h.reason ? r('label', 'Reason', `<b>${esc(h.reason)}</b>`) : '',
    h.remarks ? r('notes', 'Remarks', `<p>${esc(h.remarks)}</p>`) : '',
  ].join('');
  let what = '';
  if (h.lines && h.lines.length) {
    const groups = [...new Set(h.lines.map(l => l.feed))].sort((x, y) => x - y).map(f => ({ feed: f, rows: h.lines.filter(l => l.feed === f).map(l => lineRow(l.was, histChange(l))) }));
    what = `<p class="secttl">What changed</p>${h.from ? `<p class="sub">From ${esc(diet(h.from).name)}</p>` : ''}${linesView(groups)}`;
  } else if (h.follows) what = `<p class="secttl">What changes for these animals</p>${diet(h.from) ? `<p class="sub">Was ${esc(diet(h.from).name)}</p>` : ''}${linesView(dietDiffGroups(diet(h.from), diet(h.follows)))}`;
  else if (h.created && d) what = `<p class="secttl">The diet as set</p>${linesView(dietGroups(d))}`;
  else if (h.shared) what = `<p class="secttl">Now also fed to</p><div class="list list--8">${h.shared.map(s => speciesRow(species(s), { href: `#/diets/${s}`, sub: species(s).cls, end: I('chevron_right', 20) })).join('')}</div>`;
  else if (h.fields) what = `<p class="secttl">What changed</p><div class="rsec">${h.fields.map(([k, x, y]) => r('event', k, `<b>${esc(y)}</b><span>was ${esc(x)}</span>`)).join('')}</div>`;
  else if (h.skip) {
    const w = h.diet ? diet(h.diet) : null, all = h.skip.feeds === 'all';
    what = `<p class="secttl">Feeds on ${wday(h.skip.date)} ${fmtDay(h.skip.date)}</p><div class="rsec">${(w ? w.meals : []).map(m => r('schedule', bandText(feed(m.feed)), `<b>${all || h.skip.feeds.includes(m.feed) ? 'Not given' : 'Given'}</b><p>${esc(m.items.map(i => item(i.item).name).join(', '))}</p>`)).join('')}</div>`;
  }
  return { head, body: `<div class="rsec">${rows}</div>${what}` };
}
function paneChange(id, { cls = '' } = {}) {
  const h = by('history', id), back = `<button class="az-iconbtn" onclick="goBack('#/diets')" aria-label="Back">${I('arrow_back')}</button>`;
  if (!h) return pane(cls, topbar({ lead: back, title: 'Change' }), empty1('Change not found'));
  const v = changeView(h);
  return pane(cls, topbar({ lead: back, title: 'Change' }) + v.head, `<div class="body">${v.body}</div>`, '', `ch-${id}`);
}
/* a change over the diet's History sheet */
function changeSheet(id) { const v = changeView(by('history', id)); openSheet(() => ({ title: 'Change', body: v.head.replace('class="rhead"', 'class="rhead" style="border-radius:8px"') + v.body }), true); }
