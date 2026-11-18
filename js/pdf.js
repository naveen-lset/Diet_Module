// js/pdf.js — the diet as its PDF (owner, 18 Nov: "Inside Diet Details I want to see the actual diet PDF").
// The page is laid out as Kitchen & Diet's Download PDF (antz_kitchen_backend src/diet-pdf/diet-pdf-renderer.ts):
// the species photo and name, "Diet – <name>", the Time | Day | Item | Daily amt table, the notes, and the footer strip
// (diet ID · kind · status · scope · created · certified by · generated). It opens full screen from the PDF icon in Diet Details,
// as the Antz app opens a diet PDF in its viewer: close, the file name, Share and Download.

const PDF_W = 794;                                     /* an A4 page at 96 dpi */
const pdfName = d => `${d.name}.pdf`;
const ddmmyy = s => { const [y, m, d] = s.slice(0, 10).split('-'); return `${d}-${m}-${y.slice(2)}`; };

/* one A4 page of the diet */
function dietPdfPage(a) {
  const d = diet(a.diet), sp = species(a.sp), groups = dietGroups(d), [, state] = dietStatus(a);
  const rows = groups.map(g => g.rows.map((r, i) => {
    let run = 1; while (i + run < g.rows.length && g.rows[i + run].day === r.day) run++;
    const x = item(r.line.item), parts = x && x.mix ? `<span class="pdfp__mix">${x.mix.map(p => `${esc(item(p.item).name)} ${p.pct}%`).join(' · ')}</span>` : '';
    return `<tr>${i === 0 ? `<td class="pdfp__time" rowspan="${g.rows.length}">${bandText(feed(g.feed))}</td>` : ''}${i === 0 || g.rows[i - 1].day !== r.day ? `<td class="pdfp__day" rowspan="${run}">${r.day}</td>` : ''}
      <td class="pdfp__item"><b>${r.name.replace(MIXTAG, '')}</b>${r.gar ? ` <i>(${r.gar})</i>` : ''}${parts}</td><td class="pdfp__amt">${r.amt}</td></tr>`;
  }).join('')).join('');
  const notes = [['Kitchen note', d.note], ['Site note', d.site], ['Remark', d.remark], ['Change reason', [d.reason, d.remarks].filter(Boolean).join('. ')]].filter(n => n[1]);
  const foot = [d.id, slotKind(a), state, useText(a), `Created ${ddmmyy(d.made.at)}`, d.cert ? `Certified by ${user(d.cert.by).name}` : 'Not certified', `Antz Kitchen · generated ${ddmmyy(TODAY)}`].join(' · ');
  return `<div class="pdfp">
    <div class="pdfp__head"><img src="${spPhoto(sp.id)}" alt=""><span><b>${esc(sp.name)}</b><i>${esc(sp.sci)}</i></span></div>
    <h1 class="pdfp__title">Diet – ${esc(d.name)}</h1>
    <table class="pdfp__tbl"><thead><tr><th>Time</th><th>Day</th><th>Item</th><th>Daily amt</th></tr></thead><tbody>${rows}</tbody></table>
    ${notes.length ? `<div class="pdfp__notes">${notes.map(([k, v]) => `<p><b>${k}:</b> ${esc(v)}</p>`).join('')}</div>` : ''}
    <div class="pdfp__foot"><span>${esc(foot)}</span><span>Page 1 of 1</span></div></div>`;
}

/* the viewer: full screen over the app, above any sheet; Escape or × closes it */
function dietPdf(id) {
  const a = by('assigns', id), d = diet(a.diet); PDF_FULL = false;
  let el = document.getElementById('pdfv');
  if (!el) { el = document.createElement('div'); el.id = 'pdfv'; $('.device').appendChild(el); }
  el.innerHTML = `<div class="pdfv" role="dialog" aria-modal="true" aria-label="${esc(pdfName(d))}">
    <div class="pdfv__bar"><button class="az-iconbtn" onclick="closePdf()" aria-label="Close">${I('close')}</button><span class="pdfv__t"><b>${esc(pdfName(d))}</b><small>1 page</small></span>${iconBtn('ios_share', 'Share', `toast('Share ${esc(pdfName(d))}')`)}${iconBtn('download', 'Download', `toast('Saved ${esc(pdfName(d))} to Files')`)}</div>
    <div class="pdfv__canvas"><div class="pdfv__page" onclick="PDF_FULL=!PDF_FULL;fitPdf()" title="Tap to zoom">${dietPdfPage(a)}</div></div></div>`;
  fitPdf();
  addEventListener('keydown', pdfKey); addEventListener('resize', fitPdf);
  el.querySelector('.pdfv__bar .az-iconbtn').focus({ preventScroll: true });
}
/* the page opens fitted to the screen's width, as a PDF viewer opens it; a tap shows it at full size (scroll to read), another tap fits it again */
let PDF_FULL = false;
function fitPdf() {
  const c = document.querySelector('#pdfv .pdfv__canvas'), p = document.querySelector('#pdfv .pdfv__page');
  if (c && p) { p.style.zoom = PDF_FULL ? 1 : Math.min(1, (c.clientWidth - 24) / PDF_W); p.classList.toggle('full', PDF_FULL); }
}
function closePdf() {
  const el = document.getElementById('pdfv'); if (el) el.innerHTML = '';
  removeEventListener('keydown', pdfKey); removeEventListener('resize', fitPdf);
}
function pdfKey(e) { if (e.key === 'Escape') closePdf(); }
