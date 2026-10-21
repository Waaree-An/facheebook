async function () {
  var all = Array.from(document.querySelectorAll('button'));
  var label = all.find(function (b) {
    return /flashcard|recall|deck/i.test((b.innerText || '') + ' ' + (b.getAttribute('aria-label') || ''));
  });
  if (!label) {
    return {
      ok: false,
      reason: 'no flashcards trigger; visible text=' + String(document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 300),
      buttons: all.map(function (b) { return (b.innerText || '').trim(); }).filter(Boolean),
    };
  }
  label.click();
  await new Promise(function (r) { setTimeout(r, 2000); });
  var dlg = document.querySelector('[role="dialog"]');
  if (!dlg) return { ok: false, reason: 'no dialog after click' };
  return { ok: true, text: dlg.innerText, title: label.innerText.trim() };
}
