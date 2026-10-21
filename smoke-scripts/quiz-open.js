async function () {
  var all = Array.from(document.querySelectorAll('button'));
  var label = all.find(function (b) {
    return /quiz/i.test((b.innerText || '') + ' ' + (b.getAttribute('aria-label') || ''));
  });
  if (!label) return { ok: false, reason: 'no quiz trigger' };
  label.click();
  await new Promise(function (r) { setTimeout(r, 2000); });
  var dlg = document.querySelector('[role="dialog"]');
  var scope = dlg || document;
  var gen = Array.from(scope.querySelectorAll('button')).find(function (b) {
    return /generate|create|start|begin/i.test(b.innerText || '');
  });
  if (!gen) {
    return { ok: false, reason: 'no generate button; text=' + String(scope.innerText || '').replace(/\s+/g, ' ').slice(0, 300) };
  }
  gen.click();
  return { ok: true, clicked: gen.innerText.trim() };
}
