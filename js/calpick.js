// js/calpick.js — dates in the request form (owner, 26 Nov 2026: "give a field; when I click, a popup opens a calendar, I select dates, then Done,
// and those dates show as chips"). A date field opens Select Dates: One day · Several days · A week (when the field takes more than one day),
// then the month, today ringed, the picked days filled (a week as one band). Clear and Done at the foot. The picked days come back as chips
// under the field; a chip's × takes that day off.

let CALP = null;
const calIso = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const calD = iso => new Date(iso + 'T00:00:00');
const calMon = iso => addDays(iso, -((calD(iso).getDay() + 6) % 7));
/* o: { title, sel: [iso], mode: 'one'|'some'|'week', modes: bool, lo, hi (iso), cb: (dates, mode) js function name } */
function calOpen(o) {
  CALP = { title: 'Select Date', mode: 'one', modes: false, sel: [], lo: TODAY, hi: addDays(TODAY, 365), ...o };
  const first = CALP.sel[0] || (CALP.lo > TODAY ? CALP.lo : CALP.hi < TODAY ? CALP.hi : TODAY); CALP.month = first.slice(0, 7);
  openSheet(calHtml);
}
function calMode(m) { if (CALP.mode === m) return; CALP.mode = m; const f = CALP.sel[0]; CALP.sel = []; if (f) calTap(f, true); else redrawSheet(); }
function calTap(iso, keep) {
  if (CALP.mode === 'one') CALP.sel = [iso];
  else if (CALP.mode === 'some') CALP.sel = CALP.sel.includes(iso) ? CALP.sel.filter(x => x !== iso) : [...CALP.sel, iso].sort();
  else { const m = calMon(iso); CALP.sel = Array.from({ length: 7 }, (_, i) => addDays(m, i)).filter(x => x >= CALP.lo && x <= CALP.hi); }
  redrawSheet();
}
function calMonth(n) { const d = calD(CALP.month + '-01'); d.setMonth(d.getMonth() + n); CALP.month = calIso(d).slice(0, 7); redrawSheet(); }
function calDone() { if (!CALP.sel.length) { toast('Choose a day'); return; } const { cb, sel, mode } = CALP; closeAll(); window[cb](sel, mode); }
const CAL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function calHtml() {
  if (!CALP) return { title: '', body: '' };
  const y = +CALP.month.slice(0, 4), m = +CALP.month.slice(5, 7) - 1, first = new Date(y, m, 1), lead = (first.getDay() + 6) % 7, n = new Date(y, m + 1, 0).getDate();
  const wk = CALP.mode === 'week', loM = CALP.lo.slice(0, 7), hiM = CALP.hi.slice(0, 7);
  let cells = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(x => `<i>${x}</i>`).join('') + '<span></span>'.repeat(lead);
  for (let i = 1; i <= n; i++) {
    const iso = calIso(new Date(y, m, i)), on = CALP.sel.includes(iso), off = iso < CALP.lo || iso > CALP.hi;
    const band = wk && on, s = band && !CALP.sel.includes(addDays(iso, -1)), e = band && !CALP.sel.includes(addDays(iso, 1));
    cells += `<button class="calp__d${iso === TODAY ? ' today' : ''}${on && !wk ? ' on' : ''}${band ? ' in' : ''}${s ? ' s' : ''}${e ? ' e' : ''}"${off ? ' disabled' : ''} aria-pressed="${on}" aria-label="${wday(iso)} ${fmtDayY(iso)}" onclick="calTap('${iso}')"><span>${i}</span></button>`;
  }
  const seg = CALP.modes ? `<div class="az-segment rv-seg calp__seg" role="tablist" aria-label="How many days">${thumb()}${DMODES.map(([v, l]) => `<button role="tab" aria-selected="${CALP.mode === v}" onclick="calMode('${v}')">${l}</button>`).join('')}</div>` : '';
  const sum = !CALP.sel.length ? 'Tap a day' : CALP.sel.length === 1 ? `${wday(CALP.sel[0])} ${fmtDayY(CALP.sel[0])}` : `${plural(CALP.sel.length, 'day')} · ${cap(datesText(CALP.sel))}`;
  return { title: CALP.title, bottom: true, form: true, step: `cal:${CALP.month}:${CALP.mode}`,
    body: `${seg}<div class="calp__h"><button class="az-iconbtn" onclick="calMonth(-1)" aria-label="Previous month"${CALP.month <= loM ? ' disabled' : ''}>${I('chevron_left')}</button><b>${CAL_MONTHS[m]} ${y}</b><button class="az-iconbtn" onclick="calMonth(1)" aria-label="Next month"${CALP.month >= hiM ? ' disabled' : ''}>${I('chevron_right')}</button></div>
      <div class="calp" data-fx>${cells}</div><p class="calp__sum">${I('event', 18)}<span>${esc(sum)}</span></p>`,
    foot: `<button class="az-btn az-btn--outline" onclick="CALP.sel=[];redrawSheet()">Clear</button><button class="az-btn" onclick="calDone()">Done</button>` };
}
/* the field: what is picked, a calendar icon; under it the days as chips (each with ×) */
function calField({ dates, ph = 'Choose a date', open, remove = null, id = '' }) {
  const ds = [...dates].sort(), txt = !ds.length ? ph : ds.length === 1 ? `${wday(ds[0])} ${fmtDayY(ds[0])}` : `${plural(ds.length, 'day')} · ${fmtDay(ds[0])} – ${fmtDay(ds[ds.length - 1])}`;
  const rel = ds.length === 1 ? relDay(ds[0]) : '', relT = rel === 'Today' || rel === 'Tomorrow' || rel === 'Yesterday' ? rel : '';
  const chips = remove && ds.length > 1 ? `<div class="calf__chips">${ds.map(x => `<button class="fchip" onclick="${remove}('${x}')" aria-label="Remove ${wday(x)} ${fmtDay(x)}">${wday(x)} ${fmtDay(x)}${I('close', 16)}</button>`).join('')}</div>` : '';
  return `<button class="az-input az-input--select calf${ds.length ? '' : ' az-input--placeholder'}"${id ? ` id="${id}"` : ''} onclick="${open}">${I('calendar_month', 22)}<span class="grow">${esc(txt)}${relT ? `<small>${relT}</small>` : ''}</span>${I('keyboard_arrow_down')}</button>${chips}`;
}
