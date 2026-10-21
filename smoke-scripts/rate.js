async function () {
  var dlg = document.querySelector('[role="dialog"]');
  if (!dlg) return { ok: false, reason: 'no dialog' };
  var buttons = Array.from(dlg.querySelectorAll('button'));
  var good = buttons.find(function (b) { return /^good$/i.test(b.innerText.trim()); });
  if (!good) {
    return { ok: false, reason: 'no Good button', buttons: buttons.map(function (b) { return b.innerText.trim(); }) };
  }
  good.click();
  await new Promise(function (r) { setTimeout(r, 1500); });
  var after = document.querySelector('[role="dialog"]');
  var text = after ? after.innerText : document.body.innerText;
  var xpMatch = text.match(/([0-9]+)\s*XP/);
  return {
    ok: true,
    xp: xpMatch ? xpMatch[1] : null,
    completed: /Session Complete/i.test(text),
    progress: (text.match(/([0-9]+)\/([0-9]+)/) || [])[0] || null,
  };
}
