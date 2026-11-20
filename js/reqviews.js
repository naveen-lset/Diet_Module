// js/reqviews.js — the request page's diet parts (owner, 20 Nov 2026: the Figma alignment; the page itself is helpdesk.js paneRequest).
// Low stock, what a diet request changes, what approving does, the diet now, and attachment tiles. The three test versions (A, B, C) are gone:
// the request page follows the Figma Request Module (25 Sep 2025).

/* ---------- the diet parts ---------- */
const reqLowStock = r => r.approver === S.user && isOpen(r) ? shortOf(r).map(x => `<div class="az-warnline">${I('warning', 18)}<span class="grow"><b>${esc(x.item.name)} is low.</b> ${x.have <= 0 ? 'None' : 'Only ' + stockText(x.item)} in stock; the kitchen needs ${x.need} a day.</span><button class="lnk" onclick="delaySheet('${r.id}')">Delay</button></div>`).join('') : '';
/* what a diet request changes, as the Kitchen table: [title, html] (a food change shows as Food | Was | Now in its row instead) */
function reqLines(r) {
  const many = r.kind === 'items' && r.base === 'many', fresh = r.kind === 'new' ? { meals: applyChanges(r.base && diet(r.base) ? diet(r.base).meals : [], r.changes || []) } : null;
  const html = many ? `<div class="rsec">${(r.rules || []).map(u => `<div class="rsec__r">${I(RULE_IC[u.op])}<span class="t"><b>${esc(ruleText(u))}</b></span></div>`).join('')}</div>`
    : r.kind === 'items' ? linesView(changeGroups(diet(r.base), r.changes)) : r.kind === 'new' ? linesView(dietDiffGroups(r.base && diet(r.base), fresh)) : r.kind === 'diet' ? linesView(dietDiffGroups(r.base && diet(r.base), diet(r.diet))) : r.kind === 'skip' ? skipView(r) : '';
  return [r.kind === 'items' ? 'What Changes' : r.kind === 'new' ? `The New Diet${r.base && diet(r.base) ? ' · What Differs' : ''}` : r.kind === 'diet' ? `New Diet · ${esc(diet(r.diet).name)}` : 'Feeds', html];
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
  return bare ? links : `<div class="rsec"><div class="rsec__r">${I('restaurant')}<span class="t"><span>${now.length > 1 ? 'Diets Now' : 'Diet Now'}</span>${links}</span></div></div>`;
}
/* attachments as tiles with a tinted preview (Hub Help Desk) */
const fileTiles = fs => `<div class="ftiles">${fs.map(f => `<button class="ftile ftile--${f.kind}" onclick="toast('Opens ${esc(f.name)}')"><span class="ftile__p">${I(f.kind === 'image' ? 'image' : f.kind === 'audio' ? 'graphic_eq' : f.kind === 'pdf' ? 'picture_as_pdf' : 'description', 32)}</span><b>${esc(f.name)}</b><small>${esc(f.size || '')}</small></button>`).join('')}</div>`;
