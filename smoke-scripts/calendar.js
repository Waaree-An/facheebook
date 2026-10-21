async function () {
  var all = Array.from(document.querySelectorAll('button'));
  var b = all.find(function (x) {
    return /calendar|planner|schedule/i.test((x.innerText || '') + ' ' + (x.getAttribute('aria-label') || ''));
  });
  if (!b) return { ok: false, reason: 'no calendar trigger' };
  b.click();
  await new Promise(function (r) { setTimeout(r, 1800); });
  var dlg = document.querySelector('[role="dialog"]');
  var txt = (dlg || document.body).innerText || '';
  var months = 'january february march april may june july august september october november december'.split(' ');
  var lower = txt.toLowerCase();
  var hit = months.filter(function (m) { return lower.indexOf(m) >= 0; });
  return {
    ok: true,
    hasCalendar: hit.length > 0 || /mon|tue|wed|thu|fri|sat|sun/i.test(txt),
    months: hit,
    sample: txt.replace(/\s+/g, ' ').slice(0, 260),
  };
}
