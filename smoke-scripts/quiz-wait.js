async function () {
  var start = Date.now();
  var re = new RegExp('play again|generate another|try again|new quiz|question [0-9]|question:|submit|check answer', 'i');
  while (Date.now() - start < 100000) {
    await new Promise(function (r) { setTimeout(r, 2500); });
    var body = document.body.innerText;
    if (re.test(body)) {
      return { ok: true, elapsed: Date.now() - start, sample: body.slice(0, 500) };
    }
  }
  return { ok: false, elapsed: Date.now() - start, sample: document.body.innerText.slice(0, 500) };
}
