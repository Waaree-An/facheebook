async function () {
  var dlg = document.querySelector('[role="dialog"]');
  if (!dlg) return { ok: true, msg: 'already closed' };
  var close = dlg.querySelector('[aria-label="Close flashcards"]');
  if (!close) {
    var btns = Array.from(dlg.querySelectorAll('button'));
    close = btns.find(function (b) { return /close|done/i.test(b.innerText + ' ' + (b.getAttribute('aria-label') || '')); });
  }
  if (!close) return { ok: false, msg: 'no close button' };
  close.click();
  await new Promise(function (r) { setTimeout(r, 800); });
  return { ok: true, msg: 'closed; dialog remaining=' + document.querySelectorAll('[role="dialog"]').length };
}
