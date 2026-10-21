async function () {
  var dlg = document.querySelector('[role="dialog"]');
  if (!dlg) return { changed: false, buttons: [], reason: 'no dialog' };
  var before = dlg.innerText;
  window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
  await new Promise(function (r) { setTimeout(r, 1000); });
  var after = dlg.innerText;
  var buttons = Array.from(dlg.querySelectorAll('button')).map(function (b) { return b.innerText.trim(); });
  return { changed: before !== after, buttons: buttons, before: before.slice(0, 160), after: after.slice(0, 160) };
}
