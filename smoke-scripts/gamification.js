async function () {
  var body = document.body.innerText || '';
  var re = new RegExp('XP|streak|badge|Level [0-9]+|points|leaderboard', 'i');
  var m = body.match(new RegExp('.{0,50}' + re.source + '.{0,50}', 'i'));
  return { hasXP: re.test(body), sample: m ? m[0].replace(/\s+/g, ' ') : '' };
}
